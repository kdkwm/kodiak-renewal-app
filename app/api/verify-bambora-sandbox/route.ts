import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  // YOUR EXACT SANDBOX CREDENTIALS
  const SANDBOX_MERCHANT_ID = "383613253"
  const SANDBOX_API_KEY = "0c3a403f7C0547008423f18063C00275"
  const SANDBOX_RECURRING_API_KEY = "858966679b9942F3Ba0B0462255dA9AE"

  console.log("🧪 TESTING SANDBOX MODE WITH YOUR EXACT CREDENTIALS:")
  console.log("Merchant ID:", SANDBOX_MERCHANT_ID)
  console.log("API Key:", SANDBOX_API_KEY.substring(0, 8) + "...")
  console.log("Recurring API Key:", SANDBOX_RECURRING_API_KEY.substring(0, 8) + "...")

  try {
    // Test 1: Basic transaction with regular API key
    console.log("\n=== TEST 1: Basic Transaction ===")
    const basicTest = await testBasicTransaction(SANDBOX_MERCHANT_ID, SANDBOX_API_KEY)

    // Test 2: Recurring transaction with recurring API key
    console.log("\n=== TEST 2: Recurring Transaction ===")
    const recurringTest = await testRecurringTransaction(SANDBOX_MERCHANT_ID, SANDBOX_RECURRING_API_KEY)

    return NextResponse.json({
      sandbox: true,
      credentials: {
        merchantId: SANDBOX_MERCHANT_ID,
        apiKey: SANDBOX_API_KEY.substring(0, 8) + "...",
        recurringApiKey: SANDBOX_RECURRING_API_KEY.substring(0, 8) + "...",
      },
      tests: {
        basic: basicTest,
        recurring: recurringTest,
      },
      endpoint: "https://api.na.bambora.com/scripts/process_transaction.asp",
      environment: "SANDBOX (North America)",
    })
  } catch (error) {
    console.error("Sandbox verification failed:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Verification failed" }, { status: 500 })
  }
}

async function testBasicTransaction(merchantId: string, apiKey: string) {
  const postData = new URLSearchParams({
    requestType: "BACKEND",
    merchant_id: merchantId,
    passcode: apiKey,
    trnType: "P", // Purchase
    trnAmount: "1.00",
    trnCardOwner: "Test User",
    trnCardNumber: "4030000010001234", // Bambora test Visa
    trnExpMonth: "12",
    trnExpYear: "25",
    trnCardCvd: "123",
    ordEmailAddress: "test@example.com",
    ordName: "Test User",
    ordAddress1: "123 Test St",
    ordCity: "Toronto",
    ordProvince: "ON",
    ordPostalCode: "M1M1M1",
    ordCountry: "CA",
  })

  console.log("Sending basic transaction request...")
  console.log("POST data:", postData.toString())

  const response = await fetch("https://api.na.bambora.com/scripts/process_transaction.asp", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Sandbox-Test/1.0",
    },
    body: postData.toString(),
  })

  const responseText = await response.text()
  console.log("Basic transaction response:", responseText)

  // Parse response
  const params = new URLSearchParams(responseText)
  const result: Record<string, string> = {}
  for (const [key, value] of params) {
    result[key] = value
  }

  return {
    success: result.trnApproved === "1",
    transactionId: result.trnId,
    message: result.messageText,
    authCode: result.authCode,
    cvdResult: result.cvdId,
    avsResult: result.avsId,
    fullResponse: result,
  }
}

async function testRecurringTransaction(merchantId: string, recurringApiKey: string) {
  // Calculate expiry date (60 days from now for recurring)
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 60)
  const rbExpiry = `${String(endDate.getMonth() + 1).padStart(2, "0")}${String(endDate.getDate()).padStart(2, "0")}${endDate.getFullYear()}`

  const postData = new URLSearchParams({
    requestType: "BACKEND",
    merchant_id: merchantId,
    passcode: recurringApiKey, // Use recurring API key
    trnType: "P",
    trnAmount: "25.00", // Your actual amount
    trnRecurring: "1", // Enable recurring
    rbBillingPeriod: "M", // Monthly
    rbBillingIncrement: "1",
    rbExpiry: rbExpiry,
    trnCardOwner: "Test User",
    trnCardNumber: "4030000010001234", // Bambora test Visa
    trnExpMonth: "12",
    trnExpYear: "25",
    trnCardCvd: "123",
    ordEmailAddress: "test@example.com",
    ordName: "Test User",
    ordAddress1: "123 Test St",
    ordCity: "Toronto",
    ordProvince: "ON",
    ordPostalCode: "M1M1M1",
    ordCountry: "CA",
  })

  console.log("Sending recurring transaction request...")
  console.log("POST data:", postData.toString())

  const response = await fetch("https://api.na.bambora.com/scripts/process_transaction.asp", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Sandbox-Test/1.0",
    },
    body: postData.toString(),
  })

  const responseText = await response.text()
  console.log("Recurring transaction response:", responseText)

  // Parse response
  const params = new URLSearchParams(responseText)
  const result: Record<string, string> = {}
  for (const [key, value] of params) {
    result[key] = value
  }

  return {
    success: result.trnApproved === "1",
    transactionId: result.trnId,
    recurringId: result.rbAccountId,
    message: result.messageText,
    authCode: result.authCode,
    rbExpiry: rbExpiry,
    fullResponse: result,
  }
}
