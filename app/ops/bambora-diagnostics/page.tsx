"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

type ExplainResponse = {
  ok: boolean
  input?: { bank_response_code: string | null; avs: string | null; cvd: string | null }
  explanation?: {
    bank: { code: string; meaning: string; cardholderMessage: string; merchantAction: string }
    avs: { code: string; meaning: string; action: string }
    cvd: { code: string; meaning: string; action: string }
  }
  recommendedSteps?: string[]
  error?: string
}

type LookupResponse = { ok: boolean; status: number; body: any; error?: string }

export default function BamboraDiagnosticsPage() {
  const [jsonText, setJsonText] = useState("")
  const [code, setCode] = useState("")
  const [avs, setAvs] = useState("")
  const [cvd, setCvd] = useState("")
  const [txnId, setTxnId] = useState("")
  const [explain, setExplain] = useState<ExplainResponse | null>(null)
  const [lookup, setLookup] = useState<LookupResponse | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function tryParse() {
    try {
      const obj = JSON.parse(jsonText)
      const inferredCode =
        obj?.bank_response_code ??
        obj?.code ??
        (typeof obj?.message === "string" && (obj.message.match(/\b(\d{2})\b/)?.[1] || "")) ??
        ""
      const inferredAvs = obj?.avs_result ?? obj?.avs ?? obj?.billing?.avs_result ?? ""
      const inferredCvd = obj?.cvd_result ?? obj?.cvd ?? obj?.card?.cvd_result ?? ""
      if (inferredCode) setCode(String(inferredCode))
      if (inferredAvs) setAvs(String(inferredAvs))
      if (inferredCvd) setCvd(String(inferredCvd))
      return obj
    } catch {
      return null
    }
  }

  const onExplain = async () => {
    setErr(null)
    setExplain(null)
    setLoading(true)
    try {
      let payload: any = {}
      const parsed = tryParse()
      if (parsed) payload = parsed
      if (code) payload.bank_response_code = code
      if (avs) payload.avs_result = avs
      if (cvd) payload.cvd_result = cvd

      const res = await fetch("/api/bambora/explain-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await res.json()) as ExplainResponse
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setExplain(data)
    } catch (e: any) {
      setErr(e?.message || "Failed to explain")
    } finally {
      setLoading(false)
    }
  }

  const onLookup = async () => {
    setErr(null)
    setLookup(null)
    setLoading(true)
    try {
      const res = await fetch("/api/bambora/payment-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: txnId }),
      })
      const data = (await res.json()) as LookupResponse
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setLookup(data)
    } catch (e: any) {
      setErr(e?.message || "Lookup failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Bambora Diagnostics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="json">Paste failed Bambora JSON (optional)</Label>
              <Textarea
                id="json"
                placeholder='{"bank_response_code":"05","avs_result":"N","cvd_result":"N","message":"Do not honor"}'
                rows={10}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
              />
              <div className="flex gap-3">
                <Button type="button" onClick={onExplain} disabled={loading}>
                  {loading ? "Analyzing..." : "Analyze"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setJsonText("")
                    setCode("")
                    setAvs("")
                    setCvd("")
                    setExplain(null)
                    setLookup(null)
                    setErr(null)
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Or enter codes manually</Label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="code" className="text-xs">
                    Bank code
                  </Label>
                  <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 05" />
                </div>
                <div>
                  <Label htmlFor="avs" className="text-xs">
                    AVS
                  </Label>
                  <Input id="avs" value={avs} onChange={(e) => setAvs(e.target.value)} placeholder="e.g. N" />
                </div>
                <div>
                  <Label htmlFor="cvd" className="text-xs">
                    CVD
                  </Label>
                  <Input id="cvd" value={cvd} onChange={(e) => setCvd(e.target.value)} placeholder="e.g. N" />
                </div>
              </div>
              <Button type="button" onClick={onExplain} disabled={loading}>
                {loading ? "Analyzing..." : "Analyze codes"}
              </Button>

              <div className="pt-4 space-y-2">
                <Label htmlFor="txn" className="text-xs">
                  Lookup by transactionId (optional)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="txn"
                    value={txnId}
                    onChange={(e) => setTxnId(e.target.value)}
                    placeholder="Bambora transaction ID"
                  />
                  <Button type="button" variant="outline" onClick={onLookup} disabled={loading || !txnId}>
                    {loading ? "Looking up..." : "Lookup"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {err && (
            <Alert variant="destructive">
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          )}

          {explain && (
            <div className="rounded-md border p-4 space-y-2">
              <div className="font-medium">Explanation</div>
              <div className="text-sm">
                Bank code {explain.explanation?.bank.code || "(none)"} — {explain.explanation?.bank.meaning}
              </div>
              <div className="text-sm text-muted-foreground">
                Cardholder: {explain.explanation?.bank.cardholderMessage}
              </div>
              <div className="text-sm">Merchant action: {explain.explanation?.bank.merchantAction}</div>
              <div className="text-sm">
                AVS: {explain.explanation?.avs.code} — {explain.explanation?.avs.meaning} (
                {explain.explanation?.avs.action})
              </div>
              <div className="text-sm">
                CVD: {explain.explanation?.cvd.code} — {explain.explanation?.cvd.meaning} (
                {explain.explanation?.cvd.action})
              </div>
              {explain.recommendedSteps && explain.recommendedSteps.length > 0 && (
                <ul className="list-disc pl-5 text-sm">
                  {explain.recommendedSteps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {lookup && (
            <div className="rounded-md border p-4 space-y-2">
              <div className="font-medium">Payment lookup result</div>
              <div className="text-sm">HTTP Status: {lookup.status}</div>
              <pre className="text-xs overflow-auto whitespace-pre-wrap bg-muted/30 p-2 rounded">
                {JSON.stringify(lookup.body, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
