import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { orderId, paymentDetails, contractData } = await request.json()

    // Verify the payment with PayPal
    const clientId = process.env.PAYPAL_CLIENT_ID
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET
    const baseURL = process.env.NODE_ENV === "production" ? "https://api.paypal.com" : "https://api.sandbox.paypal.com"

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

    // Verify order details
    const orderResponse = await fetch(`${baseURL}/v2/checkout/orders/${orderId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
    })

    const orderData = await orderResponse.json()

    if (!orderResponse.ok || orderData.status !== "COMPLETED") {
      throw new Error("Payment verification failed")
    }

    // Here you would typically:
    // 1. Save payment details to your database
    // 2. Update contract status
    // 3. Send confirmation email
    // 4. Generate invoice/receipt

    return NextResponse.json({
      success: true,
      transactionId: orderId,
      message: "Payment confirmed successfully",
    })
  } catch (error) {
    console.error("PayPal payment confirmation error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Payment confirmation failed",
      },
      { status: 500 },
    )
  }
}
