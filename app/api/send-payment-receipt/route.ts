import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Extract payment data from the request
    const {
      transactionId,
      amount,
      paymentMethod,
      paymentType, // 'singular' or 'installment'
      customerName,
      customerEmail,
      serviceAddress,
      currentPayment = 1,
      totalPayments = 1,
      futureDates = [],
      contractId,
      season = "2024-2025",
    } = body

    // Validate required fields
    if (!transactionId || !amount || !customerEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const wordpressUrl = process.env.WORDPRESS_SITE_URL || "https://your-wordpress-site.com"
    const sharedSecret = process.env.KODIAK_RECEIPT_SECRET || "your-shared-secret"

    const receiptData = {
      transaction_id: transactionId,
      amount: Number.parseFloat(amount),
      payment_method: paymentMethod,
      payment_type: paymentType,
      customer_name: customerName,
      customer_email: customerEmail,
      service_address: serviceAddress,
      current_payment: currentPayment,
      total_payments: totalPayments,
      future_dates: futureDates,
      contract_id: contractId,
      season: season,
    }

    const response = await fetch(`${wordpressUrl}/wp-json/kodiak/v1/create-receipt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kodiak-Secret": sharedSecret,
      },
      body: JSON.stringify(receiptData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        {
          error: "Failed to create receipt in WordPress",
          details: errorText,
        },
        { status: 500 },
      )
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      message: "Receipt created and sent successfully",
      wordpress_response: result,
    })
  } catch (error) {
    console.error("Receipt creation error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
