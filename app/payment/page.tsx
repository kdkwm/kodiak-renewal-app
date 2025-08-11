"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { BamboraPayment } from "../../components/bambora-payment"
import { ETransferModal } from "../../components/etransfer-modal"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, Mail } from "lucide-react"

export default function PaymentPage() {
  const searchParams = useSearchParams()
  const [contractData, setContractData] = useState<any>(null)
  const [renewalState, setRenewalState] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [method, setMethod] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const contractDataStr = searchParams.get("contractData")
      const renewalStateStr = searchParams.get("renewalState")
      const paymentAmountStr = searchParams.get("paymentAmount")
      const methodStr = searchParams.get("method")

      if (contractDataStr && renewalStateStr && paymentAmountStr && methodStr) {
        setContractData(JSON.parse(contractDataStr))
        setRenewalState(JSON.parse(renewalStateStr))
        setPaymentAmount(Number.parseFloat(paymentAmountStr))
        setMethod(methodStr)
      }
    } catch (error) {
      console.error("Error parsing payment data:", error)
    }
    setLoading(false)
  }, [searchParams])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading payment form...</p>
        </div>
      </div>
    )
  }

  if (!contractData || !renewalState || !method) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-6">
        <div className="max-w-xl mx-auto bg-white border rounded-lg shadow p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Payment Error</h2>
          <p className="text-slate-600">Invalid payment data. Please try again.</p>
        </div>
      </div>
    )
  }

  const handlePaymentSuccess = () => {
    alert("Payment successful! You can close this tab.")
    window.close()
  }

  const handlePaymentError = (error: string) => {
    alert(`Payment failed: ${error}`)
  }

  const handleETransferClose = () => {
    window.close()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Kodiak Snow Removal</h1>
          <p className="text-slate-600">Complete Your Payment</p>
        </div>

        {method === "credit" ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-500" />
                Secure Credit Card Payment
              </CardTitle>
              <CardDescription>Complete your contract renewal payment</CardDescription>
            </CardHeader>
            <CardContent>
              <BamboraPayment
                amount={paymentAmount}
                isRecurring={renewalState.selectedPayments > 1}
                installments={renewalState.selectedPayments}
                contractData={contractData}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                processing={false}
                setProcessing={() => {}}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-500" />
                  Interac e-Transfer Payment
                </CardTitle>
                <CardDescription>Follow the instructions to complete your payment</CardDescription>
              </CardHeader>
            </Card>
            <ETransferModal
              contractData={contractData}
              renewalState={renewalState}
              paymentAmount={paymentAmount}
              onClose={handleETransferClose}
            />
          </div>
        )}
      </div>
    </div>
  )
}
