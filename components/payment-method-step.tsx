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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-6 flex justify-center">
            <Button size="lg" variant="outline" onClick={onPrev} className="bg-white h-12">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <BamboraPayment
            contractData={contractData}
            renewalState={renewalState}
            paymentAmount={paymentAmount}
            onPaymentComplete={onPaymentComplete}
            onBack={onPrev}
          />
        </div>
      </div>
    )
  }

  if (renewalState.selectedPaymentMethod === "etransfer") {
    const companyEmail = contractData.company === "KSB" ? "info@kodiaksnow.ca" : "info@kodiaksnowremoval.ca"
    const isInstallments = (renewalState?.selectedPayments || 1) > 1

    const getPaymentDates = () => {
      const dates = []
      const today = new Date()

      for (let i = 0; i < (renewalState?.selectedPayments || 1); i++) {
        if (i === 0) {
          dates.push("Today")
        } else {
          const futureDate = new Date(today)
          futureDate.setMonth(today.getMonth() + i)
          dates.push(
            futureDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
          )
        }
      }
      return dates
    }

    const paymentDates = getPaymentDates()

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-6 flex justify-center">
            <Button size="lg" variant="outline" onClick={onPrev} className="bg-white h-12">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Mail className="w-6 h-6 text-blue-600" />
                <CardTitle className="text-2xl">Interac e-Transfer Payment</CardTitle>
              </div>
              <CardDescription>Follow these steps to complete your payment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-4">One-Time Payment</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                        1
                      </div>
                      <p className="text-sm">Log in to your online banking (via website or app).</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                        2
                      </div>
                      <p className="text-sm">Go to the Interac e-Transfer or Send Money section.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                        3
                      </div>
                      <p className="text-sm">Select Send an e-Transfer.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                        4
                      </div>
                      <p className="text-sm">
                        Enter the recipient email: <span className="font-mono text-blue-600">{companyEmail}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-2 h-6 px-2 text-xs bg-transparent"
                          onClick={() => {
                            navigator.clipboard.writeText(companyEmail)
                          }}
                        >
                          Copy email
                        </Button>
                        .
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                        5
                      </div>
                      <p className="text-sm">
                        Enter the payment amount and <strong>add your name/address in the message</strong> so we can
                        match it to your account.
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                        6
                      </div>
                      <p className="text-sm">Review the details and click Send.</p>
                    </div>
                  </div>
                </div>

                {isInstallments && (
                  <div className="border-t pt-6">
                    <h3 className="font-semibold text-lg mb-4">How to make your installment payments</h3>
                    <p className="text-sm italic mb-4">(Follow the One-Time Payment steps above for each payment.)</p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                          1
                        </div>
                        <p className="text-sm">Make your first payment now.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                          2
                        </div>
                        <p className="text-sm">
                          On the agreed dates, log in each month to send the next payment manually.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                          3
                        </div>
                        <p className="text-sm">Payment Schedule:</p>
                      </div>
                      <div className="ml-9 bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="space-y-2">
                          {paymentDates.slice(1).map((date, i) => (
                            <div key={i} className="flex justify-between items-center py-1">
                              <span className="font-medium text-slate-700">
                                {i === 0 ? "2nd" : i === 1 ? "3rd" : `${i + 2}th`} Payment:
                              </span>
                              <div className="text-right">
                                <div className="font-semibold text-green-600">${paymentAmount.toFixed(2)}</div>
                                <div className="text-xs text-slate-500">{date}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                          4
                        </div>
                        <p className="text-sm">
                          Ensure each payment is sent to <span className="font-mono text-blue-600">{companyEmail}</span>{" "}
                          with your name/address in the message.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <Button size="lg" onClick={onPaymentComplete} className="w-full bg-blue-600 hover:bg-blue-700 h-12">
                  I've sent the eTransfer
                </Button>
                {isInstallments && (
                  <Button size="lg" variant="outline" className="w-full bg-transparent h-12">
                    Remind me about future payments
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
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
