import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { serviceAddress, paymentAmount, paymentType } = await request.json()

    const wsformResponse = await fetch("YOUR_WSFORM_WEBHOOK_URL_HERE", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        service_address: serviceAddress,
        payment_amount: paymentAmount.toFixed(2),
        payment_type: paymentType,
        subject: "eTransfer Payment Confirmation",
        message: `A customer has confirmed they've sent an eTransfer payment for ${serviceAddress}. Amount: $${paymentAmount.toFixed(2)}, Type: ${paymentType}`,
      }),
    })

    if (!wsformResponse.ok) {
      throw new Error(`WSForm API error: ${wsformResponse.status}`)
    }

    return NextResponse.json({ success: true, message: "Email sent successfully via WSForm" })
  } catch (error) {
    console.error("Error sending email via WSForm:", error)
    return NextResponse.json({ success: false, error: "Failed to send email" }, { status: 500 })
  }
}
