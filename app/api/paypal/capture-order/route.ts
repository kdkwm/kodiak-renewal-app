import { type NextRequest, NextResponse } from "next/server"

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!
const PAYPAL_MODE = process.env.PAYPAL_MODE || "sandbox"

const PAYPAL_API_BASE = PAYPAL_MODE === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com"

async function getPayPalAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64")

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
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
    const { orderId, contractData, renewalState } = await request.json()

    const accessToken = await getPayPalAccessToken()

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    const captureData = await response.json()

    if (captureData.status === "COMPLETED") {
      const wpEndpoint = process.env.WP_KODIAK_QUEUE_ENDPOINT
      const wpSecret = process.env.WP_KODIAK_SHARED_SECRET

      if (wpEndpoint && wpSecret) {
        try {
          await fetch(wpEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Kodiak-Secret": wpSecret,
            },
            body: JSON.stringify({
              contract_id: contractData.contractId,
              payment_method: "paypal",
              transaction_id: captureData.id,
              amount: captureData.purchase_units[0].payments.captures[0].amount.value,
              status: "completed",
              payment_type: "one_time",
            }),
          })
        } catch (wpError) {
          console.error("WordPress notification failed:", wpError)
        }
      }

      return NextResponse.json({
        success: true,
        transactionId: captureData.id,
        paymentMethod: "paypal",
        amount: captureData.purchase_units[0].payments.captures[0].amount.value,
      })
    } else {
      return NextResponse.json({ success: false, error: "Payment not completed" }, { status: 400 })
    }
  } catch (error) {
    console.error("PayPal capture error:", error)
    return NextResponse.json({ success: false, error: "Failed to capture PayPal payment" }, { status: 500 })
  }
}
