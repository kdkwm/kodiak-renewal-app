"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowLeft } from "lucide-react"
import { loadScript } from "@paypal/paypal-js"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

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
  const [clientToken, setClientToken] = useState<string | null>(null)
  const [loadingToken, setLoadingToken] = useState(true)
  const [message, setMessage] = useState("")
  const [isPaying, setIsPaying] = useState(false)
  const [paypalLoaded, setPaypalLoaded] = useState(false)
  const cardFieldsRef = useRef<any>(null)
  const [billingAddress, setBillingAddress] = useState({
    addressLine1: "",
    addressLine2: "",
    adminArea1: "",
    adminArea2: "",
    postalCode: "",
    countryCode: "CA",
  })

  const CLIENT_ID =
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    "AV0TyYPKe1QH6uYUKMdNoDhjvVPO_zyg1PyM9o4iJMe5JJW6vaRHbk6NYo_6iYn5dwEhr5zsGbkNG1qzc"

  useEffect(() => {
    async function fetchToken() {
      try {
        console.log("[v0] Fetching PayPal client token...")
        const res = await fetch("/api/paypal/generate-client-token", { method: "POST" })
        const data = await res.json()
        if (data.client_token) {
          console.log("[v0] Client token received successfully")
          setClientToken(data.client_token)
        } else {
          console.error("[v0] Failed to get client_token", data)
          setMessage("Failed to initialize PayPal. Please try again.")
        }
      } catch (err) {
        console.error("[v0] Error fetching client token:", err)
        setMessage("Failed to initialize PayPal. Please try again.")
      } finally {
        setLoadingToken(false)
      }
    }
    fetchToken()
  }, [])

  useEffect(() => {
    if (!clientToken) return

    async function initPayPal() {
      try {
        console.log("[v0] Loading PayPal JS SDK...")
        const paypal = await loadScript({
          "client-id": CLIENT_ID,
          components: "buttons,card-fields",
          "data-client-token": clientToken,
          currency: "CAD",
          intent: "capture",
        })

        if (paypal && paypal.CardFields) {
          console.log("[v0] PayPal CardFields available, initializing...")

          const cardFields = paypal.CardFields({
            style: {
              input: {
                "font-size": "16px",
                "font-family": "system-ui, -apple-system, sans-serif",
                color: "#333",
              },
              ".invalid": {
                color: "#dc2626",
              },
            },
            fields: {
              number: { selector: "#card-number" },
              expirationDate: { selector: "#card-expiry" },
              cvv: { selector: "#card-cvv" },
            },
            createOrder: async () => {
              console.log("[v0] Creating PayPal order...")
              const res = await fetch("/api/paypal/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  paymentAmount,
                  contractData,
                  renewalState,
                }),
              })
              const data = await res.json()
              console.log("[v0] Order created:", data.id)
              return data.id
            },
          })

          cardFieldsRef.current = cardFields
          await cardFields.render("#card-fields-container")
          console.log("[v0] PayPal CardFields rendered successfully")
          setPaypalLoaded(true)
        } else {
          console.error("[v0] PayPal CardFields not available")
          setMessage("PayPal CardFields not available. Please try again.")
        }
      } catch (err) {
        console.error("[v0] Error initializing PayPal:", err)
        setMessage("Failed to load PayPal. Please refresh and try again.")
      }
    }

    initPayPal()
  }, [clientToken, CLIENT_ID, paymentAmount, contractData, renewalState])

  const handlePay = async () => {
    if (!cardFieldsRef.current) {
      console.warn("[v0] CardFields not ready")
      setMessage("Card fields not ready, please wait a moment.")
      return
    }

    setIsPaying(true)
    setMessage("")

    try {
      console.log("[v0] Submitting payment...")
      const { orderId } = await cardFieldsRef.current.submit({
        billingAddress,
      })

      console.log("[v0] Capturing order:", orderId)
      const res = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()

      if (data.status === "COMPLETED") {
        console.log("[v0] Payment completed successfully")
        setMessage("✅ Payment successful!")
        onPaymentComplete?.()
      } else {
        console.error("[v0] Payment failed:", data)
        setMessage("❌ Payment failed. Please try again.")
      }
    } catch (err) {
      console.error("[v0] Payment error:", err)
      setMessage("❌ Payment error. Please try again.")
    } finally {
      setIsPaying(false)
    }
  }

  if (!CLIENT_ID) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600">PayPal configuration error. Please contact support.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loadingToken) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading PayPal payment form...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!clientToken) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600">Failed to initialize PayPal. Please refresh and try again.</p>
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
        <CardContent className="space-y-6">
          <div id="card-fields-container" className="space-y-4">
            <div>
              <Label>Card Number</Label>
              <div id="card-number" className="border rounded-md p-3 bg-white min-h-[48px]"></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expiry Date</Label>
                <div id="card-expiry" className="border rounded-md p-3 bg-white min-h-[48px]"></div>
              </div>
              <div>
                <Label>CVV</Label>
                <div id="card-cvv" className="border rounded-md p-3 bg-white min-h-[48px]"></div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Billing Address</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Address Line 1</Label>
                <Input
                  value={billingAddress.addressLine1}
                  onChange={(e) => setBillingAddress((prev) => ({ ...prev, addressLine1: e.target.value }))}
                  placeholder="123 Main Street"
                />
              </div>
              <div>
                <Label>Address Line 2 (Optional)</Label>
                <Input
                  value={billingAddress.addressLine2}
                  onChange={(e) => setBillingAddress((prev) => ({ ...prev, addressLine2: e.target.value }))}
                  placeholder="Apt, Suite, etc."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>City</Label>
                  <Input
                    value={billingAddress.adminArea2}
                    onChange={(e) => setBillingAddress((prev) => ({ ...prev, adminArea2: e.target.value }))}
                    placeholder="Toronto"
                  />
                </div>
                <div>
                  <Label>Province</Label>
                  <Input
                    value={billingAddress.adminArea1}
                    onChange={(e) => setBillingAddress((prev) => ({ ...prev, adminArea1: e.target.value }))}
                    placeholder="ON"
                  />
                </div>
              </div>
              <div>
                <Label>Postal Code</Label>
                <Input
                  value={billingAddress.postalCode}
                  onChange={(e) => setBillingAddress((prev) => ({ ...prev, postalCode: e.target.value }))}
                  placeholder="M5V 3A8"
                />
              </div>
            </div>
          </div>

          <Button onClick={handlePay} disabled={isPaying || !paypalLoaded} className="w-full mt-6" size="lg">
            {isPaying ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : !paypalLoaded ? (
              "Loading PayPal..."
            ) : (
              "Pay Now"
            )}
          </Button>

          {message && (
            <div
              className={`p-4 border rounded-md ${
                message.includes("✅")
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <p className="text-sm">{message}</p>
            </div>
          )}

          <div className="text-center text-sm text-slate-500">
            <div className="flex items-center justify-center gap-2">
              <span>🔒</span>
              <span>Secure payments processed by PayPal</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
