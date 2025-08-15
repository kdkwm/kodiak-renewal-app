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
  const [paypalLoaded, setPaypalLoaded] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cardFieldsRef = useRef<any>(null)
  const initializationRef = useRef(false)

  const [billingData, setBillingData] = useState({
    cardholder_name: contractData?.customer_name || "",
    email_address: contractData?.email || "",
    phone_number: contractData?.phone || "",
    address: contractData?.address || "",
    city: contractData?.city || "",
    postal_code: contractData?.postal_code || "",
    province: contractData?.province || "Ontario",
    country: "Canada",
  })

  const isRecurring = (renewalState?.selectedPayments || 1) > 1

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

    if (!clientId) {
      console.error("[v0] PayPal Client ID not found in environment variables")
      setError("PayPal configuration error")
      return
    }

    console.log("[v0] Loading PayPal SDK with client ID:", clientId)

    // Check if PayPal SDK is already loaded
    if ((window as any).paypal) {
      console.log("[v0] PayPal SDK already loaded")
      setPaypalLoaded(true)
      setTimeout(() => {
        initializePayPal()
      }, 100)
      return
    }

    const script = document.createElement("script")
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&components=card-fields&currency=CAD`
    script.onload = () => {
      console.log("[v0] PayPal SDK loaded successfully")
      setPaypalLoaded(true)
      setTimeout(() => {
        initializePayPal()
      }, 200)
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

  const initializePayPal = () => {
    if (initializationRef.current) {
      console.log("[v0] PayPal already initialized")
      return
    }

    if (!(window as any).paypal) {
      console.error("[v0] PayPal SDK not available")
      setTimeout(() => {
        initializePayPal()
      }, 500)
      return
    }

    console.log("[v0] Initializing PayPal CardFields")
    initializationRef.current = true
    const paypal = (window as any).paypal

    if (paypal.CardFields && paypal.CardFields.isEligible()) {
      cardFieldsRef.current = paypal.CardFields({
        createOrder: async () => {
          try {
            const response = await fetch("/api/paypal/create-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                amount: paymentAmount,
                contractData: contractData,
                isRecurring: isRecurring,
              }),
            })

            const orderData = await response.json()
            return orderData.orderID
          } catch (error) {
            console.error("[v0] Failed to create order:", error)
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
                billingData: billingData,
              }),
            })

            const result = await response.json()

            if (result.success) {
              onPaymentComplete?.()
            } else {
              throw new Error(result.error)
            }
          } catch (error) {
            console.error("[v0] Payment confirmation failed:", error)
            setError("Payment confirmation failed")
          } finally {
            setProcessing(false)
          }
        },
        onError: (err: any) => {
          console.error("[v0] PayPal CardFields error:", err)
          setError("Payment processing error")
          setProcessing(false)
        },
        style: {
          input: {
            "font-size": "16px",
            "font-family": "system-ui, -apple-system, sans-serif",
            color: "#374151",
          },
          ".invalid": {
            color: "#ef4444",
          },
        },
      })

      // Render card fields
      cardFieldsRef.current.NumberField().render("#card-number-field")
      cardFieldsRef.current.ExpiryField().render("#card-expiry-field")
      cardFieldsRef.current.CVVField().render("#card-cvv-field")
    } else {
      setError("PayPal CardFields not available")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!cardFieldsRef.current) {
      setError("Payment form not ready")
      return
    }

    setProcessing(true)
    setError(null)

    try {
      await cardFieldsRef.current.submit({
        billingAddress: {
          addressLine1: billingData.address,
          adminArea2: billingData.city,
          adminArea1: billingData.province,
          postalCode: billingData.postal_code,
          countryCode: "CA",
        },
      })
    } catch (error) {
      console.error("[v0] Payment submission failed:", error)
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
          <CardContent className="text-center">
            <button
              onClick={() => {
                setError(null)
                initializationRef.current = false
                initializePayPal()
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!paypalLoaded) {
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
            <span>Loading PayPal...</span>
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
          <CardDescription>
            {isRecurring
              ? `${renewalState?.selectedPayments}-payment installment plan of $${paymentAmount.toFixed(2)}`
              : `One-time payment of $${paymentAmount.toFixed(2)}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Billing Information */}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email_address">Email Address *</Label>
                  <Input
                    id="email_address"
                    type="email"
                    value={billingData.email_address}
                    onChange={(e) => setBillingData((prev) => ({ ...prev, email_address: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone_number">Phone Number *</Label>
                  <Input
                    id="phone_number"
                    value={billingData.phone_number}
                    onChange={(e) => setBillingData((prev) => ({ ...prev, phone_number: e.target.value }))}
                    required
                  />
                </div>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div id="card-number-field" className="border border-gray-300 rounded-md p-3 min-h-[48px]"></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Expiry (MM/YY) *</Label>
                  <div id="card-expiry-field" className="border border-gray-300 rounded-md p-3 min-h-[48px]"></div>
                </div>
                <div>
                  <Label>CVV *</Label>
                  <div id="card-cvv-field" className="border border-gray-300 rounded-md p-3 min-h-[48px]"></div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
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

            {isRecurring && (
              <p className="text-xs text-slate-600 text-center">
                By proceeding, you authorize recurring payments for your installment plan.
              </p>
            )}

            <div className="text-center text-sm text-slate-500">
              <div className="flex items-center justify-center gap-2">
                <span>🔒</span>
                <span>Secure payments processed by PayPal</span>
              </div>
              <p className="mt-1">Your payment information is encrypted and secure</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
