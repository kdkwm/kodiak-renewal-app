import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { testType = "credentials" } = await req.json()

    // Test different scenarios systematically
    const tests = {
      // Test 1: Verify credentials with minimal request
      credentials: async () => {
        const MERCHANT_ID = "383613253"
        const API_KEY = "0c3a403f7C0547008423f18063C00275"

        const postData = new URLSearchParams({
          requestType: "BACKEND",
          merchant_id: MERCHANT_ID,
          passcode: API_KEY,
          trnType: "P",
          trnAmount: "1.00",
          trnCardOwner: "Test User",
          trnCardNumber: "4030000010001234", // Bambora test card
          trnExpMonth: "12",
          trnExpYear: "25",
          trnCardCvd: "123",
        })

        return await fetch("https://api.na.bambora.com/scripts/process_transaction.asp", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: postData.toString(),
        })
      },

      // Test 2: Try production credentials
      production: async () => {
        const MERCHANT_ID = "245162388"
        const API_KEY = "B4372eC6f40B4E05bd90Ece2E3Be734b"

        const postData = new URLSearchParams({
          requestType: "BACKEND",
          merchant_id: MERCHANT_ID,
          passcode: API_KEY,
          trnType: "P",
          trnAmount: "1.00",
          trnCardOwner: "Test User",
          trnCardNumber: "4030000010001234",
          trnExpMonth: "12",
          trnExpYear: "25",
          trnCardCvd: "123",
        })

        return await fetch("https://api.na.bambora.com/scripts/process_transaction.asp", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: postData.toString(),
        })
      },

      // Test 3: Test token-based payment (like your current flow)
      token: async () => {
        const MERCHANT_ID = "383613253"
        const API_KEY = "0c3a403f7C0547008423f18063C00275"

        // This would need a real token from the frontend
        const postData = new URLSearchParams({
          requestType: "BACKEND",
          merchant_id: MERCHANT_ID,
          passcode: API_KEY,
          trnType: "P",
          trnAmount: "1.00",
          singleUseToken: "test-token-would-go-here",
          trnCardOwner: "Test User",
        })

        return await fetch("https://api.na.bambora.com/scripts/process_transaction.asp", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: postData.toString(),
        })
      },
    }

    console.log(`[Bambora Debug] Running test: ${testType}`)

    const response = await tests[testType as keyof typeof tests]()
    const responseText = await response.text()

    console.log(`[Bambora Debug] Response:`, responseText)

    // Parse response
    const params = new URLSearchParams(responseText)
    const result: Record<string, string> = {}
    for (const [key, value] of params) {
      result[key] = value
    }

    return NextResponse.json({
      testType,
      success: result.trnApproved === "1",
      result,
      analysis: analyzeResponse(result),
    })
  } catch (error) {
    console.error("Debug test error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Test failed" }, { status: 500 })
  }
}

function analyzeResponse(result: Record<string, string>) {
  const analysis = []

  if (result.messageText === "Authorization Failed") {
    analysis.push("❌ Authorization Failed - This usually means:")
    analysis.push("  • Invalid merchant ID or API key")
    analysis.push("  • Account not properly configured")
    analysis.push("  • Missing permissions for API transactions")
  }

  if (result.errorType === "S") {
    analysis.push("🔧 System Error - Server-side issue")
  }

  if (result.avsProcessed === "0") {
    analysis.push("ℹ️ Address Verification not performed")
  }

  if (!result.trnAmount) {
    analysis.push("⚠️ Transaction amount is empty in response")
  }

  return analysis
}
