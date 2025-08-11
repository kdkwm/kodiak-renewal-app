"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type QueuedItem = {
  id: number
  amount: string
  currency: string
  payment_date: string
  customer_code: string
  card_id: number
  status: "pending" | "completed" | "failed"
  contract_id?: string
  customer_name?: string
  customer_email?: string
  customer_phone?: string
}

export default function QueueStatusPanel() {
  const [items, setItems] = useState<QueuedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(status: string = "pending") {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/wp/list-queued?status=${encodeURIComponent(status)}`, { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to load queue")
      setItems(json.items || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load queue")
    } finally {
      setLoading(false)
    }
  }

  async function processDueNow() {
    setProcessing(true)
    setError(null)
    try {
      const res = await fetch("/api/wp/process-due", { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to process due payments")
      await load("pending")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process")
    } finally {
      setProcessing(false)
    }
  }

  useEffect(() => {
    load("pending")
  }, [])

  return (
    <Card>
      <CardHeader className="flex items-center justify-between space-y-0">
        <CardTitle className="w-full flex items-center justify-between">
          <span>WordPress Queue</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => load("pending")} disabled={loading || processing}>
              Refresh
            </Button>
            <Button size="sm" onClick={processDueNow} disabled={processing || loading}>
              {processing ? "Processing..." : "Process Due Now"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Card</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No queued payments found.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-mono">{it.id}</TableCell>
                    <TableCell>{new Date(it.payment_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {it.amount} {it.currency}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate">
                      {it.customer_name || it.customer_code}
                      <div className="text-xs text-muted-foreground truncate">{it.customer_email}</div>
                    </TableCell>
                    <TableCell>#{it.card_id}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          it.status === "completed" ? "default" : it.status === "failed" ? "destructive" : "secondary"
                        }
                      >
                        {it.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Tip: To test end-to-end now, edit one queued item’s payment_date in WordPress to today, click “Process Due Now”,
          and confirm a new transaction appears in Bambora.
        </p>
      </CardContent>
    </Card>
  )
}
