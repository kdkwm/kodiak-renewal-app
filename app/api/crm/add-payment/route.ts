import { type NextRequest, NextResponse } from "next/server"

const CRM_API_URL = "https://ksr.intellisnow.ca/secure/payment"
const CRM_AUTH_TOKEN = "9f8e7d6c5b4a3f2e1d0c9b8a7f6ec3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e"

export async function POST(request: NextRequest) {
  try {
    const { contractId, amount, cardLastFour, note } = await request.json()

    if (!contractId || !amount) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: contractId, amount" },
        { status: 400 },
      )
    }

    // Get current date in YYYY-MM-DD format
    const currentDate = new Date().toISOString().split("T")[0]

    const payload = {
      paymentMethod: "1",
      controlNumber: cardLastFour || "",
      amount: Number.parseFloat(amount),
      issuedOn: currentDate,
      postPaymentDate: currentDate,
      note: note || "",
    }

    console.log("[v0] Sending to external CRM:", {
      url: `${CRM_API_URL}/${contractId}`,
      payload,
    })

    const response = await fetch(`${CRM_API_URL}/${contractId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AUTH-TOKEN": CRM_AUTH_TOKEN,
      },
      body: JSON.stringify(payload),
    })

    const responseData = await response.text()

    if (!response.ok) {
      console.log("[v0] CRM API error:", response.status, responseData)
      return NextResponse.json(
        { success: false, error: `CRM API error: ${response.status}`, details: responseData },
        { status: response.status },
      )
    }

    console.log("[v0] CRM payment added successfully:", responseData)

    return NextResponse.json({
      success: true,
      message: "Payment added to CRM successfully",
      data: responseData,
    })
  } catch (error) {
    console.error("[v0] CRM API request failed:", error)
    return NextResponse.json(
      { success: false, error: "Failed to add payment to CRM", details: error.message },
      { status: 500 },
    )
  }
}
