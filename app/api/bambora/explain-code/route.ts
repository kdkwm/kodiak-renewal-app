import { NextResponse } from "next/server"
import { explainAvs, explainBankCode, explainCvd } from "@/lib/bambora-codes"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    // Accept either a raw Bambora response or a minimal payload
    const bankCode =
      body?.bank_response_code ??
      body?.code ??
      body?.bank_code ??
      (typeof body?.last_error === "string" && (body.last_error.match(/\b(\d{2})\b/)?.[1] || null))
    const avs = body?.avs_result ?? body?.avs ?? body?.billing?.avs_result
    const cvd = body?.cvd_result ?? body?.cvd ?? body?.card?.cvd_result

    const bank = explainBankCode(bankCode || undefined)
    const avsInfo = explainAvs(avs)
    const cvdInfo = explainCvd(cvd)

    // Suggested resolution priority
    const steps: string[] = []
    if (bank.code === "05") steps.push("Ask the customer to contact their bank or use a different card.")
    if (bank.code === "51") steps.push("Suggest a different card or retry after adding funds.")
    if (bank.code === "54") steps.push("Update the card expiry or use a different card.")
    if (bank.code === "14") steps.push("Re-enter the card number carefully or use another card.")
    if (["N"].includes((cvd || "").toUpperCase())) steps.push("CVV mismatch: re-collect CVV and retry.")
    if (["N", "A", "Z"].includes((avs || "").toUpperCase()))
      steps.push("Verify billing address and postal/ZIP match the statement.")

    if (steps.length === 0) {
      steps.push("Retry later once; if it repeats, contact the acquirer with the bank code.")
    }

    return NextResponse.json({
      ok: true,
      input: { bank_response_code: bankCode || null, avs: avs || null, cvd: cvd || null },
      explanation: {
        bank,
        avs: { code: avs || "", ...avsInfo },
        cvd: { code: cvd || "", ...cvdInfo },
      },
      recommendedSteps: steps,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to explain code" }, { status: 400 })
  }
}
