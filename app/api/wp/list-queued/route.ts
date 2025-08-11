import { NextResponse } from "next/server"

type StatusFilter = "pending" | "completed" | "failed" | "all"

type WPItem = {
  id?: number | string
  title?: string
  amount?: string | number
  currency?: string
  payment_date?: string
  customer_code?: string
  card_id?: number | string
  status?: string
  last_error?: string
  meta?: Record<string, any>
  [key: string]: any
}

function trim(u?: string) {
  return String(u || "")
    .trim()
    .replace(/\/+$/, "")
}
function join(base: string, path: string) {
  const b = trim(base)
  const p = String(path || "").replace(/^\/+/, "")
  return `${b}/${p}`
}
function ensureQuery(url: string, key: string, value: string) {
  try {
    const u = new URL(url)
    if (!u.searchParams.has(key)) u.searchParams.set(key, value)
    return u.toString()
  } catch {
    return url.includes("?")
      ? `${url}&${key}=${encodeURIComponent(value)}`
      : `${url}?${key}=${encodeURIComponent(value)}`
  }
}
function normalizeList(input: any): WPItem[] {
  if (Array.isArray(input)) return input
  if (Array.isArray(input?.items)) return input.items
  if (Array.isArray(input?.data)) return input.data
  return []
}
function toNum(n: any): number | undefined {
  const v = Number(n)
  return Number.isFinite(v) ? v : undefined
}
function normalizeRow(raw: WPItem) {
  const meta = raw?.meta || {}
  const id = toNum(raw.id ?? meta.id)
  const amount = raw.amount ?? meta.amount
  const currency = raw.currency ?? meta.currency ?? "CAD"
  const payment_date = String(raw.payment_date ?? meta.payment_date ?? "")
  const customer_code = String(raw.customer_code ?? meta.customer_code ?? "")
  const card_id = toNum(raw.card_id ?? meta.card_id)
  const status = String(raw.status ?? meta.status ?? "pending")
  const last_error = String(raw.last_error ?? meta.last_error ?? "")
  const title = String(raw.title ?? meta.title ?? "")
  return { id, title, amount, currency, payment_date, customer_code, card_id, status, last_error, raw }
}

async function getJson(target: string, secret: string) {
  const res = await fetch(target, {
    headers: { "x-kodiak-secret": secret, Accept: "application/json" },
    cache: "no-store",
  })
  const text = await res.text()
  let body: any = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { _raw: text }
  }
  return { res, body }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const status = (url.searchParams.get("status") || "pending").toLowerCase() as StatusFilter
    const limitParam = url.searchParams.get("limit")
    const limit = Math.max(1, Math.min(200, Number(limitParam || 100)))

    const explicitList = trim(process.env.WP_KODIAK_LIST_ENDPOINT || "")
    const base = trim(process.env.WP_KODIAK_QUEUE_ENDPOINT || "")
    const secret = process.env.WP_KODIAK_SHARED_SECRET || ""

    if (!secret) {
      return NextResponse.json({ ok: false, error: "WP shared secret not configured" }, { status: 400 })
    }
    if (!explicitList && !base) {
      return NextResponse.json({ ok: false, error: "WP endpoints not configured" }, { status: 400 })
    }

    const tried: Array<{ url: string; status?: number; ok?: boolean }> = []
    let items: WPItem[] = []

    // Build candidate URLs depending on requested status
    const candidates: string[] = []
    if (status === "pending") {
      // Prefer a pending-optimized endpoint
      if (explicitList) {
        const a = ensureQuery(explicitList, "limit", String(limit))
        candidates.push(ensureQuery(a, "status", "pending"))
      }
      if (base) candidates.push(join(base, `list-queued?limit=${encodeURIComponent(String(limit))}`))
      // Fallback to generic payments with pending filter
      if (base) candidates.push(join(base, `payments?status=pending&limit=${encodeURIComponent(String(limit))}`))
    } else {
      const s = status === "all" ? "all" : status
      if (explicitList) {
        // If an explicit list endpoint is provided and isn't already /payments,
        // normalize to /payments for non-pending filters
        const paymentsLike = explicitList.includes("/payments")
          ? explicitList
          : explicitList.replace(/\/[^/]+$/, "/payments")
        candidates.push(ensureQuery(ensureQuery(paymentsLike, "status", s), "limit", String(limit)))
      }
      if (base)
        candidates.push(
          join(base, `payments?status=${encodeURIComponent(s)}&limit=${encodeURIComponent(String(limit))}`),
        )
    }

    // As a final hard-coded fallback (safety net), try the canonical plugin path if base is unknown.
    if (candidates.length === 0 && base) {
      const s = status === "pending" ? "pending" : status === "all" ? "all" : status
      candidates.push(join(base, `payments?status=${encodeURIComponent(s)}&limit=${encodeURIComponent(String(limit))}`))
    }

    // Try each candidate until success
    for (const c of candidates) {
      const { res, body } = await getJson(c, secret)
      tried.push({ url: c, status: res.status, ok: res.ok })
      if (!res.ok) {
        // try next on 404; on other errors stop and report
        if (res.status === 404) continue
        return NextResponse.json({ ok: false, error: `WP HTTP ${res.status}`, tried, body }, { status: 502 })
      }
      items = normalizeList(body).map(normalizeRow)
      return NextResponse.json({ ok: true, items, status, tried })
    }

    // If all failed or nothing configured, return empty with diagnostics
    return NextResponse.json({ ok: true, items: [], status, tried })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Failed to fetch list" }, { status: 500 })
  }
}
