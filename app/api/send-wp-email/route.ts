import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html } = await request.json()

    const wpSiteUrl = process.env.WORDPRESS_SITE_URL
    const sharedSecret = process.env.WP_KODIAK_SHARED_SECRET

    if (!wpSiteUrl || !sharedSecret) {
      throw new Error("WordPress configuration missing")
    }

    const response = await fetch(`${wpSiteUrl}/wp-json/kodiak/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kodiak-Secret": sharedSecret,
      },
      body: JSON.stringify({
        to,
        subject,
        html,
        from_name: "Kodiak Snow Removal System",
        from_email: "noreply@kodiaksnowremoval.ca",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`WordPress email API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error("WordPress email API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send email",
      },
      { status: 500 },
    )
  }
}
