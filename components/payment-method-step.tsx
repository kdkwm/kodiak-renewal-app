"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard, ArrowLeft, Mail } from "lucide-react"
import { BamboraPayment } from "./bambora-payment"

interface PaymentMethodStepProps {
  contractData: any
  renewalState: any
  setRenewalState: any
  onPrev: () => void
  onPaymentComplete: () => void
}

export function PaymentMethodStep({
  contractData,
  renewalState,
  setRenewalState,
  onPrev,
  onPaymentComplete,
}: PaymentMethodStepProps) {
  const platinumUpgrade =
    !contractData.isPlatinum && renewalState?.platinumService ? (contractData.isWalkway ? 250 : 150) : 0
  const subtotal = contractData.contractSubtotal + platinumUpgrade
  const hst = Math.round(subtotal * 0.13 * 100) / 100
  const total = Math.round((subtotal + hst) * 100) / 100
  const paymentAmount = Math.round((total / (renewalState?.selectedPayments || 1)) * 100) / 100

  if (renewalState.selectedPaymentMethod === "credit") {
    return (
      <BamboraPayment
        contractData={contractData}
        renewalState={renewalState}
        paymentAmount={paymentAmount}
        onPaymentComplete={onPaymentComplete}
        onBack={onPrev}
      />
    )
  }

  if (renewalState.selectedPaymentMethod === "etransfer") {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Mail className="w-6 h-6 text-blue-600" />
            <CardTitle className="text-2xl">Interac e-Transfer Payment</CardTitle>
          </div>
          <CardDescription>Send your payment via Interac e-Transfer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-800 mb-4">Payment Instructions</h3>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-blue-200">
                <span className="font-medium text-blue-700">Amount:</span>
                <span className="font-bold text-blue-800 text-lg">${paymentAmount.toFixed(2)}</span>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="font-medium text-blue-700">Send to:</span>
                  <p className="text-blue-800 font-mono">payments@kodiaksnow.ca</p>
                </div>

                <div>
                  <span className="font-medium text-blue-700">Security Question:</span>
                  <p className="text-blue-800">What is the service address?</p>
                </div>

                <div>
                  <span className="font-medium text-blue-700">Security Answer:</span>
                  <p className="text-blue-800 font-mono">{contractData.serviceAddress}</p>
                </div>

                <div>
                  <span className="font-medium text-blue-700">Message/Reference:</span>
                  <p className="text-blue-800 font-mono">Winter 2025/2026 Renewal</p>
                </div>
              </div>
            </div>
          </div>

          {(renewalState?.selectedPayments || 1) > 1 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-800 mb-2">Installment Payment Schedule</h4>
              <p className="text-amber-700 text-sm">
                You have selected {renewalState?.selectedPayments || 1} payments of ${paymentAmount.toFixed(2)} each.
                Please send the first payment now, and we will contact you for subsequent payments.
              </p>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h4 className="font-semibold text-slate-700 mb-2">Important Notes</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Please ensure the security question and answer match exactly</li>
              <li>• Include the reference message for faster processing</li>
              <li>• Your contract will be activated once payment is received</li>
              <li>• You will receive a confirmation email within 24 hours</li>
            </ul>
          </div>

          <div className="flex justify-between pt-4 gap-3">
            <Button size="lg" variant="outline" onClick={onPrev} className="min-w-[140px] bg-transparent">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button size="lg" onClick={onPaymentComplete} className="min-w-[140px] bg-blue-600 hover:bg-blue-700">
              Complete Renewal
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // This shouldn't happen, but fallback to payment method selection
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <CreditCard className="w-6 h-6 text-orange-600" />
          <CardTitle className="text-2xl">Payment Method</CardTitle>
        </div>
        <CardDescription>Complete your payment to finalize the contract</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            className="w-full p-6 h-auto rounded-lg border-2 text-left transition hover:bg-blue-50 border-slate-200"
            onClick={() => setRenewalState((prev: any) => ({ ...prev, selectedPaymentMethod: "etransfer" }))}
          >
            <div className="flex items-start gap-3">
              <Mail className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <div className="font-semibold text-lg text-blue-700">Interac e-Transfer</div>
                <div className="text-blue-700/80 text-sm">Send payment via email transfer</div>
              </div>
            </div>
          </button>

          <button
            type="button"
            className="w-full p-6 h-auto rounded-lg border-2 text-left transition hover:bg-green-50 border-slate-200"
            onClick={() => setRenewalState((prev: any) => ({ ...prev, selectedPaymentMethod: "credit" }))}
          >
            <div className="flex items-start gap-3">
              <CreditCard className="w-6 h-6 text-green-600 mt-1" />
              <div>
                <div className="font-semibold text-lg text-green-700">Credit Card</div>
                <div className="text-green-700/80 text-sm">Pay securely with your credit card</div>
              </div>
            </div>
          </button>
        </div>

        <div className="flex justify-start pt-4">
          <Button size="lg" variant="outline" onClick={onPrev}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Review
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
