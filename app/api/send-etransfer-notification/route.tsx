import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerName, customerEmail, serviceAddress, totalInstallments, isPlatinum, totalAmount, contractId } = body

    console.log("[v0] === ETRANSFER OFFICE NOTIFICATION ===")
    console.log("[v0] Customer Details:", {
      customerName,
      customerEmail,
      serviceAddress,
      totalInstallments,
      isPlatinum,
      totalAmount,
    })

    const emailSubject = `New eTransfer Payment Details - ${serviceAddress}`

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New eTransfer Payment Details</h2>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">Customer Information</h3>
          <p><strong>Service Address:</strong> ${serviceAddress}</p>
        </div>

        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">Payment Details</h3>
          <p><strong>Total Amount:</strong> $${totalAmount}</p>
          <p><strong>Payment Method:</strong> eTransfer</p>
          <p><strong>Number of Payments:</strong> ${totalInstallments === 1 ? "1 (One-time payment)" : `${totalInstallments} installments`}</p>
          <p><strong>Platinum Upgrade:</strong> ${isPlatinum ? "Yes - Customer upgraded to Platinum" : "No"}</p>
        </div>

      </div>
    `

    const smtp2goResponse = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Smtp2go-Api-Key": process.env.SMTP2GO_API_KEY || "api-46E1562B110649CC8A1FEECC6D72767E",
      },
      body: JSON.stringify({
        sender: "info@kodiaksnowremoval.ca",
        to: ["info@kodiaksnowremoval.ca"],
        subject: emailSubject,
        html_body: emailBody,
        text_body: `New eTransfer Payment Request from ${customerName}\n\nCustomer: ${customerName} (${customerEmail})\nAddress: ${serviceAddress}\nAmount: $${totalAmount}\nPayments: ${totalInstallments === 1 ? "1 (One-time)" : `${totalInstallments} installments`}\nPlatinum: ${isPlatinum ? "Yes" : "No"}\n\nPlease send eTransfer request to customer.`,
      }),
    })

    const smtp2goResult = await smtp2goResponse.json()

    console.log("[v0] SMTP2GO Response Status:", smtp2goResponse.status)
    console.log("[v0] SMTP2GO Response:", smtp2goResult)

    if (!smtp2goResponse.ok) {
      throw new Error(`SMTP2GO API error: ${smtp2goResult.error || "Unknown error"}`)
    }

    return NextResponse.json({
      success: true,
      message: "Office notification sent successfully",
      emailId: smtp2goResult.data?.email_id,
    })
  } catch (error) {
    console.error("[v0] eTransfer notification error:", error)
    return NextResponse.json({ success: false, error: "Failed to send office notification" }, { status: 500 })
  }
}
