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
      renewalState, // Added renewalState to get customer's platinum upgrade choice
      // Optional: override default behavior
      scheduleStrategy, // "wordpress" | "none"
    } = await req.json()

    const useSandbox = process.env.BAMBORA_USE_SANDBOX === "true"

    let MERCHANT_ID: string
    let PAYMENT_API_KEY: string
    let PROFILES_API_KEY: string

    if (useSandbox) {
      // Sandbox mode: always use hardcoded test credentials
      MERCHANT_ID = "383613253"
      PAYMENT_API_KEY = "0c3a403f7C0547008423f18063C00275"
      PROFILES_API_KEY = "204B349135E149E9AD22A6D9D30AE0EE"
    } else {
      // Production mode: use environment variables with validation
      MERCHANT_ID = process.env.BAMBORA_MERCHANT_ID || ""
      PAYMENT_API_KEY = process.env.BAMBORA_PAYMENT_API_KEY || ""
      PROFILES_API_KEY = process.env.BAMBORA_PROFILES_API_KEY || ""

      // Validate production credentials
      if (!MERCHANT_ID || !PAYMENT_API_KEY || !PROFILES_API_KEY) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing Bambora production credentials in environment variables",
            missing: {
              merchantId: !MERCHANT_ID,
              paymentApiKey: !PAYMENT_API_KEY,
              profilesApiKey: !PROFILES_API_KEY,
            },
          },
          { status: 500 },
        )
      }
    }

    const environment = useSandbox ? "SANDBOX" : "PRODUCTION"

    console.log(`[v0] Using ${environment} mode with Merchant ID: ${MERCHANT_ID}`)

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

    const serviceAddress = contractData?.serviceAddress || billingData.address.trim()

    const sendReceiptToWordPress = async (paymentData: any) => {
      const wpSiteUrl = process.env.WORDPRESS_SITE_URL
      const receiptSecret = process.env.KODIAK_RECEIPT_SECRET

      console.log("[v0] Receipt function called with:", { wpSiteUrl, receiptSecret: receiptSecret ? "SET" : "MISSING" })

      if (!wpSiteUrl || !receiptSecret) {
        console.log("[v0] WordPress receipt not configured - skipping receipt")
        return
      }

      try {
        const receiptPayload = {
          transaction_id: paymentData.transactionId,
          amount: Number.parseFloat(formattedAmount),
          payment_method: isRecurring ? "Credit Card (Installment)" : "Credit Card (Complete)",
          payment_type: isRecurring ? "installment" : "singular",
          customer_name: billingData.cardholder_name.trim(),
          customer_email: normalizeEmail(billingData.email),
          service_address: serviceAddress,
          current_payment: 1,
          total_payments: isRecurring ? installments || 1 : 1,
          future_dates:
            isRecurring && installments > 1
              ? Array.from({ length: installments - 1 }, (_, i) => {
                  const d = new Date()
                  d.setMonth(d.getMonth() + i + 1)
                  return yyyy_mm_dd(d)
                })
              : [],
          contract_id: contractData?.contractId || "",
          season: "2024-2025",
          is_platinum: renewalState?.platinumService || false, // Use customer's upgrade choice from step 1, not existing contract status
        }

        const receiptUrl = `${wpSiteUrl.replace(/\/+$/, "")}/wp-json/kodiak/v1/create-receipt`

        console.log("[v0] Sending receipt to WordPress:", { receiptUrl, receiptPayload })

        const response = await fetch(receiptUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Kodiak-Secret": receiptSecret,
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
          console.error("[v0] WordPress receipt failed:", response.status, responseText)
        }
      } catch (error) {
        console.error("[v0] Failed to send receipt to WordPress:", error)
      }
    }

    const sendPaymentToCRM = async (paymentData: any) => {
      try {
        const contractId = contractData?.contractId
        if (!contractId) {
          console.log("[v0] No contract ID available - skipping CRM integration")
          return
        }

        let scheduleNote = ""
        if (!isRecurring) {
          scheduleNote = "Payment 1 of 1 - Balance paid in full"
        } else {
          const totalInstallments = Math.max(1, Number(installments || 1))
          if (totalInstallments === 1) {
            scheduleNote = "Payment 1 of 1 - Balance paid in full"
          } else {
            // Generate future payment dates for note
            const futureDates = []
            const startDate = new Date()
            for (let i = 1; i < totalInstallments; i++) {
              const d = new Date(startDate)
              d.setMonth(startDate.getMonth() + i)
              futureDates.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }))
            }
            scheduleNote = `Payment 1 of ${totalInstallments}. Remaining payments scheduled for ${futureDates.join(", ")}`
          }
        }

        const crmPayload = {
          contractId,
          amount: formattedAmount,
          cardLastFour: paymentData.cardLastFour || "",
          note: scheduleNote, // Added schedule note
        }

        console.log("[v0] Sending payment to CRM:", crmPayload)

        const response = await fetch(`${req.nextUrl.origin}/api/crm/add-payment`, {
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

    // One-time payment (no installments)
    if (!isRecurring) {
      const paymentData = {
        amount: Number.parseFloat(formattedAmount),
        payment_method: "token",
        token: { code: token, name: billingData.cardholder_name.trim(), complete: true },
        recurring_payment: false,
        comments: `Payment 1 of 1 for ${serviceAddress}`,
        custom: {
          ref1: `Payment 1 of 1 for ${serviceAddress}`,
          ref2: `Single-Payment-${serviceAddress.replace(/\s+/g, "-")}`,
          ref3: "KODIAK-SINGLE",
        },
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

      await Promise.all([
        sendReceiptToWordPress({ transactionId: result.id }),
        sendPaymentToCRM({ cardLastFour: result.card?.last_four }),
      ])

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
        token: { code: token, name: billingData.cardholder_name.trim(), complete: true },
        recurring_payment: true,
        comments: `Payment 1 of ${totalInstallments} for ${serviceAddress}`,
        custom: {
          ref1: `Payment 1 of ${totalInstallments} for ${serviceAddress}`,
          ref2: `Installment-1of${totalInstallments}-${serviceAddress.replace(/\s+/g, "-")}`,
          ref3: "KODIAK-INSTALLMENT",
        },
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

      await Promise.all([
        sendReceiptToWordPress({ transactionId: firstJson.id }),
        sendPaymentToCRM({ cardLastFour: firstJson.card?.last_four }),
      ])

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
      comments: `Payment 1 of ${totalInstallments} for ${serviceAddress}`,
      custom: {
        ref1: `Payment 1 of ${totalInstallments} for ${serviceAddress}`,
        ref2: `Profile-1of${totalInstallments}-${serviceAddress.replace(/\s+/g, "-")}`,
        ref3: "KODIAK-PROFILE",
      },
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

    console.log("[v0] About to process first installment payment")
    const firstResp = await fetch("https://api.na.bambora.com/v1/payments", {
      method: "POST",
      headers: { Authorization: paymentAuthHeader, "Content-Type": "application/json" },
      body: JSON.stringify(firstPurchase),
    })
    const firstJson = await firstResp.json()
    if (!firstResp.ok || !isApprovedFlag(firstJson.approved)) {
      console.log("[v0] First installment payment failed:", firstJson)
      return NextResponse.json(
        { success: false, error: firstJson.message || "First payment failed", details: firstJson },
        { status: 400 },
      )
    }

    console.log("[v0] First installment payment successful, calling receipt function")
    await Promise.all([
      sendReceiptToWordPress({ transactionId: firstJson.id }),
      sendPaymentToCRM({ cardLastFour: firstJson.card?.last_four }),
    ])
    console.log("[v0] Receipt function completed")

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
