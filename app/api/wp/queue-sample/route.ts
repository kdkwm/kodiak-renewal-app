import { NextResponse } from "next/server"

function toYMD(d: Date) { return d.toISOString().slice(0, 10) }

export async function POST() {
  try {
    const endpoint = process.env.WP_KODIAK_QUEUE_ENDPOINT || ""
    const secret = process.env.WP_KODIAK_SHARED_SECRET || ""
    if (!endpoint || !secret) {
      return NextResponse.json({ ok: false, error: "WP queue endpoint or secret not configured" }, { status: 400 })
    }

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const payload = {
      amount: "25.00",
      currency: "CAD",
      payment_date: toYMD(tomorrow),
      customer_code: "DUMMY", // sample entry; plugin should accept and store
      card_id: 1,
      recurring_payment: true,
      metadata: { source: "queue-sample", notes: "Sample queued from /ops/queue" },
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-kodiak-secret": secret, Accept: "application/json" },
      body: JSON.stringify(payload),
    })
    const text = await res.text()
    let json: any = null
    try { json = JSON.parse(text) } catch {}

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: json?.error || text?.slice(0, 300) || `WP HTTP ${res.status}` }, { status: 502 })
    }

    return NextResponse.json({ ok: true, result: json || text })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Failed to queue sample" }, { status: 500 })
  }
}
