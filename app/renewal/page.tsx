"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { BamboraPayment } from "@/components/bambora-payment"

export default function RenewalPage() {
  // Demo defaults; replace with your values or state machine
  const baseAmount = 103.58
  const [installments, setInstallments] = useState<number>(3)
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const perInstallment = Math.round((baseAmount / installments) * 100) / 100

  return (
    <main className="mx-auto max-w-3xl p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Renewal Options</CardTitle>
          <CardDescription>Choose how you’d like to split your renewal amount.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3, 4].map((n) => {
              const amt = Math.round((baseAmount / n) * 100) / 100
              return (
                <button
                  key={n}
                  onClick={() => setInstallments(n)}
                  className={`rounded border p-4 text-left hover:border-slate-400 ${
                    installments === n ? "border-slate-900" : "border-slate-200"
                  }`}
                >
                  <div className="font-medium">{n} installment{n > 1 ? "s" : ""}</div>
                  <div className="text-sm text-slate-600">${amt.toFixed(2)} today{n > 1 ? `, then ${n - 1} monthly` : ""}</div>
                </button>
              )
            })}
          </div>
          <div className="mt-3 text-sm text-slate-700">
            Lowest possible split: 4 installments. Today’s charge will be ${perInstallment.toFixed(2)}.
          </div>
        </CardContent>
      </Card>

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Payment success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Payment failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pay with Card</CardTitle>
          <CardDescription>
            First payment is charged immediately. Then we {installments > 1 ? "queue and schedule" : "complete"} the rest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BamboraPayment
            amount={perInstallment}
            isRecurring={installments > 1}
            contractData={{ contractId: "DEMO-123", company: "Kodiak", serviceAddress: "123 Main St" }}
            installments={installments}
            onSuccess={() => {
              setSuccess(
                installments > 1
                  ? `Charged $${perInstallment.toFixed(2)} and queued the remaining ${installments - 1} payments.`
                  : `Charged $${perInstallment.toFixed(2)} successfully.`,
              )
              setError(null)
            }}
            onError={(e) => {
              setError(e || "Payment failed")
              setSuccess(null)
            }}
            processing={processing}
            setProcessing={setProcessing}
          />
        </CardContent>
      </Card>
    </main>
  )
}
