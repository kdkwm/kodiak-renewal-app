"use client"
import { useState, useEffect } from "react"
import { Loader2, ArrowLeft } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface PayPalPaymentProps {
  contractData: any
  renewalState: any
  paymentAmount: number
  onPaymentComplete?: () => void
  onBack?: () => void
}

declare global {
  interface Window {
    paypal?: any
  }
}

export function PayPalPayment({
  contractData,
  renewalState,
  paymentAmount,
  onPaymentComplete,
  onBack,
}: PayPalPaymentProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const script = document.createElement("script")
    script.src = `https://www.paypal.com/sdk/js?client-id=AV0TyYPKe1QH6uYUKMdNoDhjvVPO_zyg1PyM9o4iJMe5JJW6vaRHbk6NYo_6iYn5dwEhr5zsGbkNG1qzc&components=buttons&currency=CAD`
    script.async = true

    script.onload = () => {
      setTimeout(() => {
        if (window.paypal && document.getElementById("paypal-button-container")) {
          window.paypal
            .Buttons({
              createOrder: async () => {
                const response = await fetch("/api/paypal/create-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    amount: paymentAmount,
                    contractData: contractData,
                  }),
                })
                const orderData = await response.json()
                return orderData.id
              },
              onApprove: async (data: any) => {
                const response = await fetch("/api/paypal/capture-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    orderID: data.orderID,
                    contractData: contractData,
                    renewalState: renewalState,
                  }),
                })
                const result = await response.json()
                if (result.success) {
                  onPaymentComplete?.()
                }
              },
              onError: (err: any) => {
                setError("Payment failed")
              },
            })
            .render("#paypal-button-container")

          setLoading(false)
        } else {
          setError("PayPal failed to load")
        }
      }, 1000)
    }

    script.onerror = () => {
      setError("Failed to load PayPal SDK")
    }

    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  if (error) {
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
            <CardTitle className="text-2xl text-red-600">Payment Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
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
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <span className="text-blue-600">💳</span>
            PayPal Payment
          </CardTitle>
          <CardDescription>One-time payment of ${paymentAmount.toFixed(2)} CAD</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>Loading PayPal...</span>
            </div>
          ) : (
            <div className="space-y-6">
              <div id="paypal-button-container" className="mt-6"></div>

              <div className="text-center text-sm text-slate-500">
                <div className="flex items-center justify-center gap-2">
                  <span>🔒</span>
                  <span>Secure payments processed by PayPal</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
