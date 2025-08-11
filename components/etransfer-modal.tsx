"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Copy, CheckCircle } from "lucide-react"
import { Mail } from "lucide-react" // Declared the Mail variable

interface ETransferModalProps {
  contractData: any
  renewalState: any
  paymentAmount: number
  onClose: () => void
}

export function ETransferModal({ contractData, renewalState, paymentAmount, onClose }: ETransferModalProps) {
  const [emailCopied, setEmailCopied] = useState(false)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)

  const companyEmail = contractData.company === "KSB" ? "info@kodiaksnow.ca" : "info@kodiaksnowremoval.ca"

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(companyEmail)
      setEmailCopied(true)
      setTimeout(() => setEmailCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy email:", err)
    }
  }

  const confirmPayment = () => {
    setPaymentConfirmed(true)
    // Here you would typically send confirmation to your backend
    setTimeout(() => {
      alert("Thank you! We will process your eTransfer payment and send you a confirmation email once received.")
      onClose()
    }, 1500)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-500" />
            eTransfer Payment Instructions
          </DialogTitle>
          <DialogDescription>Follow these steps to complete your payment</DialogDescription>
        </DialogHeader>

        {!paymentConfirmed ? (
          <div className="space-y-4">
            {/* Instructions */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  1
                </div>
                <p className="text-sm">Log into your online banking or mobile banking app</p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  2
                </div>
                <p className="text-sm">Select "Send Money" or "Interac e-Transfer"</p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  3
                </div>
                <p className="text-sm">Enter the recipient email address:</p>
              </div>
            </div>

            {/* Email Copy Section */}
            <div className="bg-slate-50 border rounded-lg p-3 flex items-center justify-between">
              <code className="text-sm font-mono">{companyEmail}</code>
              <Button size="sm" variant={emailCopied ? "default" : "outline"} onClick={copyEmail} className="ml-2">
                {emailCopied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            {/* Payment Details */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  4
                </div>
                <p className="text-sm">
                  Enter the payment amount: <strong>${paymentAmount.toFixed(2)}</strong>
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  5
                </div>
                <p className="text-sm">
                  In the message field, include your contract ID: <strong>{contractData.contractId}</strong>
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  6
                </div>
                <p className="text-sm">Send the eTransfer</p>
              </div>
            </div>

            {/* Important Note */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Please include your contract ID in the message to ensure proper processing
                of your payment.
              </p>
            </div>

            {/* Confirm Button */}
            <Button onClick={confirmPayment} className="w-full">
              I've Sent the eTransfer
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-700 mb-2">Payment Confirmed!</h3>
            <p className="text-sm text-slate-600">
              We'll process your eTransfer and send you a confirmation email once received.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
