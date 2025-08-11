import { NextResponse } from "next/server"

function baseUrl(): string {
  const base = process.env.WP_KODIAK_QUEUE_ENDPOINT || ""
  return base.replace(/\/+$/, "") // trim trailing slash
}

export async function POST(req: Request) {
  try {
    const { post_id } = (await req.json().catch(() => ({}))) as { post_id?: number | string }
    const pid = Number(post_id)
    if (!pid || !Number.isFinite(pid) || pid <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid or missing post_id" }, { status: 400 })
    }

    const wpBase = baseUrl()
    const secret = process.env.WP_KODIAK_SHARED_SECRET
    if (!wpBase || !secret) {
      return NextResponse.json(
        { ok: false, error: "Server is missing WP_KODIAK_QUEUE_ENDPOINT or WP_KODIAK_SHARED_SECRET" },
        { status: 500 },
      )
    }

    const url = `${wpBase}/retry-payment`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-kodiak-secret": secret,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ post_id: pid }),
      cache: "no-store",
    })

    const text = await res.text()
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }

    if (!res.ok || data?.ok === false) {
      return NextResponse.json(
        { ok: false, status: res.status, error: data?.error || `HTTP ${res.status}`, result: data },
        { status: 200 },
      )
    }

    return NextResponse.json({ ok: true, status: res.status, result: data }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 })
  }
}
