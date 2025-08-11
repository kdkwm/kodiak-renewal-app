import { NextResponse } from "next/server"

function mask(s?: string) {
  const v = String(s || "")
  if (!v) return ""
  return `${v.slice(0, 3)}***${v.slice(-3)}`
}

export async function GET() {
  const queue = process.env.WP_KODIAK_QUEUE_ENDPOINT || ""
  const list = process.env.WP_KODIAK_LIST_ENDPOINT || ""
  const processDue = process.env.WP_KODIAK_PROCESS_ENDPOINT || ""
  const secret = process.env.WP_KODIAK_SHARED_SECRET || ""
  const bambora = {
    merchant: process.env.BAMBORA_MERCHANT_ID ? "set" : "missing",
    paymentKey: process.env.BAMBORA_PAYMENT_API_KEY ? "set" : "missing",
    profilesKey: process.env.BAMBORA_PROFILES_API_KEY ? "set" : "missing",
  }
  return NextResponse.json({
    ok: true,
    endpoints: { queue, list, processDue },
    hasSecret: Boolean(secret),
    secretPreview: mask(secret),
    bambora,
  })
}
