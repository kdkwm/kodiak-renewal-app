import { NextResponse } from "next/server"

function getAuthHeader() {
  const passcode = process.env.BAMBORA_PASSCODE // should be like "Passcode <base64(merchant_id:api_key)>"
  if (passcode) return { Authorization: passcode }
  // Optional fallback if you store pieces separately:
  const mid = process.env.BAMBORA_MERCHANT_ID
  const key = process.env.BAMBORA_PAYMENT_API_KEY
  if (mid && key) {
    const token = Buffer.from(`${mid}:${key}`).toString("base64")
    return { Authorization: `Passcode ${token}` }
  }
  return null
}

export async function POST(req: Request) {
  try {
    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing transaction id" }, { status: 400 })
    }
    const headers = getAuthHeader()
    if (!headers) {
      return NextResponse.json(
        { ok: false, error: "Missing BAMBORA_PASSCODE or merchant credentials" },
        { status: 500 },
      )
    }

    const url = `https://api.na.bambora.com/v1/payments/${encodeURIComponent(String(id))}`
    const res = await fetch(url, { headers, cache: "no-store" })
    const text = await res.text()
    let json: any = null
    try {
      json = JSON.parse(text)
    } catch {
      json = { _raw: text }
    }

    return NextResponse.json({ ok: res.ok, status: res.status, body: json })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Lookup failed" }, { status: 500 })
  }
}
