import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { token, amount, isRecurring, contractData, billingData } = await request.json()

    // Validate required fields
    const requiredFields = ["cardholder_name", "email", "phone", "address", "city", "state", "postal_code", "country"]

    for (const field of requiredFields) {
      if (!billingData[field] || !billingData[field].trim()) {
        return NextResponse.json(
          { success: false, error: `Missing or empty field: ${field.replace("_", " ")}` },
          { status: 400 },
        )
      }
    }

    // Use proper API keys according to Bambora documentation
    const merchantId = process.env.BAMBORA_MERCHANT_ID || "383613253" // Sandbox merchant ID
    const apiPasscode = process.env.BAMBORA_API_KEY || "0c3a403f7C0547008423f18063C00275" // Regular API passcode for auth
    const recurringPasscode = process.env.BAMBORA_RECURRING_API_KEY || "858966679b9942F3Ba0B0462255dA9AE" // Recurring API passcode

    // Use the appropriate passcode based on transaction type
    const passcode = isRecurring ? recurringPasscode : apiPasscode

    // Create authorization header using the regular API passcode (base64 encoded)
    const authString = `${merchantId}:${apiPasscode}`
    const authHeader = `Passcode ${Buffer.from(authString).toString("base64")}`

    console.log("Using Bambora credentials:", {
      merchantId,
      isRecurring,
      passcode: passcode.substring(0, 8) + "...", // Log partial for debugging
      endpoint: "Modern REST API",
    })

    // Prepare payment data for modern REST API
    const paymentData = {
      amount: Number.parseFloat(amount.toFixed(2)),
      payment_method: "token",
      token: {
        code: token,
        name: billingData.cardholder_name,
      },
      billing: {
        name: billingData.cardholder_name,
        email_address: billingData.email,
        phone_number: billingData.phone,
        address_line1: billingData.address,
        city: billingData.city,
        province: billingData.state,
        postal_code: billingData.postal_code,
        country: billingData.country,
      },
    }

    // Add recurring billing configuration if needed
    if (isRecurring) {
      const startDate = new Date()
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 60) // 60 days from now

      paymentData.recurring = {
        billing_period: "M", // Monthly
        billing_increment: 1,
        expiry_date: endDate.toISOString().split("T")[0], // YYYY-MM-DD format
      }
    }

    console.log("Sending payment request to Bambora REST API:", {
      amount: paymentData.amount,
      isRecurring,
      billingName: billingData.cardholder_name,
    })

    // Use modern REST API endpoint
    const response = await fetch("https://api.na.bambora.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData),
    })

    const responseText = await response.text()
    console.log("Bambora REST API response:", responseText)

    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error("Failed to parse Bambora response:", parseError)
      return NextResponse.json({ success: false, error: "Invalid response from payment processor" }, { status: 500 })
    }

    console.log("Parsed Bambora result:", result)

    if (response.ok && result.approved === 1) {
      // Payment successful
      console.log("Payment approved:", result.id)

      return NextResponse.json({
        success: true,
        transactionId: result.id,
        message: isRecurring ? "Recurring payment scheduled successfully" : "Payment processed successfully",
        details: {
          amount: result.amount,
          card: result.card,
          created: result.created,
        },
      })
    } else {
      // Payment failed
      const errorMessage = result.message || result.error_message || "Payment was declined"
      console.error("Payment failed:", errorMessage, result)

      return NextResponse.json(
        {
          success: false,
          error: `Payment failed: ${errorMessage}`,
          code: result.code || result.error_code,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("Payment processing error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Payment processing failed" },
      { status: 500 },
    )
  }
}
