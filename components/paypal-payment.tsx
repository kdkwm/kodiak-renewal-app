"use client"

import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface PayPalPaymentProps {
  contractData: any
  renewalState: any
  paymentAmount: number
  onPaymentComplete?: () => void
  onBack?: () => void
}

export function PayPalPayment({
  contractData,
  renewalState,
  paymentAmount,
  onPaymentComplete,
  onBack,
}: PayPalPaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [useHostedFields] = useState(false) // Set to false to use simple PayPal redirect

  const handlePayPalPayment = () => {
    setIsProcessing(true)

    // Calculate payment details
    const platinumUpgrade =
      !contractData.isPlatinum && renewalState?.platinumService ? (contractData.isWalkway ? 250 : 150) : 0
    const subtotal = contractData.contractSubtotal + platinumUpgrade
    const tax = Math.round(subtotal * 0.13 * 100) / 100
    const isInstallments = (renewalState?.selectedPayments || 1) > 1

    // Create PayPal form
    const form = document.createElement("form")
    form.action = "https://www.paypal.com/cgi-bin/webscr"
    form.method = "post"
    form.target = "_blank" // Open in new tab
    form.style.display = "none"

    const fields: Record<string, string> = {
      cmd: isInstallments ? "_xclick-subscriptions" : "_xclick",
      business: "info@kodiaksnow.ca",
      currency_code: "CAD",
      item_name: `Snow Removal Service 2025-2026 - ${contractData.address}`,
      invoice: contractData.contractId, // Very important - use contractId as invoice
      quantity: "1",
      return: `${window.location.origin}/payment-complete`,
      cancel_return: `${window.location.origin}/payment-cancelled`,
      notify_url: `${window.location.origin}/api/paypal/ipn`, // For payment notifications
    }

    if (isInstallments) {
      // Subscription fields for installments
      fields.a3 = paymentAmount.toFixed(2) // Recurring amount
      fields.p3 = "1" // Period (1 month)
      fields.t3 = "M" // Time unit (Month)
      fields.src = "1" // Recurring payments
      fields.srt = (renewalState?.selectedPayments || 1).toString() // Number of payments
      fields.no_note = "1"
      fields.no_shipping = "1"
    } else {
      // One-time payment fields
      fields.amount = subtotal.toFixed(2)
      fields.tax = tax.toFixed(2)
    }

    // Create form inputs
    for (const [name, value] of Object.entries(fields)) {
      const input = document.createElement("input")
      input.type = "hidden"
      input.name = name
      input.value = value
      form.appendChild(input)
    }

    document.body.appendChild(form)
    form.submit()
    document.body.removeChild(form)

    // Reset processing state after a delay
    setTimeout(() => {
      setIsProcessing(false)
    }, 2000)

    // Note: We can't automatically detect payment completion with this method
    // The user will need to manually confirm or we'll need to implement IPN handling
  }

  const handleHostedFieldsSuccess = () => {
    console.log("[v0] PayPal Hosted Fields payment successful")
    onPaymentComplete?.()
  }

  const handleHostedFieldsError = (error: string) => {
    console.error("[v0] PayPal Hosted Fields error:", error)
    alert(`Payment failed: ${error}`)
  }

  // Fallback to simple PayPal redirect
  return (
    <div>
      <div className="mb-6 flex justify-center">
        <Button size="lg" variant="outline" onClick={onBack} className="bg-white h-12">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-sm font-bold">PP</span>
            </div>
            PayPal Payment
          </CardTitle>
          <CardDescription>
            {(renewalState?.selectedPayments || 1) > 1
              ? `${renewalState.selectedPayments} installments of $${paymentAmount.toFixed(2)} CAD each`
              : `One-time payment of $${paymentAmount.toFixed(2)} CAD`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Payment Summary</h3>
            <div className="space-y-2 text-sm text-blue-700">
              <div className="flex justify-between">
                <span>Service Address:</span>
                <span className="font-medium">{contractData.address}</span>
              </div>
              <div className="flex justify-between">
                <span>Contract ID:</span>
                <span className="font-medium font-mono">{contractData.contractId}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Amount:</span>
                <span className="font-medium">${paymentAmount.toFixed(2)} CAD</span>
              </div>
              {(renewalState?.selectedPayments || 1) > 1 && (
                <div className="flex justify-between">
                  <span>Payment Plan:</span>
                  <span className="font-medium">{renewalState.selectedPayments} monthly installments</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-slate-700">How it works:</h3>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  1
                </div>
                <p>Click "Pay with PayPal" to open PayPal in a new tab</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  2
                </div>
                <p>You can pay with your PayPal account or use a debit/credit card (no PayPal account required)</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  3
                </div>
                <p>Complete your payment on PayPal's secure site</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  4
                </div>
                <p>You'll be redirected back here after payment completion</p>
              </div>
            </div>
          </div>

          <Button
            onClick={handlePayPalPayment}
            disabled={isProcessing}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Opening PayPal...
              </>
            ) : (
              "Pay with PayPal"
            )}
          </Button>

          <div className="text-center text-sm text-slate-500">
            <div className="flex items-center justify-center gap-2">
              <span>🔒</span>
              <span>Secure payments processed by PayPal</span>
            </div>
            <div className="text-xs mt-1">No PayPal account required - you can pay with any debit or credit card</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
