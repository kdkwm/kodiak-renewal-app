import { type NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function POST(request: NextRequest) {
  try {
    const { serviceAddress, paymentAmount, paymentType } = await request.json()

    const transporter = nodemailer.createTransporter({
      host: "mail.smtp2go.com",
      port: 2525,
      secure: false, // true for 465, false for other ports
      auth: {
        user: "info@kodiaksnowremoval.ca",
        pass: "cmJicHc3MG16YjAw",
      },
    })

    const mailOptions = {
      from: "info@kodiaksnowremoval.ca",
      to: "zobisatt89@gmail.com",
      subject: "eTransfer Payment Confirmation",
      html: `
        <h2>eTransfer Payment Confirmation</h2>
        <p>A customer has confirmed they've sent an eTransfer payment:</p>
        <ul>
          <li><strong>Service Address:</strong> ${serviceAddress}</li>
          <li><strong>Payment Amount:</strong> $${paymentAmount.toFixed(2)}</li>
          <li><strong>Payment Type:</strong> ${paymentType}</li>
        </ul>
        <p>Please check for the incoming eTransfer and process accordingly.</p>
      `,
    }

    await transporter.sendMail(mailOptions)

    return NextResponse.json({ success: true, message: "Email sent successfully" })
  } catch (error) {
    console.error("Error sending email:", error)
    return NextResponse.json({ success: false, error: "Failed to send email" }, { status: 500 })
  }
}
