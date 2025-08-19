import { type NextRequest, NextResponse } from "next/server"

type BillingData = {
  cardholder_name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  postal_code: string
  country: string
}

// ---------- Helpers ----------
function normalizeEmail(s: string) {
  return String(s || "")
    .trim()
    .toLowerCase()
}
function onlyDigits(s: string) {
  return String(s || "").replace(/\D/g, "")
}
function formatAmount(n: number) {
  return (Math.round(n * 100) / 100).toFixed(2)
}
function isApprovedFlag(v: unknown) {
  return v === 1 || v === "1" || v === true || v === "true"
}
function addMonthsSafe(date: Date, monthsToAdd: number) {
  const d = new Date(date)
  const day = d.getDate()
  d.setMonth(d.getMonth() + monthsToAdd)
  const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, maxDay))
  return d
}
function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

const WP_TZ = process.env.WP_TZ || process.env.WORDPRESS_TZ || "America/Toronto"

function toYMDLocal(date: Date, timeZone = WP_TZ as string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const y = parts.find((p) => p.type === "year")?.value
  const m = parts.find((p) => p.type === "month")?.value
  const d = parts.find((p) => p.type === "day")?.value
  return `${y}-${m}-${d}`
}

function buildQueueUrl(baseOrFull: string) {
  const trimmed = (baseOrFull || "").replace(/\/+$/, "")
  if (!trimmed) return ""
  if (trimmed.includes("/wp-json/")) return trimmed
  return `${trimmed}/wp-json/kodiak/v1/queue-payment`
}
function pickCustomerCode(obj: any): string | null {
  if (!obj || typeof obj !== "object") return null
  if (obj.customer_code) return String(obj.customer_code)
  if (obj.customerCode) return String(obj.customerCode)
  if (obj?.profile?.customer_code) return String(obj.profile.customer_code)
  if (obj?.profile?.customerCode) return String(obj.profile.customerCode)
  return null
}
function pickCardsArray(cardsJson: any): any[] {
  if (!cardsJson || typeof cardsJson !== "object") return []
  if (Array.isArray(cardsJson.card)) return cardsJson.card
  if (Array.isArray(cardsJson.cards)) return cardsJson.cards
  if (Array.isArray(cardsJson.data)) return cardsJson.data
  if (cardsJson.card_id || cardsJson.cardId) return [cardsJson]
  return []
}
function toPositiveInt(v: unknown, fallback: number | null = null): number | null {
  const n = typeof v === "string" ? Number.parseInt(v, 10) : Number(v)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

async function sendReceiptToWordPress(receiptData: any) {
  const wpSiteUrl = process.env.WORDPRESS_SITE_URL
  const receiptSecret = process.env.KODIAK_RECEIPT_SECRET

  console.log("[v0] Receipt function called with:", {
    wpSiteUrl: wpSiteUrl || "MISSING",
    receiptSecret: receiptSecret ? "SET" : "MISSING",
  })

  if (!wpSiteUrl || !receiptSecret) {
    console.log("[v0] WordPress receipt skipped: Missing environment variables")
    return
  }

  try {
    const receiptUrl = `${wpSiteUrl}/wp-json/kodiak/v1/create-receipt`
    const receiptPayload = receiptData

    console.log("[v0] Sending receipt to WordPress:", { receiptUrl, receiptPayload })

    const response = await fetch(receiptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-kodiak-secret": receiptSecret,
      },
      body: JSON.stringify(receiptPayload),
    })

    const responseText = await response.text()
    console.log("[v0] WordPress receipt response:", {
      status: response.status,
      statusText: response.statusText,
      responseText,
    })

    if (response.ok) {
      console.log("[v0] Receipt sent to WordPress successfully")
    } else {
      console.log("[v0] WordPress receipt failed:", response.status, responseText)
    }
  } catch (error) {
    console.log("[v0] WordPress receipt error:", error)
  }
}

