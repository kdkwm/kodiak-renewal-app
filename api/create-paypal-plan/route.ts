import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { amount, contractData } = await request.json()

    const clientId = process.env.PAYPAL_CLIENT_ID
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET
    const baseURL = process.env.NODE_ENV === "production" ? "https://api.paypal.com" : "https://api.sandbox.paypal.com"

    if (!clientId || !clientSecret) {
      throw new Error("PayPal credentials not configured")
    }

    // Get access token
    const tokenResponse = await fetch(`${baseURL}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      throw new Error("Failed to get PayPal access token")
    }

    // Create subscription plan
    const planData = {
      product_id: process.env.PAYPAL_PRODUCT_ID, // You need to create a product first
      name: `Snow Removal Contract ${contractData.contractId}`,
      description: `Monthly payment plan for snow removal services`,
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: {
            interval_unit: "MONTH",
            interval_count: 1,
          },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0, // Infinite until cancelled
          pricing_scheme: {
            fixed_price: {
              value: amount.toFixed(2),
              currency_code: "CAD",
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

    const planResponse = await fetch(`${baseURL}/v1/billing/plans`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(planData),
    })

    const planResult = await planResponse.json()

    if (!planResponse.ok) {
      throw new Error(planResult.message || "Failed to create subscription plan")
    }

    return NextResponse.json({
      success: true,
      planId: planResult.id,
    })
  } catch (error) {
    console.error("PayPal plan creation error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Plan creation failed",
      },
      { status: 500 },
    )
  }
}
