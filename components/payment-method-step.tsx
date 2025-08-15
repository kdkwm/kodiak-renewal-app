"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Mail } from "lucide-react"
import { BamboraPayment } from "./bambora-payment"
import dynamic from "next/dynamic"
import { useState, useEffect } from "react"

const PayPalPayment = dynamic(() => import("./paypal-payment").then((mod) => ({ default: mod.PayPalPayment })), {
  ssr: false,
  loading: () => (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading PayPal payment form...</p>
        </div>
      </CardContent>
    </Card>
  ),
})

interface PaymentMethodStepProps {
  contractData: any
  renewalState: any
  setRenewalState: any
  onPrev: () => void
  onPaymentComplete: () => void
}

interface PaymentMethodSectionProps {
  contractData: any
  renewalState: any
  setRenewalState: any
  onPaymentComplete?: () => void
  onBack?: () => void
}

export function PaymentMethodSection({
  contractData,
  renewalState,
  setRenewalState,
  onPaymentComplete,
  onBack,
}: PaymentMethodSectionProps) {
  const platinumUpgrade =
    !contractData.isPlatinum && renewalState?.platinumService ? (contractData.isWalkway ? 250 : 150) : 0
  const subtotal = contractData.contractSubtotal + platinumUpgrade
  const hst = Math.round(subtotal * 0.13 * 100) / 100
  const total = Math.round((subtotal + hst) * 100) / 100
  const paymentAmount = Math.round((total / (renewalState?.selectedPayments || 1)) * 100) / 100

  const [emailCopied, setEmailCopied] = useState(false)
  const isKSB = contractData.company === "KSB"

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }, 50)
  }

  useEffect(() => {
    if (
      renewalState.selectedPaymentMethod === "credit" ||
      renewalState.selectedPaymentMethod === "etransfer" ||
      renewalState.selectedPaymentMethod === "paypal"
    ) {
      scrollToTop()
    }
  }, [renewalState.selectedPaymentMethod])

  if (!renewalState.selectedPaymentMethod) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Choose Payment Method</CardTitle>
          <CardDescription>Select how you'd like to pay for your renewal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              className="p-6 border-2 border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left"
              onClick={() => setRenewalState((prev: any) => ({ ...prev, selectedPaymentMethod: "etransfer" }))}
            >
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-6 h-6 text-blue-600" />
                <div className="font-semibold text-lg text-blue-700">Interac e-Transfer</div>
              </div>
              <div className="text-blue-700/80 text-sm">Send payment via email transfer</div>
            </button>

            {isKSB ? (
              <button
                className="p-6 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 text-left bg-blue-25"
                onClick={() => {
                  setRenewalState((prev: any) => ({ ...prev, selectedPaymentMethod: "paypal" }))
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-white text-sm font-bold">PayPal</span>
                  </div>
                  <div className="font-semibold text-lg text-blue-700">PayPal Payment</div>
                </div>
                <div className="text-blue-700/80 text-sm">Pay securely with your PayPal account</div>
              </button>
            ) : (
              <button
                className="p-6 border-2 border-slate-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all duration-200 text-left"
                onClick={() => {
                  setRenewalState((prev: any) => ({ ...prev, selectedPaymentMethod: "credit" }))
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">💳</span>
                  </div>
                  <div className="font-semibold text-lg text-green-700">Credit Card</div>
                </div>
                <div className="text-green-700/80 text-sm">Pay securely with your credit card</div>
              </button>
            )}
          </div>

          <div className="text-center text-sm text-slate-600 pt-4">
            <div className="flex items-center justify-center gap-2">
              <span>🔒</span>
              <span>Secure payments processed by {isKSB ? "PayPal" : "Bambora"}</span>
            </div>
            <div className="text-xs mt-1">Your payment information is encrypted and secure</div>
          </div>

          {onBack && (
            <div className="flex justify-center pt-4">
              <Button size="lg" variant="outline" onClick={onBack} className="bg-transparent">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Payment Schedule
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (renewalState.selectedPaymentMethod === "paypal" && isKSB) {
    return (
      <div>
        <div className="mb-6 flex justify-center">
          <Button size="lg" variant="outline" onClick={onBack} className="bg-white h-12">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <PayPalPayment
          contractData={contractData}
          renewalState={renewalState}
          paymentAmount={paymentAmount}
          onPaymentComplete={onPaymentComplete}
          onBack={onBack}
        />
      </div>
    )
  }

  if (renewalState.selectedPaymentMethod === "credit") {
    return (
      <div>
        <div className="mb-6 flex justify-center">
          <Button size="lg" variant="outline" onClick={onBack} className="bg-white h-12">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <BamboraPayment
          contractData={contractData}
          renewalState={renewalState}
          paymentAmount={paymentAmount}
          onPaymentComplete={onPaymentComplete}
          onBack={onBack}
        />
      </div>
    )
  }

  // eTransfer instructions
  const companyEmail = contractData.company === "KSB" ? "info@kodiaksnow.ca" : "info@kodiaksnowremoval.ca"
  const isInstallments = (renewalState?.selectedPayments || 1) > 1

  const getPaymentDates = () => {
    const dates = []
    const today = new Date()

    for (let i = 1; i < (renewalState?.selectedPayments || 1); i++) {
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
    return dates
  }

  const paymentDates = getPaymentDates()

  const copyEmail = () => {
    navigator.clipboard.writeText(companyEmail)
    setEmailCopied(true)
    setTimeout(() => setEmailCopied(false), 2000)
  }

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
          <div className="flex items-center justify-center gap-2 mb-2">
            <Mail className="w-6 h-6 text-blue-600" />
            <CardTitle className="text-2xl">Interac e-Transfer Payment</CardTitle>
          </div>
          <CardDescription>Follow these steps to complete your payment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-8">
            <div>
              <h3 className="font-semibold text-lg mb-6">One-Time Payment</h3>
              <div className="space-y-4">
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
                  <div className="text-sm">
                    <p className="mb-2">
                      Enter the recipient email: <span className="font-mono text-blue-600">{companyEmail}</span>.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs bg-transparent w-full sm:w-auto"
                      onClick={copyEmail}
                    >
                      {emailCopied ? "Copied!" : "Copy email"}
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    5
                  </div>
                  <p className="text-sm">
                    Enter the payment amount and <strong>add your name/address in the message</strong> so we can match
                    it to your account.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    6
                  </div>
                  <p className="text-sm">Review the details and click Send.</p>
                </div>
              </div>

              {isInstallments && (
                <div className="border-t pt-8">
                  <h3 className="font-semibold text-lg mb-6">How to make your installment payments</h3>
                  <p className="text-sm italic mb-6">(Follow the One-Time Payment steps above for each payment.)</p>
                  <div className="space-y-4">
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
                        {paymentDates.map((date, i) => (
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function PaymentMethodStep({
  contractData,
  renewalState,
  setRenewalState,
  onPrev,
  onPaymentComplete,
}: PaymentMethodStepProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6 flex justify-center">
          <Button size="lg" variant="outline" onClick={onPrev} className="bg-white h-12">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <PaymentMethodSection
          contractData={contractData}
          renewalState={renewalState}
          setRenewalState={setRenewalState}
          onPaymentComplete={onPaymentComplete}
          onBack={onPrev}
        />
      </div>
    </div>
  )
}
