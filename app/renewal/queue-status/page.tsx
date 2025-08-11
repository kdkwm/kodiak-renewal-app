"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, RefreshCcw, Play, Server } from 'lucide-react'

type QueueItem = {
  id: number
  title?: string
  payment_date: string
  amount: string
  currency?: string
  status: string
}

export default function QueueStatusPage() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const r = await fetch("/api/wp/list-queued", { cache: "no-store" })
      const j = await r.json()
      if (j?.ok) {
        setItems(j.items || [])
      } else {
        setError(j?.error || "Failed to load queue")
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load queue")
    } finally {
      setLoading(false)
    }
  }

  const processNow = async () => {
    setProcessing(true)
    setError(null)
    setMessage(null)
    try {
      const r = await fetch("/api/wp/process-due", { method: "POST" })
      const j = await r.json()
      if (j?.ok) {
        setMessage(`Processed due payments. Completed: ${j.completed ?? 0}, Failed: ${j.failed ?? 0}`)
        await load()
      } else {
        setError(j?.error || "Processing failed")
      }
    } catch (e: any) {
      setError(e?.message || "Processing failed")
    } finally {
      setProcessing(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Scheduled Installments (WordPress Queue)</CardTitle>
            <CardDescription>View pending payments and run the processor manually.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={loading || processing}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
            <Button onClick={processNow} disabled={processing || loading}>
              {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Process Due Now
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Title</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No pending payments found.
                    </td>
                  </tr>
                )}
                {items.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="py-2 pr-4">{it.id}</td>
                    <td className="py-2 pr-4">{it.payment_date}</td>
                    <td className="py-2 pr-4">
                      {it.currency || "CAD"} {parseFloat(it.amount).toFixed(2)}
                    </td>
                    <td className="py-2 pr-4">{it.status}</td>
                    <td className="py-2 pr-4">{it.title || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <Server className="h-3.5 w-3.5" />
            Data is fetched from your WordPress site via secure REST endpoints with shared secret.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
