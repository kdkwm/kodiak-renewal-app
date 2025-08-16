import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET
    const paypalApiUrl =
      process.env.PAYPAL_MODE === "production" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com"

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "PayPal credentials not configured" }, { status: 500 })
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

    const response = await fetch(`${paypalApiUrl}/v1/identity/generate-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("PayPal client token error:", errorData)
      return NextResponse.json({ error: "Failed to generate client token" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Client token generation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
