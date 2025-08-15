"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
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

  const cardFieldsRef = useRef<any>(null)
  const [billingData, setBillingData] = useState({
    cardholder_name: contractData?.customer_name || "",
    address: contractData?.address || "",
    city: contractData?.city || "",
    postal_code: contractData?.postal_code || "",
  })

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    console.log("[v0] PayPal Client ID:", clientId)
    if (!clientId) {
      setError("PayPal configuration missing")
      return
    }

    // Load PayPal SDK
    const script = document.createElement("script")
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&components=card-fields&currency=CAD`
    script.onload = () => {
      console.log("[v0] PayPal SDK loaded")
      // Wait a moment for DOM to be ready, then initialize
      setTimeout(() => {
        const paypal = (window as any).paypal
        console.log("[v0] PayPal object:", paypal)
        console.log("[v0] CardFields available:", !!paypal?.CardFields)

        if (!paypal?.CardFields) {
          setError("PayPal CardFields not available")
          return
        }

        // Check if DOM elements exist
        const numberEl = document.getElementById("card-number-field")
        const expiryEl = document.getElementById("card-expiry-field")
        const cvvEl = document.getElementById("card-cvv-field")
        console.log("[v0] DOM elements ready:", !!numberEl, !!expiryEl, !!cvvEl)

        if (!numberEl || !expiryEl || !cvvEl) {
          setError("Card field containers not ready")
          return
        }

        try {
          console.log("[v0] Initializing CardFields...")
          cardFieldsRef.current = paypal.CardFields({
            createOrder: async () => {
              console.log("[v0] Creating PayPal order...")
              const response = await fetch("/api/paypal/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  amount: paymentAmount,
                  contractData: contractData,
                }),
              })
              const data = await response.json()
              console.log("[v0] Order created:", data.orderID)
              return data.orderID
            },
            onApprove: async (data: any) => {
              console.log("[v0] Payment approved:", data.orderID)
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
                console.error("[v0] Payment processing error:", error)
                setError("Payment processing failed")
              }
              setProcessing(false)
            },
            onError: (error: any) => {
              console.error("[v0] PayPal error:", error)
              setError("Payment error occurred")
              setProcessing(false)
            },
          })

          console.log("[v0] Rendering card fields...")
          // Render card fields
          cardFieldsRef.current.NumberField().render("#card-number-field")
          cardFieldsRef.current.ExpiryField().render("#card-expiry-field")
          cardFieldsRef.current.CVVField().render("#card-cvv-field")

          console.log("[v0] PayPal CardFields initialized successfully")
          setLoading(false)
        } catch (error) {
          console.error("[v0] CardFields initialization error:", error)
          setError("Failed to initialize payment form")
        }
      }, 500)
    }
    script.onerror = () => {
      console.error("[v0] Failed to load PayPal SDK")
      setError("Failed to load PayPal")
    }
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cardFieldsRef.current || processing) return

    setProcessing(true)
    try {
      await cardFieldsRef.current.submit({
        billingAddress: {
          addressLine1: billingData.address,
          adminArea2: billingData.city,
          adminArea1: "ON",
          postalCode: billingData.postal_code,
          countryCode: "CA",
        },
      })
    } catch (error) {
      setError("Payment submission failed")
      setProcessing(false)
    }
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

  if (loading) {
    return (
      <div>
        <div className="mb-6 flex justify-center">
          <Button size="lg" variant="outline" onClick={onBack} className="bg-white h-12">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <Card className="max-w-2xl mx-auto">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading PayPal payment form...</span>
          </CardContent>
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
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="cardholder_name">Cardholder Name *</Label>
                <Input
                  id="cardholder_name"
                  value={billingData.cardholder_name}
                  onChange={(e) => setBillingData((prev) => ({ ...prev, cardholder_name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={billingData.address}
                  onChange={(e) => setBillingData((prev) => ({ ...prev, address: e.target.value }))}
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
                    value={billingData.postal_code}
                    onChange={(e) => setBillingData((prev) => ({ ...prev, postal_code: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>

            {/* PayPal Card Fields */}
            <div className="space-y-4">
              <div>
                <Label>Card Number *</Label>
                <div
                  id="card-number-field"
                  className="border border-gray-300 rounded-md p-3 min-h-[48px] bg-white"
                ></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Expiry (MM/YY) *</Label>
                  <div
                    id="card-expiry-field"
                    className="border border-gray-300 rounded-md p-3 min-h-[48px] bg-white"
                  ></div>
                </div>
                <div>
                  <Label>CVV *</Label>
                  <div
                    id="card-cvv-field"
                    className="border border-gray-300 rounded-md p-3 min-h-[48px] bg-white"
                  ></div>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700" disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing Payment...
                </>
              ) : (
                `Pay $${paymentAmount.toFixed(2)} CAD`
              )}
            </Button>

            <div className="text-center text-sm text-slate-500">
              <div className="flex items-center justify-center gap-2">
                <span>🔒</span>
                <span>Secure payments processed by PayPal</span>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
