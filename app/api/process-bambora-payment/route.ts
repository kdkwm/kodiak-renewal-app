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
function yyyymmdd(d: Date) {
  return d.toISOString().slice(0, 10).replace(/-/g, "")
}
function yyyy_mm_dd(d: Date) {
  return d.toISOString().slice(0, 10)
}
function trimTrailingSlashes(url: string) {
  return url.replace(/\/+$/, "")
}

export async function POST(req: NextRequest) {
  try {
    const {
      token,
      amount,
      isRecurring,
      installments,
      billingData,
      contractData,
      // Optional: override default behavior
      scheduleStrategy, // "wordpress" | "none"
    } = await req.json()

    const MERCHANT_ID = process.env.BAMBORA_MERCHANT_ID || "383613253"
    const PAYMENT_API_KEY = process.env.BAMBORA_PAYMENT_API_KEY || "0c3a403f7C0547008423f18063C00275"
    const PROFILES_API_KEY = process.env.BAMBORA_PROFILES_API_KEY || "204B349135E149E9AD22A6D9D30AE0EE"

    const isProduction = process.env.BAMBORA_MERCHANT_ID && process.env.BAMBORA_PAYMENT_API_KEY
    const environment = isProduction ? "PRODUCTION" : "SANDBOX"

    if (!token) return NextResponse.json({ success: false, error: "Missing payment token" }, { status: 400 })
    if (!amount || amount <= 0)
      return NextResponse.json({ success: false, error: "Invalid payment amount" }, { status: 400 })

    // Validate billing
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
      if (!billingData?.[f] || !String(billingData[f]).trim()) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${String(f).replace("_", " ")}` },
          { status: 400 },
        )
      }
    }

    const cleanPhone = onlyDigits(billingData.phone)
    if (cleanPhone.length < 10) {
      return NextResponse.json({ success: false, error: "Phone number must be at least 10 digits" }, { status: 400 })
    }
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

    const paymentAuthHeader = `Passcode ${Buffer.from(`${MERCHANT_ID}:${PAYMENT_API_KEY}`).toString("base64")}`
    const profileAuthHeader = `Passcode ${Buffer.from(`${MERCHANT_ID}:${PROFILES_API_KEY}`).toString("base64")}`
    const formattedAmount = formatAmount(amount)

    // One-time payment (no installments)
    if (!isRecurring) {
      const paymentData = {
        amount: Number.parseFloat(formattedAmount),
        payment_method: "token",
        token: { code: token, name: billingData.cardholder_name.trim() },
        complete: true,
        recurring_payment: false,
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

      const resp = await fetch("https://api.na.bambora.com/v1/payments", {
        method: "POST",
        headers: { Authorization: paymentAuthHeader, "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      })
      const result = await resp.json()

      if (!resp.ok || !isApprovedFlag(result.approved)) {
        return NextResponse.json(
          { success: false, error: result.message || "Payment failed", details: result },
          { status: 400 },
        )
      }

      // Auto-capture if sandbox still returns a PA with completion link
      const completeLink = Array.isArray(result.links) ? result.links.find((l: any) => l.rel === "complete") : null
      if (completeLink?.href) {
        await fetch(completeLink.href, {
          method: "POST",
          headers: { Authorization: paymentAuthHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ amount: Number.parseFloat(formattedAmount) }),
        }).catch(() => null)
      }

      return NextResponse.json({
        success: true,
        transactionId: result.id,
        message: "Payment processed successfully",
        environment,
      })
    }

    // Recurring installments: SAFE MODE
    // 1) Create a Payment Profile
    const totalInstallments = Math.max(1, Number(installments || 1))
    const startDate = new Date()
    const billingDay = startDate.getDate()

    const profileData = {
      language: "en",
      comments: `Contract renewal installment plan - ${totalInstallments} payments - ${Date.now()}`,
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
      headers: { Authorization: profileAuthHeader, "Content-Type": "application/json" },
      body: JSON.stringify(profileData),
    })
    const profileJson = await profileResp.json()

    if (profileResp.status === 402 && profileJson?.code === 17) {
      // Duplicate profile: charge first with token and stop (no scheduling here)
      const tokenPurchase = {
        amount: Number.parseFloat(formattedAmount),
        payment_method: "token",
        token: { code: token, name: billingData.cardholder_name.trim() },
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
      const firstResp = await fetch("https://api.na.bambora.com/v1/payments", {
        method: "POST",
        headers: { Authorization: paymentAuthHeader, "Content-Type": "application/json" },
        body: JSON.stringify(tokenPurchase),
      })
      const firstJson = await firstResp.json()
      if (!firstResp.ok || !isApprovedFlag(firstJson.approved)) {
        return NextResponse.json(
          { success: false, error: firstJson.message || "First payment failed", details: firstJson },
          { status: 400 },
        )
      }
      return NextResponse.json({
        success: true,
        firstTransactionId: firstJson.id,
        scheduledPayments: [],
        customerCode: null,
        cardId: null,
        totalInstallments: 1,
        message: "First payment processed via token. Duplicate profile detected; future payments not auto‑scheduled.",
        environment, // Use dynamic environment
        fallbackUsed: true,
      })
    }

    if (!profileResp.ok || profileJson?.code !== 1 || !profileJson?.customer_code) {
      return NextResponse.json(
        { success: false, error: profileJson?.message || "Profile creation failed", details: profileJson },
        { status: 400 },
      )
    }

    const customerCode: string = profileJson.customer_code

    // 2) Retrieve card_id
    const cardsResp = await fetch(`https://api.na.bambora.com/v1/profiles/${customerCode}/cards`, {
      method: "GET",
      headers: { Authorization: profileAuthHeader, "Content-Type": "application/json" },
    })
    const cardsJson = await cardsResp.json()

    let cardsArray: any[] = []
    if (cardsResp.ok && cardsJson && typeof cardsJson === "object") {
      if (Array.isArray(cardsJson.card)) cardsArray = cardsJson.card
      else if (Array.isArray(cardsJson.cards)) cardsArray = cardsJson.cards
      else if (Array.isArray(cardsJson.data)) cardsArray = cardsJson.data
      else if (cardsJson.card_id) cardsArray = [cardsJson]
    }
    let cardId = 1
    if (cardsArray.length) {
      const raw = cardsArray[0].card_id
      const parsed = typeof raw === "string" ? Number.parseInt(raw, 10) : Number(raw)
      cardId = Number.isFinite(parsed) && parsed > 0 ? parsed : 1
    }

    // 3) Charge ONLY the first installment now using payment_profile purchase
    const firstPurchase = {
      amount: Number.parseFloat(formattedAmount),
      payment_method: "payment_profile",
      payment_profile: {
        customer_code: customerCode,
        card_id: cardId,
        complete: true, // enforce purchase vs. PA
      },
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

    const firstResp = await fetch("https://api.na.bambora.com/v1/payments", {
      method: "POST",
      headers: { Authorization: paymentAuthHeader, "Content-Type": "application/json" },
      body: JSON.stringify(firstPurchase),
    })
    const firstJson = await firstResp.json()
    if (!firstResp.ok || !isApprovedFlag(firstJson.approved)) {
      return NextResponse.json(
        { success: false, error: firstJson.message || "First payment failed", details: firstJson },
        { status: 400 },
      )
    }

    // 4) Compute future installment dates (do NOT hit /v1/payments again here)
    const remaining = Math.max(0, Number(totalInstallments) - 1)
    const future: Array<{ date: string; amount: string }> = []
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(startDate)
      d.setMonth(startDate.getMonth() + i)
      const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      d.setDate(Math.min(billingDay, maxDay))
      future.push({ date: yyyy_mm_dd(d), amount: formattedAmount })
    }

    // 5) Optionally queue the future payments to WordPress
    const wpEndpoint = process.env.WP_KODIAK_QUEUE_ENDPOINT
    const wpSecret = process.env.WP_KODIAK_SHARED_SECRET
    const shouldQueueToWP =
      (scheduleStrategy === "wordpress" || (!scheduleStrategy && wpEndpoint && wpSecret)) &&
      wpEndpoint &&
      wpSecret &&
      remaining > 0

    const queued: Array<{ date: string; postId?: number; ok: boolean; error?: string }> = []

    if (shouldQueueToWP) {
      const base = trimTrailingSlashes(wpEndpoint as string)
      const url = `${base}/wp-json/kodiak/v1/queue-payment`

      for (const item of future) {
        try {
          const payload = {
            amount: Number.parseFloat(item.amount),
            currency: "CAD",
            payment_date: item.date, // YYYY-MM-DD
            customer_code: customerCode,
            card_id: cardId,
            contract_id: contractData?.contractId ?? "",
            service_address: contractData?.serviceAddress ?? "",
            customer_name: billingData.cardholder_name,
            customer_email: cleanEmail,
            customer_phone: cleanPhone,
            metadata: {
              plan: "installments",
              total_installments: totalInstallments,
              created_from: "Next.js",
            },
          }
          const r = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-kodiak-secret": String(wpSecret),
            },
            body: JSON.stringify(payload),
          })
          const j = await r.json().catch(() => ({}))
          if (r.ok && j?.post_id) {
            queued.push({ date: item.date, postId: Number(j.post_id), ok: true })
          } else {
            queued.push({ date: item.date, ok: false, error: j?.error || `HTTP ${r.status}` })
          }
        } catch (err) {
          queued.push({ date: item.date, ok: false, error: err instanceof Error ? err.message : "Queue error" })
        }
      }
    }

    return NextResponse.json({
      success: true,
      firstTransactionId: firstJson.id,
      message:
        remaining > 0
          ? shouldQueueToWP
            ? `First payment processed. ${remaining} future payments queued to WordPress.`
            : `First payment processed. ${remaining} future payments computed but not scheduled (no WP queue configured).`
          : "Single payment processed.",
      environment, // Use dynamic environment
      customerCode,
      cardId,
      totalInstallments,
      futurePayments: future,
      wordpressQueue: queued.length ? queued : undefined,
    })
  } catch (error) {
    console.error("❌ Payment processing error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Payment processing failed" },
      { status: 500 },
    )
  }
}
