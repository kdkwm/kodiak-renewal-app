"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CreditCard, Shield, CheckCircle } from "lucide-react"
import { BamboraPayment } from "./bambora-payment"
import { PayPalPayment } from "./paypal-payment"

interface CreditCardModalProps {
  contractData: any
  renewalState: any
  paymentAmount: number
  onClose: () => void
  onPaymentComplete: () => void
}

export function CreditCardModal({
  contractData,
  renewalState,
  paymentAmount,
  onClose,
  onPaymentComplete,
}: CreditCardModalProps) {
  const [processing, setProcessing] = useState(false)
  const [paymentComplete, setPaymentComplete] = useState(false)

  // Calculate installment info from renewalState
  const isRecurring = renewalState?.selectedPayments > 1
  const installments = renewalState?.selectedPayments || 1
  const amount = paymentAmount || 0

  const handlePaymentSuccess = () => {
    setPaymentComplete(true)
    // Call the parent completion handler instead of auto-closing
    onPaymentComplete()
  }

  const handlePaymentError = (error: string) => {
    alert(`Payment failed: ${error}`)
    setProcessing(false)
  }

  // If payment is complete, show success screen
  if (paymentComplete) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-green-700 mb-2">Payment Successful!</h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 w-full">
              <h3 className="font-semibold text-green-800 mb-2">Contract Details</h3>
              <div className="text-sm text-green-700 space-y-1">
                <p>
                  <strong>Service Address:</strong> {contractData?.serviceAddress}
                </p>
                <p>
                  <strong>Contract ID:</strong> {contractData?.contractId}
                </p>
                <p>
                  <strong>Company:</strong> {contractData?.company}
                </p>
                <p>
                  <strong>Service Level:</strong> {contractData?.isPlatinum ? "Platinum" : "Standard"}
                </p>
                {contractData?.isWalkway && (
                  <p>
                    <strong>Walkway Service:</strong> Included
                  </p>
                )}
              </div>
            </div>
            {isRecurring && installments > 1 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 w-full">
                <h3 className="font-semibold text-blue-800 mb-2">Payment Schedule</h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>
                    <strong>Total Installments:</strong> {installments}
                  </p>
                  <p>
                    <strong>Amount per Payment:</strong> ${amount.toFixed(2)}
                  </p>
                  <p>
                    <strong>Next Payment:</strong>{" "}
                    {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-green-500" />
            Secure Payment
          </DialogTitle>
          <DialogDescription>Complete your contract renewal payment</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Summary */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Payment Summary</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-medium">${amount.toFixed(2)}</span>
              </div>
              {isRecurring && installments > 1 && (
                <>
                  <div className="flex justify-between">
                    <span>Payment Type:</span>
                    <span className="font-medium">{installments} Installments</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Future Payments:</span>
                    <span className="font-medium">{installments - 1} monthly payments</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {contractData.company === "KSR" ? (
            // Bambora Payment Form for KSR
            <BamboraPayment
              amount={amount}
              isRecurring={isRecurring}
              installments={installments}
              contractData={contractData}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              processing={processing}
              setProcessing={setProcessing}
            />
          ) : (
            // PayPal Payment for KSB
            <PayPalPayment
              amount={amount}
              isRecurring={isRecurring}
              contractData={contractData}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              processing={processing}
              setProcessing={setProcessing}
            />
          )}

          {/* Security Notice */}
          <div className="flex items-center gap-2 text-sm text-slate-600 justify-center">
            <Shield className="w-4 h-4" />
            <span>Secured by {contractData.company === "KSR" ? "Bambora" : "PayPal"}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
