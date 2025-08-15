"use client"
import { useState, useEffect } from "react"
import { Loader2, ArrowLeft } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [billingData, setBillingData] = useState({
    name: "",
    addressLine1: contractData?.address || "",
    city: contractData?.city || "",
    postalCode: contractData?.postal_code || "",
  })

  useEffect(() => {
    const script = document.createElement("script")
    script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&components=buttons&currency=CAD`
    script.async = true

    script.onload = () => {
      if (window.paypal) {
        initializePayPal()
      }
    }

    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const initializePayPal = () => {
    if (!window.paypal) return

    window.paypal
      .Buttons({
        createOrder: async () => {
          try {
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
          } catch (error) {
            console.error("Error creating order:", error)
            throw error
          }
        },
        onApprove: async (data: any) => {
          setProcessing(true)
          try {
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
            } else {
              setError("Payment failed")
            }
          } catch (error) {
            setError("Payment processing failed")
          }
          setProcessing(false)
        },
        onError: (err: any) => {
          console.error("PayPal error:", err)
          setError("PayPal initialization failed")
          setProcessing(false)
        },
      })
      .render("#paypal-button-container")

    setLoading(false)
  }

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
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={billingData.name}
                    onChange={(e) => setBillingData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={billingData.addressLine1}
                    onChange={(e) => setBillingData((prev) => ({ ...prev, addressLine1: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={billingData.city}
                      onChange={(e) => setBillingData((prev) => ({ ...prev, city: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="postal_code">Postal Code *</Label>
                    <Input
                      id="postal_code"
                      value={billingData.postalCode}
                      onChange={(e) => setBillingData((prev) => ({ ...prev, postalCode: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>

              <div id="paypal-button-container" className="mt-6"></div>

              {processing && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Processing payment...</span>
                </div>
              )}

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
