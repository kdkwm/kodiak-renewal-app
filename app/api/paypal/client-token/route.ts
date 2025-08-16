import { type NextRequest, NextResponse } from "next/server"

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const PAYPAL_BASE_URL =
  process.env.PAYPAL_MODE === "production" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com"

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
    const accessToken = await getPayPalAccessToken()

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/identity/generate-token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Accept-Language": "en_US",
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`PayPal API error: ${data.error_description || data.message}`)
    }

    return NextResponse.json({ clientToken: data.client_token })
  } catch (error) {
    console.error("Error generating PayPal client token:", error)
    return NextResponse.json({ error: "Failed to generate client token" }, { status: 500 })
  }
}
