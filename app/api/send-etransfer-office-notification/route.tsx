import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const {
      serviceAddress,
      paymentAmount,
      paymentType,
      customerName,
      customerEmail,
      contractId,
      totalInstallments,
      platinumUpgrade,
      season,
    } = await request.json()

    const officeEmailData = {
      to: "info@kodiaksnowremoval.ca",
      subject: `New eTransfer Payment - ${serviceAddress}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
            New eTransfer Payment Notification
          </h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Customer Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 150px;">Customer Name:</td>
                <td style="padding: 8px 0;">${customerName || "Not provided"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Email:</td>
                <td style="padding: 8px 0;">${customerEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Service Address:</td>
                <td style="padding: 8px 0;">${serviceAddress}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Contract ID:</td>
                <td style="padding: 8px 0;">${contractId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Season:</td>
                <td style="padding: 8px 0;">${season}</td>
              </tr>
            </table>
          </div>

          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #065f46;">Payment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 150px;">Payment Amount:</td>
                <td style="padding: 8px 0; font-size: 18px; color: #065f46;">$${paymentAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Payment Type:</td>
                <td style="padding: 8px 0;">${paymentType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Number of Payments:</td>
                <td style="padding: 8px 0;">${totalInstallments || 1} payment${totalInstallments > 1 ? "s" : ""}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Platinum Upgrade:</td>
                <td style="padding: 8px 0;">
                  <span style="padding: 4px 8px; border-radius: 4px; font-weight: bold; ${platinumUpgrade ? "background: #fef3c7; color: #92400e;" : "background: #f3f4f6; color: #6b7280;"}">
                    ${platinumUpgrade ? "YES - Upgraded to Platinum" : "No"}
                  </span>
                </td>
              </tr>
            </table>
          </div>

          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #dc2626;">Action Required</h3>
            <p style="margin: 0; color: #374151;">
              The customer has been instructed to send an eTransfer to your office email with the contract ID 
              <strong>${contractId}</strong> in the message field. Please check your email for the incoming eTransfer.
            </p>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; color: #6b7280; font-size: 14px;">
            <p>This notification was sent automatically from the Kodiak Snow Removal payment system.</p>
            <p>Timestamp: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `,
    }

    const wpResponse = await fetch(
      `${process.env.NETLIFY_URL || process.env.VERCEL_URL || "http://localhost:3000"}/api/send-wp-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(officeEmailData),
      },
    )

    if (!wpResponse.ok) {
      throw new Error(`WordPress email API error: ${wpResponse.status}`)
    }

    console.log("[v0] eTransfer office notification sent successfully")

    return NextResponse.json({
      success: true,
      message: "Office notification sent successfully",
    })
  } catch (error) {
    console.error("Error sending eTransfer office notification:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send office notification",
      },
      { status: 500 },
    )
  }
}
