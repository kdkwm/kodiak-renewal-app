// Backup of the earlier route that attempted to schedule future installments directly in Bambora.
// Note: Bambora processed these as immediate purchases rather than future-dated charges.
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
 try {
   const { token, amount, isRecurring, contractData, billingData, installments } = await req.json()

   // Sandbox credentials (prefer env vars in production)
   const SANDBOX_MERCHANT_ID = "383613253"
   const SANDBOX_PAYMENT_API_KEY = "0c3a403f7C0547008423f18063C00275" // Payment API passcode
   const SANDBOX_PROFILES_API_KEY = "204B349135E149E9AD22A6D9D30AE0EE" // Payment Profiles API key

   console.log("🧪 BAMBORA PAYMENT PROFILES PROCESSING:")
   console.log("Merchant ID:", SANDBOX_MERCHANT_ID)
   console.log("Amount:", amount)
   console.log("Is Recurring:", isRecurring)
   console.log("Installments:", installments)
   console.log("Billing Data:", billingData)

   if (!token) {
     return NextResponse.json({ success: false, error: "Missing payment token" }, { status: 400 })
   }

   if (!amount || amount <= 0) {
     return NextResponse.json({ success: false, error: "Invalid payment amount" }, { status: 400 })
   }

   // Validate required billing data
   const requiredFields = ["cardholder_name", "email", "phone", "address", "city", "state", "postal_code", "country"]
   for (const field of requiredFields) {
     if (!billingData?.[field]?.trim()) {
       return NextResponse.json(
         { success: false, error: `Missing required field: ${field.replace("_", " ")}` },
         { status: 400 },
       )
     }
   }

   const chargeAmount = Math.round(amount * 100) / 100
   const formattedAmount = chargeAmount.toFixed(2)

   // Auth headers
   const paymentAuthHeader = `Passcode ${Buffer.from(`${SANDBOX_MERCHANT_ID}:${SANDBOX_PAYMENT_API_KEY}`).toString("base64")}`
   const profileAuthHeader = `Passcode ${Buffer.from(`${SANDBOX_MERCHANT_ID}:${SANDBOX_PROFILES_API_KEY}`).toString("base64")}`

   console.log("🔑 Payment Auth Header:", paymentAuthHeader.substring(0, 20) + "...")
   console.log("🔑 Profile Auth Header:", profileAuthHeader.substring(0, 20) + "...")

   // Clean inputs
   const cleanPhone = String(billingData.phone || "").replace(/\D/g, "")
   if (cleanPhone.length < 10) {
     return NextResponse.json({ success: false, error: "Phone number must be at least 10 digits" }, { status: 400 })
   }

   const cleanPostalCode = String(billingData.postal_code || "").replace(/\s+/g, "").toUpperCase()
   if (billingData.country === "CA" && !/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(cleanPostalCode)) {
     return NextResponse.json(
       { success: false, error: "Invalid Canadian postal code format (should be A1A1A1)" },
       { status: 400 },
     )
   }

   const cleanEmail = String(billingData.email || "").trim().toLowerCase()
   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
     return NextResponse.json({ success: false, error: "Invalid email address format" }, { status: 400 })
   }

   // Handle one-time payment (token method)
   if (!isRecurring) {
     console.log("💳 Processing one-time payment (token)")
     const paymentData = {
       amount: parseFloat(formattedAmount),
       payment_method: "token",
       token: {
         code: token,
         name: billingData.cardholder_name.trim(),
       },
       // signal it's part of a subscription if you want the bank to see it as recurring, optional for one-time
       recurring_payment: false,
       billing: {
         name: billingData.cardholder_name.trim(),
         address_line1: billingData.address.trim(),
         city: billingData.city.trim(),
         province: billingData.state.trim(),
         country: billingData.country.trim(),
         postal_code: cleanPostalCode,
         phone_number: cleanPhone,
         email_address: cleanEmail,
       },
     }

     console.log("📤 Sending one-time payment data:", JSON.stringify(paymentData, null, 2))
     const response = await fetch("https://api.na.bambora.com/v1/payments", {
       method: "POST",
       headers: { Authorization: paymentAuthHeader, "Content-Type": "application/json" },
       body: JSON.stringify(paymentData),
     })

     const result = await response.json()
     console.log("📥 One-time payment result:", result)

     if (!response.ok || result.approved !== 1) {
       return NextResponse.json({ success: false, error: result.message || "Payment failed" }, { status: 400 })
     }

     return NextResponse.json({
       success: true,
       transactionId: result.id,
       message: "Payment processed successfully",
     })
   }

   // Recurring: Profile + First payment + Schedule N-1 payments
   console.log("🔄 Processing installment payments with Payment Profiles")

   const totalInstallments = Number(installments || 1)
   const startDate = new Date()
   const billingDay = startDate.getDate()

   console.log("📅 Installment setup:")
   console.log("- Start Date:", startDate.toDateString())
   console.log("- Billing Day:", billingDay)
   console.log("- Total Installments:", totalInstallments)

   // Step 1: Create Payment Profile
   console.log("🏗️ Creating Payment Profile...")
   const uniqueId = Date.now().toString()
   const profileData = {
     language: "en",
     comments: `Contract renewal installment plan - ${totalInstallments} payments - ${uniqueId}`,
     token: {
       name: billingData.cardholder_name.trim(),
       code: token,
     },
     billing: {
       name: billingData.cardholder_name.trim(),
       address_line1: billingData.address.trim(),
       city: billingData.city.trim(),
       province: billingData.state.trim(),
       country: billingData.country.trim(),
       postal_code: cleanPostalCode,
       phone_number: cleanPhone,
       email_address: cleanEmail,
     },
   }

   console.log("📤 Sending profile data:", JSON.stringify(profileData, null, 2))
   const profileResponse = await fetch("https://api.na.bambora.com/v1/profiles", {
     method: "POST",
     headers: { Authorization: profileAuthHeader, "Content-Type": "application/json" },
     body: JSON.stringify(profileData),
   })
   const profileResult = await profileResponse.json()
   console.log("📥 Profile creation result:", JSON.stringify(profileResult, null, 2))
   console.log("📥 Profile response status:", profileResponse.status)

   // Duplicate profile
   if (profileResponse.status === 402 && profileResult?.code === 17) {
     console.log("⚠️ Duplicate profile detected - using direct token fallback for first payment only")
     // Fallback: process first as token then stop (can't safely fetch existing customer_code here)
     const firstPaymentData = {
       amount: parseFloat(formattedAmount),
       payment_method: "token",
       token: { code: token, name: billingData.cardholder_name.trim() },
       recurring_payment: true,
       billing: {
         name: billingData.cardholder_name.trim(),
         address_line1: billingData.address.trim(),
         city: billingData.city.trim(),
         province: billingData.state.trim(),
         country: billingData.country.trim(),
         postal_code: cleanPostalCode,
         phone_number: cleanPhone,
         email_address: cleanEmail,
       },
     }

     const firstPaymentResponse = await fetch("https://api.na.bambora.com/v1/payments", {
       method: "POST",
       headers: { Authorization: paymentAuthHeader, "Content-Type": "application/json" },
       body: JSON.stringify(firstPaymentData),
     })
     const firstPaymentResult = await firstPaymentResponse.json()

     if (!firstPaymentResponse.ok || firstPaymentResult.approved !== 1) {
       return NextResponse.json(
         { success: false, error: firstPaymentResult.message || "First payment failed", details: firstPaymentResult },
         { status: 400 },
       )
     }

     return NextResponse.json({
       success: true,
       firstTransactionId: firstPaymentResult.id,
       scheduledPayments: [],
       customerCode: null,
       cardId: null,
       totalInstallments: 1,
       message:
         "First payment processed via token. Duplicate profile detected; future payments not scheduled automatically.",
       environment: "SANDBOX",
       fallbackUsed: true,
     })
   }

   if (!profileResponse.ok || profileResult?.code !== 1 || !profileResult?.customer_code) {
     return NextResponse.json(
       {
         success: false,
         error: profileResult?.message || "Profile creation failed",
         details: profileResult,
       },
       { status: 400 },
     )
   }

   const customerCode = profileResult.customer_code as string
   console.log("✅ Payment Profile created successfully with customer_code:", customerCode)

   // Step 2: Get the card_id
   console.log("🔍 Retrieving card_id from profile cards...")
   const getCardsResponse = await fetch(`https://api.na.bambora.com/v1/profiles/${customerCode}/cards`, {
     method: "GET",
     headers: { Authorization: profileAuthHeader, "Content-Type": "application/json" },
   })
   const getCardsResult = await getCardsResponse.json()
   console.log("📥 Get cards response status:", getCardsResponse.status)
   console.log("📥 Get cards result:", JSON.stringify(getCardsResult, null, 2))

   let cardsArray: any[] = []
   if (getCardsResponse.ok && getCardsResult && typeof getCardsResult === "object") {
     if (Array.isArray(getCardsResult.card)) cardsArray = getCardsResult.card
     else if (Array.isArray(getCardsResult.cards)) cardsArray = getCardsResult.cards
     else if (Array.isArray(getCardsResult.data)) cardsArray = getCardsResult.data
     else if (getCardsResult.card_id) cardsArray = [getCardsResult]
   }

   const resolveCardId = () => {
     if (!cardsArray.length) return 1
     const raw = cardsArray[0].card_id
     const parsed = typeof raw === "string" ? parseInt(raw, 10) : Number(raw)
     return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
   }

   const cardId = resolveCardId()
   if (!getCardsResponse.ok || !cardsArray.length) {
     console.warn("⚠️ Cards endpoint issue or empty; using fallback card_id:", cardId)
   } else {
     console.log("✅ Card info:", cardsArray[0])
   }

   // Helper to build a valid profile-based payment per docs:
   // payment_method: "payment_profile" AND payment_profile: { customer_code, card_id }
   const buildProfilePayment = (extra?: Record<string, any>) => ({
     amount: parseFloat(formattedAmount),
     payment_method: "payment_profile",
     payment_profile: {
       customer_code: customerCode,
       card_id: cardId,
     },
     recurring_payment: true, // per docs to indicate series of recurring transactions
     billing: {
       name: billingData.cardholder_name.trim(),
       address_line1: billingData.address.trim(),
       city: billingData.city.trim(),
       province: billingData.state.trim(),
       country: billingData.country.trim(),
       postal_code: cleanPostalCode,
       phone_number: cleanPhone,
       email_address: cleanEmail,
     },
     ...(extra || {}),
   })

   // Step 3: First payment (immediate)
   console.log("💳 Processing first payment (payment_profile)...")
   const firstPaymentData = buildProfilePayment()
   console.log("📤 First payment data:", JSON.stringify(firstPaymentData, null, 2))

   const firstPaymentResponse = await fetch("https://api.na.bambora.com/v1/payments", {
     method: "POST",
     headers: { Authorization: paymentAuthHeader, "Content-Type": "application/json" },
     body: JSON.stringify(firstPaymentData),
   })
   const firstPaymentResult = await firstPaymentResponse.json()
   console.log("📥 First payment result:", JSON.stringify(firstPaymentResult, null, 2))

   if (!firstPaymentResponse.ok || firstPaymentResult.approved !== 1) {
     return NextResponse.json(
       { success: false, error: firstPaymentResult.message || "First payment failed", details: firstPaymentResult },
       { status: 400 },
     )
   }

   // Step 4: Schedule future payments
   const scheduledPayments: Array<{ id: string; date: string; amount: string }> = []
   const futurePayments = Math.max(0, totalInstallments - 1)

   console.log("📅 Scheduling", futurePayments, "future payments...")
   for (let i = 1; i <= futurePayments; i++) {
     const futureDate = new Date(startDate)
     futureDate.setMonth(startDate.getMonth() + i)
     const maxDayInMonth = new Date(futureDate.getFullYear(), futureDate.getMonth() + 1, 0).getDate()
     futureDate.setDate(Math.min(billingDay, maxDayInMonth))
     const formattedDate = futureDate.toISOString().slice(0, 10).replace(/-/g, "") // YYYYMMDD

     const scheduledPaymentData = buildProfilePayment({
       schedule: { start_date: formattedDate },
     })
     console.log(`📤 Sending scheduled payment ${i} data:`, JSON.stringify(scheduledPaymentData, null, 2))

     const scheduledResponse = await fetch("https://api.na.bambora.com/v1/payments", {
       method: "POST",
       headers: { Authorization: paymentAuthHeader, "Content-Type": "application/json" },
       body: JSON.stringify(scheduledPaymentData),
     })
     const scheduledResult = await scheduledResponse.json()
     console.log(`📥 Scheduled payment ${i} result:`, JSON.stringify(scheduledResult, null, 2))

     if (scheduledResult.id) {
       scheduledPayments.push({
         id: scheduledResult.id,
         date: futureDate.toDateString(),
         amount: formattedAmount,
       })
     } else {
       return NextResponse.json(
         { success: false, error: scheduledResult.message || `Failed to schedule payment ${i}`, details: scheduledResult },
         { status: 400 },
       )
     }
   }

   console.log("🎉 All payments processed and scheduled successfully!")
   return NextResponse.json({
     success: true,
     firstTransactionId: firstPaymentResult.id,
     scheduledPayments,
     customerCode,
     cardId,
     totalInstallments,
     message: `First payment processed and ${futurePayments} future payments scheduled`,
     environment: "SANDBOX",
   })
 } catch (error) {
   console.error("❌ Payment processing error:", error)
   return NextResponse.json(
     { success: false, error: error instanceof Error ? error.message : "Payment processing failed" },
     { status: 500 },
   )
 }
}