async function sendPaymentToCRM(contractId: string, amount: string, cardLastFour?: string, note?: string) {
  try {
    if (!contractId) {
      console.log("[v0] No contract ID available - skipping CRM integration")
      return
    }

    const crmPayload = {
      contractId,
      amount,
      cardLastFour: cardLastFour || "",
      note: note || "", // Added note field to CRM payload
    }

    console.log("[v0] Sending payment to CRM:", crmPayload)

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NETLIFY_URL
        ? process.env.NETLIFY_URL
        : "http://localhost:3000"

    const crmUrl = `${baseUrl}/api/crm/add-payment`
    console.log("[v0] CRM URL:", crmUrl)

    const response = await fetch(crmUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(crmPayload),
    })

    const responseData = await response.json()
    console.log("[v0] CRM payment response:", responseData)

    if (response.ok) {
      console.log("[v0] Payment sent to CRM successfully")
    } else {
      console.log("[v0] CRM payment failed:", responseData.error)
    }
  } catch (error) {
    console.log("[v0] CRM payment error:", error)
  }
}

// ---------- Route ----------
export async function POST(req: NextRequest) {
  try {
    const {
      token,
      amount,
      installments = 1,
      billingData,
      contractData,
      renewalState, // Added renewalState parameter
      wordpressEndpoint,
    }: {
      token: string
      amount: number
      installments?: number
      billingData: BillingData
      contractData?: any
      renewalState?: any // Added renewalState type
      wordpressEndpoint?: string
    } = await req.json()

    // Validate inputs
    if (!token) return NextResponse.json({ success: false, error: "Missing payment token" }, { status: 400 })
    if (!(amount > 0)) return NextResponse.json({ success: false, error: "Invalid payment amount" }, { status: 400 })

    const required = [
      "cardholder_name",
      "email",
      "phone",
      "address",
      "city",
      "state",
      "postal_code",
      "country",
    ] as const
    for (const f of required) {
      // @ts-ignore
      if (!billingData?.[f]?.trim?.()) {
        return NextResponse.json({ success: false, error: `Missing ${String(f).replace("_", " ")}` }, { status: 400 })
      }
    }

    const cleanPhone = onlyDigits(billingData.phone)
    if (cleanPhone.length < 10)
      return NextResponse.json({ success: false, error: "Phone must be at least 10 digits" }, { status: 400 })
    const cleanPostal = String(billingData.postal_code || "")
      .replace(/\s+/g, "")
      .toUpperCase()
    if (billingData.country === "CA" && !/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(cleanPostal)) {
      return NextResponse.json(
        { success: false, error: "Invalid Canadian postal code format (A1A1A1)" },
        { status: 400 },
      )
    }
    const cleanEmail = normalizeEmail(billingData.email)
    const formattedAmount = formatAmount(amount)

    const useSandbox = process.env.BAMBORA_USE_SANDBOX === "true"

    // Sandbox mode: use hardcoded test credentials
    // Production mode: use environment variables with validation
    const MERCHANT_ID = useSandbox ? "383613253" : process.env.BAMBORA_MERCHANT_ID

    const PAYMENT_API_KEY = useSandbox ? "0c3a403f7C0547008423f18063C00275" : process.env.BAMBORA_PAYMENT_API_KEY

    const PROFILES_API_KEY = useSandbox ? "204B349135E149E9AD22A6D9D30AE0EE" : process.env.BAMBORA_PROFILES_API_KEY

    console.log(`[v0] Using Bambora ${useSandbox ? "SANDBOX" : "PRODUCTION"} mode`)

    // Only validate environment variables in production mode
    if (!useSandbox && (!MERCHANT_ID || !PAYMENT_API_KEY || !PROFILES_API_KEY)) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing Bambora credentials in environment variables (production mode)",
          missing: {
            merchantId: !MERCHANT_ID,
            paymentApiKey: !PAYMENT_API_KEY,
            profilesApiKey: !PROFILES_API_KEY,
          },
        },
        { status: 500 },
      )
    }

    const paymentAuthHeader = `Passcode ${Buffer.from(`${MERCHANT_ID}:${PAYMENT_API_KEY}`).toString("base64")}`
    const profileAuthHeader = `Passcode ${Buffer.from(`${MERCHANT_ID}:${PROFILES_API_KEY}`).toString("base64")}`

    // 1) Create Payment Profile from the single-use token (must be first; token cannot be reused)
    const serviceAddress = contractData?.serviceAddress || billingData.address.trim()
    const profilePayload = {
      language: "en",
      comments: `Payment 1 of ${installments} for ${serviceAddress}`,
      token: { name: billingData.cardholder_name.trim(), code: token },
      billing: {
        name: billingData.cardholder_name.trim(),
        address_line1: billingData.address.trim(),
        city: billingData.city.trim(),
        province: billingData.state.trim(),
        country: billingData.country.trim(),
        postal_code: cleanPostal,
        phone_number: cleanPhone,
        email_address: cleanEmail,
      },
    }

    const profileResp = await fetch("https://api.na.bambora.com/v1/profiles", {
      method: "POST",
      headers: { Authorization: profileAuthHeader, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(profilePayload),
    })
    const profileJson = await profileResp.json().catch(() => ({}) as any)

    const profileCodeNum = toPositiveInt(profileJson?.code ?? profileJson?.status ?? 0, 0)
    const customerCode =
      profileResp.ok && (profileCodeNum === 1 || profileCodeNum === 200) ? pickCustomerCode(profileJson) : null

    if (!customerCode) {
      // Cannot queue without a profile. Return success for the first charge path only if desired,
      // but since we haven't charged yet, we should stop here to avoid a non-profile purchase.
      return NextResponse.json({
        success: true,
        firstTransactionId: null,
        totalInstallments: Math.max(1, Number(installments || 1)),
        queuedInWordPress: false,
        scheduled: [],
        failures: [],
        customerCode: null,
        cardId: null,
        message: `Future payments not queued: ${profileJson?.message || "Could not create payment profile from token"}. Ensure PROFILES API key is valid on Netlify.`,
        debug: { profileRespOk: profileResp.ok, profileCode: profileJson?.code, profileMsg: profileJson?.message },
        environment: "SERVER",
      })
    }

    // 2) Resolve card_id on the profile
    let cardId: number | null = null
    try {
      const cardsResp = await fetch(`https://api.na.bambora.com/v1/profiles/${customerCode}/cards`, {
        method: "GET",
        headers: { Authorization: profileAuthHeader, "Content-Type": "application/json", Accept: "application/json" },
      })
      const cardsJson = await cardsResp.json().catch(() => ({}))
      const cards = pickCardsArray(cardsJson)
      if (cards.length) {
        cardId = toPositiveInt(cards[0]?.card_id ?? cards[0]?.cardId, 1)
      } else {
        cardId = 1 // default first card
      }
    } catch {
      cardId = 1
    }

    // 3) Initial payment using payment_profile (ONE purchase; no extra capture step)
    const initialPayload = {
      amount: Number.parseFloat(formattedAmount),
      payment_method: "payment_profile",
      payment_profile: { customer_code: customerCode, card_id: cardId },
      complete: true,
      recurring_payment: true,
      billing: {
        name: billingData.cardholder_name.trim(),
        address_line1: billingData.address.trim(),
        city: billingData.city.trim(),
        province: billingData.state.trim(),
        country: billingData.country.trim(),
        postal_code: cleanPostal,
        phone_number: cleanPhone,
        email_address: cleanEmail,
      },
    }

    const initialResp = await fetch("https://api.na.bambora.com/v1/payments", {
      method: "POST",
      headers: { Authorization: paymentAuthHeader, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(initialPayload),
    })
    const initialJson = await initialResp.json().catch(() => ({}))
    if (!initialResp.ok || !isApprovedFlag(initialJson?.approved)) {
      return NextResponse.json(
        { success: false, error: initialJson?.message || "Initial payment (profile) failed", details: initialJson },
        { status: 400 },
      )
    }
    const firstTransactionId = initialJson?.id
    const totalInstallments = Math.max(1, Number(installments || 1))
    const futureCount = totalInstallments - 1

    console.log("[v0] First installment payment successful, generating receipt")

    // Calculate future payment dates for receipt
    const startDate = new Date()
    const futureDates = []
    for (let i = 1; i <= futureCount; i++) {
      const due = addMonthsSafe(startDate, i)
      futureDates.push(toYMDLocal(due))
    }

    const scheduleNote =
      totalInstallments === 1
        ? "Payment 1 of 1 - Balance paid in full"
        : `Payment 1 of ${totalInstallments}. Remaining payments scheduled for ${futureDates.join(", ")}`

    await Promise.all([
      sendReceiptToWordPress({
        transaction_id: firstTransactionId,
        amount: Number.parseFloat(formattedAmount),
        payment_method: "Credit Card (Complete)",
        payment_type: "installment",
        customer_name: billingData.cardholder_name.trim(),
        customer_email: cleanEmail,
        service_address: serviceAddress,
        current_payment: 1,
        total_payments: totalInstallments,
        future_dates: futureDates,
        contract_id: contractData?.contractId || "",
        season: contractData?.season || "2024-2025",
        is_platinum: renewalState?.platinumService || false, // Fixed to use renewalState.platinumService
      }),
      sendPaymentToCRM(contractData?.contractId || "", formattedAmount, initialJson?.card?.last_four, scheduleNote), // Added schedule note parameter
    ])

    if (futureCount <= 0) {
      return NextResponse.json({
        success: true,
        firstTransactionId,
        totalInstallments,
        queuedInWordPress: false,
        scheduled: [],
        failures: [],
        customerCode,
        cardId,
        message: "Initial payment processed successfully (no future payments).",
        environment: "SERVER",
      })
    }

    // 4) Queue remaining installments in WordPress
    const WP_QUEUE_ENDPOINT = buildQueueUrl(process.env.WP_KODIAK_QUEUE_ENDPOINT || wordpressEndpoint || "")
    const WP_SHARED_SECRET = process.env.WP_KODIAK_SHARED_SECRET || ""
    if (!WP_QUEUE_ENDPOINT || !WP_SHARED_SECRET) {
      return NextResponse.json({
        success: true,
        firstTransactionId,
        totalInstallments,
        queuedInWordPress: false,
        scheduled: [],
        failures: [],
        customerCode,
        cardId,
        message: "Initial payment processed. WP queue not configured; future payments not queued.",
        environment: "SERVER",
      })
    }

    const scheduled: any[] = []
    const failures: any[] = []

    for (let i = 1; i <= futureCount; i++) {
      const due = addMonthsSafe(startDate, i)

      const remainingDates = []
      for (let j = i + 1; j <= totalInstallments; j++) {
        const futureDate = addMonthsSafe(startDate, j)
        remainingDates.push(toYMDLocal(futureDate))
      }

      const payload = {
        amount: formatAmount(amount),
        currency: contractData?.currency || "CAD",
        payment_date: toYMDLocal(due),
        customer_code: customerCode,
        card_id: cardId,
        recurring_payment: true,
        contract_id: contractData?.contractId ?? null,
        service_address: contractData?.serviceAddress ?? null,
        customer_name: billingData.cardholder_name.trim(),
        customer_email: cleanEmail,
        customer_phone: cleanPhone,
        comments: `Payment ${i + 1} of ${totalInstallments} for ${serviceAddress}`,
        metadata: {
          company: contractData?.company ?? null,
          installments: totalInstallments,
          payment_number: i + 1,
          total_payments: totalInstallments,
          customer_email: cleanEmail,
          contract_id: contractData?.contractId ?? null,
          service_address: serviceAddress,
          customer_code: customerCode,
          card_id: cardId,
          original_platinum: renewalState?.platinumService || false,
          remaining_dates: remainingDates,
          season: contractData?.season || "2024-2025",
        },
      }

      try {
        const wpResp = await fetch(WP_QUEUE_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-kodiak-secret": WP_SHARED_SECRET,
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        })
        const text = await wpResp.text()
        let wpJson: any = {}
        try {
          wpJson = JSON.parse(text)
        } catch {}

        if (!wpResp.ok) {
          failures.push({
            index: i,
            date: payload.payment_date,
            status: wpResp.status,
            error: wpJson?.error || text?.slice(0, 500) || "Unknown WP error",
          })
        } else {
          scheduled.push({ index: i, date: payload.payment_date, wp: wpJson })
        }
      } catch (e: any) {
        failures.push({ index: i, date: payload.payment_date, error: e?.message || "WP queue request failed" })
      }
    }

    return NextResponse.json({
      success: true,
      firstTransactionId,
      totalInstallments,
      queuedInWordPress: failures.length === 0,
      scheduled,
      failures,
      customerCode,
      cardId,
      message:
        failures.length === 0
          ? `Initial payment processed and ${futureCount} future payments queued in WordPress.`
          : `Initial payment processed. Queued ${scheduled.length} future payments, ${failures.length} failed.`,
      environment: "SERVER",
    })
  } catch (error) {
    console.error("❌ charge-initial-and-queue error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Payment processing failed" },
      { status: 500 },
    )
  }
}
