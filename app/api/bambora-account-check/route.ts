import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  // Let's try to get more info about the account status
  // by testing different endpoints and methods

  const tests = [
    {
      name: "Sandbox Account Test",
      merchantId: "383613253",
      apiKey: "0c3a403f7C0547008423f18063C00275",
    },
    {
      name: "Production Account Test",
      merchantId: "245162388",
      apiKey: "B4372eC6f40B4E05bd90Ece2E3Be734b",
    },
  ]

  const results = []

  for (const test of tests) {
    try {
      // Try a minimal transaction to test credentials
      const postData = new URLSearchParams({
        requestType: "BACKEND",
        merchant_id: test.merchantId,
        passcode: test.apiKey,
        trnType: "P",
        trnAmount: "0.01", // Minimal amount
        trnCardOwner: "Test",
        trnCardNumber: "4030000010001234", // Bambora test card
        trnExpMonth: "12",
        trnExpYear: "25",
        trnCardCvd: "123",
      })

      const response = await fetch("https://api.na.bambora.com/scripts/process_transaction.asp", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: postData.toString(),
      })

      const responseText = await response.text()
      const params = new URLSearchParams(responseText)
      const result: Record<string, string> = {}
      for (const [key, value] of params) {
        result[key] = value
      }

      results.push({
        test: test.name,
        merchantId: test.merchantId,
        success: result.trnApproved === "1",
        message: result.messageText,
        errorType: result.errorType,
        response: result,
      })
    } catch (error) {
      results.push({
        test: test.name,
        merchantId: test.merchantId,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  return NextResponse.json({ results })
}
