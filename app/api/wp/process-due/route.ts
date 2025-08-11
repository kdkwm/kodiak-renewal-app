import { NextResponse } from "next/server"

export async function POST() {
  try {
    const endpoint = process.env.WP_KODIAK_PROCESS_ENDPOINT || ""
    const secret = process.env.WP_KODIAK_SHARED_SECRET || ""
    if (!endpoint || !secret) {
      return NextResponse.json({ ok: false, error: "WP process endpoint or secret not configured" }, { status: 400 })
    }
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "x-kodiak-secret": secret, Accept: "application/json" },
    })
    const text = await res.text()
    let json: any = null
    try { json = JSON.parse(text) } catch {}

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: json?.error || text?.slice(0, 300) || `WP HTTP ${res.status}` }, { status: 502 })
    }

    return NextResponse.json({ ok: true, result: json || text })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Failed to process due" }, { status: 500 })
  }
}
