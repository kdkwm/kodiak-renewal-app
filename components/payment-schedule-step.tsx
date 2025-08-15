"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ArrowLeft, CreditCard, Mail } from "lucide-react"
import { useState, useRef, useEffect } from "react"

interface PaymentScheduleStepProps {
  contractData: any
  renewalState: any
  setRenewalState: any
  onNext: () => void
  onPrev: () => void
  showBackButton?: boolean
  onPaymentComplete?: () => void
}

export function PaymentScheduleStep({
  contractData,
  renewalState,
  setRenewalState,
  onNext,
  onPrev,
  showBackButton = true,
  onPaymentComplete,
}: PaymentScheduleStepProps) {
  const platinumUpgrade =
    !contractData.isPlatinum && renewalState?.platinumService ? (contractData.isWalkway ? 250 : 150) : 0
  const subtotal = contractData.contractSubtotal + platinumUpgrade
  const total = Math.round(subtotal * 1.13 * 100) / 100

  const [mainChoice, setMainChoice] = useState<"full" | "installments" | null>(null)
  const [showInstallments, setShowInstallments] = useState(false)
  const [showPaymentMethods, setShowPaymentMethods] = useState(false)
  const installmentSectionRef = useRef<HTMLDivElement>(null)
  const paymentMethodRef = useRef<HTMLDivElement>(null)

  const isKSB = contractData.company === "KSB"

  const selectMain = (type: "full" | "installments") => {
    setMainChoice(type)
    setRenewalState((prev: any) => ({ ...prev, selectedPaymentMethod: null }))

    if (type === "full") {
      setRenewalState((prev: any) => ({ ...prev, selectedPayments: 1 }))
      setShowInstallments(false)
      setShowPaymentMethods(true) // Show payment methods immediately for full payment
    } else {
      setShowInstallments(true)
      setShowPaymentMethods(false) // Don't show payment methods until installment count is selected
    }
  }

  // Auto-scroll to installment section when it becomes visible
  useEffect(() => {
    if (showInstallments && installmentSectionRef.current) {
      setTimeout(() => {
        installmentSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }, 120)
    }
  }, [showInstallments])

  useEffect(() => {
    if (showPaymentMethods && paymentMethodRef.current) {
      setTimeout(() => {
        paymentMethodRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }, 200)
    }
  }, [showPaymentMethods])

  const handleInstallmentChoice = (payments: number) => {
    setRenewalState((prev: any) => ({ ...prev, selectedPayments: payments }))
    setShowPaymentMethods(true) // Show payment methods only after installment count is selected
  }

  const handlePaymentMethodSelect = (method: string) => {
    setRenewalState((prev: any) => ({ ...prev, selectedPaymentMethod: method }))
    onNext() // Advance to payment step
  }

  const generatePaymentSchedule = (numPayments: number) => {
    const paymentAmount = Math.round((total / numPayments) * 100) / 100
    const schedule = []
    const today = new Date()
    for (let i = 0; i < numPayments; i++) {
      const paymentDate = new Date(today)
      paymentDate.setDate(today.getDate() + i * 30)
      schedule.push({
        number: i + 1,
        date: paymentDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        amount: paymentAmount,
      })
    }
    return schedule
  }

  const lowestMonthlyPayment = Math.round((total / 4) * 100) / 100

  return (
    <div className="space-y-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Calendar className="w-6 h-6 text-emerald-500" />
            <CardTitle className="text-2xl">Payment Schedule</CardTitle>
          </div>
          <CardDescription>Select your preferred payment option</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Payment Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              className={`w-full p-6 h-auto rounded-lg border-2 text-left transition ${
                mainChoice === "full"
                  ? "border-blue-500 bg-blue-50 text-blue-800"
                  : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              }`}
              onClick={() => selectMain("full")}
            >
              <div className="w-full">
                <div className="font-semibold text-lg mb-1">Pay in Full</div>
                <div className="text-sm opacity-75">Complete payment today</div>
              </div>
            </button>

            <button
              type="button"
              className={`w-full p-6 h-auto rounded-lg border-2 text-left transition ${
                mainChoice === "installments"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-800 hover:bg-emerald-50 hover:border-emerald-300"
              }`}
              onClick={() => selectMain("installments")}
            >
              <div className="w-full">
                <div className="font-semibold text-lg">Split into Installments</div>
                <div className="text-sm opacity-75 whitespace-normal">
                  Make monthly payments as low as ${lowestMonthlyPayment.toFixed(2)}
                </div>
              </div>
            </button>
          </div>

          {/* Installment Options */}
          {showInstallments && (
            <div ref={installmentSectionRef} className="space-y-4 border-t pt-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Payment Schedule
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[2, 3, 4].map((numPayments) => {
                  const paymentAmount = Math.round((total / numPayments) * 100) / 100
                  const isSelected =
                    (renewalState?.selectedPayments || 1) === numPayments && mainChoice === "installments"
                  return (
                    <button
                      key={numPayments}
                      type="button"
                      className={`p-5 h-auto rounded-lg border-2 transition flex flex-col items-center ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                          : "border-slate-200 bg-white text-slate-800 hover:bg-emerald-50 hover:border-emerald-300"
                      }`}
                      onClick={() => handleInstallmentChoice(numPayments)}
                    >
                      <div
                        className={`font-bold text-2xl mb-1 ${isSelected ? "text-emerald-600" : "text-emerald-500"}`}
                      >
                        {numPayments}
                      </div>
                      <div className="text-sm opacity-75 mb-2">payments</div>
                      <div className="font-semibold text-lg">${paymentAmount.toFixed(2)}</div>
                      <div className="text-xs opacity-60">per month</div>
                    </button>
                  )
                })}
              </div>

              {/* Payment Schedule Preview */}
              {(renewalState?.selectedPayments || 1) > 1 && mainChoice === "installments" && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-700 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Payment Schedule
                  </h3>
                  <div className="space-y-2">
                    {generatePaymentSchedule(renewalState?.selectedPayments || 1).map((payment: any) => (
                      <div key={payment.number} className="flex justify-between items-center text-sm">
                        <span className="text-amber-600">
                          Payment {payment.number} - {payment.date}
                        </span>
                        <span className="text-amber-700 font-medium">${payment.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-amber-600 mt-3 text-center">
                    Credit card payments will be processed automatically on scheduled dates
                  </p>
                </div>
              )}
            </div>
          )}

          {showPaymentMethods && (
            <div ref={paymentMethodRef} className="border-t pt-6">
              <Card className="bg-slate-50">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-lg">Choose Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* eTransfer Option */}
                    <button
                      type="button"
                      className="w-full p-6 h-auto rounded-lg border-2 border-slate-200 bg-white text-slate-800 hover:bg-blue-50 hover:border-blue-300 transition text-left"
                      onClick={() => handlePaymentMethodSelect("etransfer")}
                    >
                      <div className="flex items-center gap-3">
                        <Mail className="w-6 h-6 text-blue-600" />
                        <div>
                          <div className="font-semibold text-lg text-blue-700">Interac e-Transfer</div>
                          <div className="text-blue-700/80 text-sm">Send payment via email transfer</div>
                        </div>
                      </div>
                    </button>

                    {/* Credit Card or PayPal Option */}
                    {isKSB ? (
                      <button
                        type="button"
                        className="w-full p-6 h-auto rounded-lg border-2 border-slate-200 bg-white text-slate-800 hover:bg-blue-50 hover:border-blue-300 transition text-left"
                        onClick={() => handlePaymentMethodSelect("paypal")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-blue-600 text-white rounded text-xs font-bold flex items-center justify-center">
                            PP
                          </div>
                          <div>
                            <div className="font-semibold text-lg text-blue-700">PayPal</div>
                            <div className="text-blue-700/80 text-sm">Pay securely with PayPal</div>
                          </div>
                        </div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="w-full p-6 h-auto rounded-lg border-2 border-slate-200 bg-white text-slate-800 hover:bg-green-50 hover:border-green-300 transition text-left"
                        onClick={() => handlePaymentMethodSelect("credit")}
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-6 h-6 text-green-600" />
                          <div>
                            <div className="font-semibold text-lg text-green-700">Credit Card</div>
                            <div className="text-green-700/80 text-sm">Pay securely with your credit card</div>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>

                  <div className="text-center mt-4 text-xs text-slate-500">
                    Secure payments processed by {isKSB ? "PayPal" : "Bambora"}
                    <br />
                    Your payment information is encrypted and secure
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            {showBackButton ? (
              <Button size="lg" variant="outline" onClick={onPrev} className="hover:bg-slate-50 bg-transparent">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
