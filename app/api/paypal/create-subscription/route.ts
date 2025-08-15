import { type NextRequest, NextResponse } from "next/server"

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const PAYPAL_MODE = process.env.PAYPAL_MODE || "sandbox"

const PAYPAL_BASE_URL = PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com"

async function getPayPalAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64")

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })

  const data = await response.json()
  return data.access_token
}

export async function POST(request: NextRequest) {
  try {
    const { amount, currency = "CAD", contractData, renewalState } = await request.json()

    const accessToken = await getPayPalAccessToken()
    const installments = renewalState?.selectedPayments || 1

    // Create a subscription plan first
    const planData = {
      product_id: `contract-renewal-${contractData.contractId}`,
      name: `Contract Renewal - ${contractData.address}`,
      description: `Monthly installment plan for contract renewal`,
      billing_cycles: [
        {
          frequency: {
            interval_unit: "MONTH",
            interval_count: 1,
          },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: installments,
          pricing_scheme: {
            fixed_price: {
              value: amount.toString(),
              currency_code: currency,
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3,
      },
    }

    const planResponse = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(planData),
    })

    const plan = await planResponse.json()

    // Create subscription
    const subscriptionData = {
      plan_id: plan.id,
      start_time: new Date().toISOString(),
      subscriber: {
        name: {
          given_name: contractData.customerName?.split(" ")[0] || "Customer",
          surname: contractData.customerName?.split(" ").slice(1).join(" ") || "",
        },
      },
      application_context: {
        brand_name: contractData.company === "KSB" ? "Kodiak Snow Blowing" : "Kodiak Snow Removal",
        locale: "en-CA",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/payment-complete`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/payment-cancelled`,
      },
    }

    const subscriptionResponse = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(subscriptionData),
    })

    const subscription = await subscriptionResponse.json()

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      approvalUrl: subscription.links.find((link: any) => link.rel === "approve")?.href,
    })
  } catch (error) {
    console.error("PayPal create subscription error:", error)
    return NextResponse.json({ success: false, error: "Failed to create PayPal subscription" }, { status: 500 })
  }
}
