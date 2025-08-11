"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type StatusFilter = "pending" | "completed" | "failed" | "all"

type QueueItem = {
  id: number
  title?: string
  amount?: string | number
  currency?: string
  payment_date?: string
  customer_code?: string
  card_id?: number
  status?: string
  last_error?: string
  raw?: any
}

function fmtAmount(a: string | number | undefined, ccy?: string) {
  if (a === undefined) return "-"
  const n = typeof a === "string" ? Number(a) : a
  if (!Number.isFinite(n)) return String(a)
  return `${n.toFixed(2)}${ccy ? ` ${ccy}` : ""}`
}

export default function QueueStatusPage() {
  const [status, setStatus] = useState<StatusFilter>("pending")
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<QueueItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [rowBusy, setRowBusy] = useState<Record<number, boolean>>({})

  const canRetry = useCallback((it: QueueItem) => {
    const s = (it.status || "").toLowerCase()
    return s === "failed" || s === "pending"
  }, [])

  const setBusy = useCallback((id: number, b: boolean) => {
    setRowBusy((prev) => ({ ...prev, [id]: b }))
  }, [])

  const load = useCallback(
    async (s: StatusFilter = status) => {
      setLoading(true)
      setError(null)
      setNote(null)
      try {
        const res = await fetch(`/api/wp/list-queued?status=${encodeURIComponent(s)}`, { cache: "no-store" })
        const data = await res.json()
        if (!res.ok || data?.ok === false) throw new Error(data?.error || `HTTP ${res.status}`)
        const arr: QueueItem[] = Array.isArray(data?.items) ? data.items : []
        // Normalize id type and ensure number
        const normalized = arr.map((it) => ({ ...it, id: Number(it.id) || 0 })).filter((it) => it.id > 0)
        setItems(normalized)
        setNote(`Loaded ${normalized.length} ${s} payments`)
      } catch (e: any) {
        setError(e?.message || "Failed to load queue")
        setItems([])
      } finally {
        setLoading(false)
      }
    },
    [status],
  )

  const processDue = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNote(null)
    try {
      const res = await fetch("/api/wp/process-due", { method: "POST" })
      const data = await res.json()
      if (!res.ok || data?.ok === false) throw new Error(data?.error || `HTTP ${res.status}`)
      setNote("Triggered processing of due payments.")
      await load(status)
    } catch (e: any) {
      setError(e?.message || "Failed to process due payments")
    } finally {
      setLoading(false)
    }
  }, [load, status])

  const retryOne = useCallback(
    async (postId: number) => {
      setBusy(postId, true)
      setError(null)
      setNote(null)
      try {
        const res = await fetch("/api/wp/retry-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ post_id: postId }),
        })
        const data = await res.json()
        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error || `HTTP ${res.status}`)
        }
        const result = data?.result
        const approved =
          !!result?.approved || (typeof result?.approved === "string" && result.approved === "1") || false
        setNote(
          approved
            ? `Retried payment #${postId} successfully. Txn ID: ${result?.id ?? "-"}`
            : `Retry attempted for #${postId}. See status and error details below.`,
        )
        await load(status)
      } catch (e: any) {
        setError(e?.message || `Retry failed for #${postId}`)
      } finally {
        setBusy(postId, false)
      }
    },
    [load, setBusy, status],
  )

  useEffect(() => {
    load(status)
  }, [status, load])

  const hasItems = useMemo(() => items.length > 0, [items])

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Queue Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => load(status)} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </Button>

            <Button onClick={processDue} variant="outline" disabled={loading}>
              {loading ? "Processing..." : "Process due now"}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {note && !error && (
            <Alert>
              <AlertDescription>{note}</AlertDescription>
            </Alert>
          )}

          <div className="border rounded-md overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">Payment Date</th>
                  <th className="text-left px-3 py-2">Amount</th>
                  <th className="text-left px-3 py-2">Customer Code</th>
                  <th className="text-left px-3 py-2">Card ID</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Error</th>
                  <th className="text-left px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!hasItems ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                      No items.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => {
                    const busy = !!rowBusy[it.id]
                    const retryEnabled = canRetry(it) && !busy && !loading
                    const wpAdminLink = `/wp-admin/post.php?post=${it.id}&action=edit`
                    return (
                      <tr key={it.id} className="border-t">
                        <td className="px-3 py-2">{idx + 1}</td>
                        <td className="px-3 py-2">{String(it.payment_date || "-")}</td>
                        <td className="px-3 py-2">{fmtAmount(it.amount, it.currency)}</td>
                        <td className="px-3 py-2">{String(it.customer_code || "-")}</td>
                        <td className="px-3 py-2">{String(it.card_id ?? "-")}</td>
                        <td className="px-3 py-2">{String(it.status || "-")}</td>
                        <td className="px-3 py-2 max-w-[360px] truncate" title={it.last_error || ""}>
                          {it.last_error || ""}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              disabled={!retryEnabled}
                              onClick={() => retryOne(it.id)}
                              title={retryEnabled ? "Retry this payment" : "Retry available for failed/pending only"}
                            >
                              {busy ? "Retrying..." : "Retry"}
                            </Button>
                            <a
                              href={wpAdminLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-xs self-center"
                              title="Open in WordPress Admin"
                            >
                              View in WP
                            </a>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
