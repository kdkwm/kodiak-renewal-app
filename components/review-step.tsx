"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, FileCheck, CreditCard, Mail } from "lucide-react"

interface ReviewStepProps {
  contractData: any
  renewalState: any
  setRenewalState: any
  onNext: () => void
  onPrev: () => void
}

export function ReviewStep({ contractData, renewalState, setRenewalState, onNext, onPrev }: ReviewStepProps) {
  const platinumUpgrade =
    !contractData.isPlatinum && renewalState?.platinumService ? (contractData.isWalkway ? 250 : 150) : 0
  const subtotal = contractData.contractSubtotal + platinumUpgrade
  const hst = Math.round(subtotal * 0.13 * 100) / 100
  const total = Math.round((subtotal + hst) * 100) / 100
  const paymentAmount = Math.round((total / (renewalState?.selectedPayments || 1)) * 100) / 100

  const handlePaymentMethodChoice = (method: "etransfer" | "credit") => {
    setRenewalState((prev: any) => ({ ...prev, selectedPaymentMethod: method }))
    onNext()
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <FileCheck className="w-6 h-6 text-purple-600" />
          <CardTitle className="text-2xl">Review Contract</CardTitle>
        </div>
        <CardDescription>Please review your contract details before proceeding</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contract Summary */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Service Address:</span>
            <span className="font-medium">{contractData.serviceAddress}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-600">Service Level:</span>
            <div className="text-right">
              {contractData.isPlatinum || renewalState?.platinumService ? (
                <Badge className="bg-yellow-500">Platinum Service</Badge>
              ) : (
                <Badge variant="secondary">Standard Service</Badge>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-600">Payment Schedule:</span>
            <span className="font-medium">
              {(renewalState?.selectedPayments || 1) === 1
                ? "Pay in Full"
                : `${renewalState?.selectedPayments || 1} Monthly Payments`}
            </span>
          </div>
        </div>

        <Separator />

        {/* Cost Breakdown */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${contractData.contractSubtotal.toFixed(2)}</span>
          </div>

          {platinumUpgrade > 0 && (
            <div className="flex justify-between">
              <span>Platinum Upgrade</span>
              <span>${platinumUpgrade.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>HST (13%)</span>
            <span>${hst.toFixed(2)}</span>
          </div>

          <Separator />

          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span className="text-green-600">${total.toFixed(2)}</span>
          </div>

          {(renewalState?.selectedPayments || 1) > 1 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-blue-800">Due Today (1st Payment):</span>
                <span className="font-bold text-blue-800 text-lg">${paymentAmount.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold text-lg text-center">Choose Payment Method</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* eTransfer Option */}
            <button
              type="button"
              className="w-full p-6 h-auto rounded-lg border-2 text-left transition hover:bg-blue-50 border-slate-200"
              onClick={() => handlePaymentMethodChoice("etransfer")}
            >
              <div className="flex items-start gap-3">
                <Mail className="w-6 h-6 text-blue-600 mt-1" />
                <div>
                  <div className="font-semibold text-lg text-blue-700">Interac e-Transfer</div>
                  <div className="text-blue-700/80 text-sm">Send payment via email transfer</div>
                  {(renewalState?.selectedPayments || 1) > 1 && (
                    <div className="text-xs text-amber-600 mt-2 font-medium">
                      Manual payments required for each installment
                    </div>
                  )}
                </div>
              </div>
            </button>

            {/* Credit Card Option */}
            <button
              type="button"
              className="w-full p-6 h-auto rounded-lg border-2 text-left transition hover:bg-green-50 border-slate-200"
              onClick={() => handlePaymentMethodChoice("credit")}
            >
              <div className="flex items-start gap-3">
                <CreditCard className="w-6 h-6 text-green-600 mt-1" />
                <div>
                  <div className="font-semibold text-lg text-green-700">Credit Card</div>
                  <div className="text-green-700/80 text-sm">Pay securely with your credit card</div>
                  {(renewalState?.selectedPayments || 1) > 1 && (
                    <div className="text-xs text-green-600 mt-2 font-medium">Automatic recurring payments</div>
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* Payment Processor Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-600">
              {contractData.company === "KSR" ? (
                <>
                  Secure payments processed by <strong>Bambora</strong>
                </>
              ) : (
                <>
                  Secure payments processed by <strong>PayPal</strong>
                </>
              )}
            </p>
            <p className="text-xs text-slate-500 mt-1">Your payment information is encrypted and secure</p>
          </div>
        </div>

        {/* Navigation - larger buttons */}
        <div className="flex justify-between pt-4 gap-3">
          <Button size="lg" variant="outline" onClick={onPrev} className="min-w-[140px] bg-transparent">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
