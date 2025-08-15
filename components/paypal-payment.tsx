"use client"
import { useState } from "react"
import { Loader2, ArrowLeft } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  PayPalScriptProvider,
  usePayPalCardFields,
  PayPalCardFieldsProvider,
  PayPalNameField,
  PayPalNumberField,
  PayPalExpiryField,
  PayPalCVVField,
} from "@paypal/react-paypal-js"

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
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [billingData, setBillingData] = useState({
    addressLine1: contractData?.address || "",
    city: contractData?.city || "",
    postalCode: contractData?.postal_code || "",
  })

  const initialOptions = {
    "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
    currency: "CAD",
    components: "card-fields",
    "data-sdk-integration-source": "developer-studio",
  }

  async function createOrder() {
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
      if (orderData.id) {
        return orderData.id
      } else {
        throw new Error("Failed to create order")
      }
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  async function onApprove(data: any) {
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
          <PayPalScriptProvider options={initialOptions}>
            <PayPalCardFieldsProvider
              createOrder={createOrder}
              onApprove={onApprove}
              style={{
                input: {
                  "font-size": "16px",
                  "font-family": "system-ui, sans-serif",
                  color: "#333",
                },
                ".invalid": { color: "#dc2626" },
                ".valid": { color: "#16a34a" },
              }}
            >
              <div className="space-y-6">
                <div>
                  <Label>Cardholder Name *</Label>
                  <div className="border border-gray-300 rounded-md p-3 min-h-[48px] bg-white">
                    <PayPalNameField />
                  </div>
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

                <div className="space-y-4">
                  <div>
                    <Label>Card Number *</Label>
                    <div className="border border-gray-300 rounded-md p-3 min-h-[48px] bg-white">
                      <PayPalNumberField />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Expiry (MM/YY) *</Label>
                      <div className="border border-gray-300 rounded-md p-3 min-h-[48px] bg-white">
                        <PayPalExpiryField />
                      </div>
                    </div>
                    <div>
                      <Label>CVV *</Label>
                      <div className="border border-gray-300 rounded-md p-3 min-h-[48px] bg-white">
                        <PayPalCVVField />
                      </div>
                    </div>
                  </div>
                </div>

                <SubmitPayment
                  processing={processing}
                  setProcessing={setProcessing}
                  billingAddress={billingData}
                  paymentAmount={paymentAmount}
                />

                <div className="text-center text-sm text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <span>🔒</span>
                    <span>Secure payments processed by PayPal</span>
                  </div>
                </div>
              </div>
            </PayPalCardFieldsProvider>
          </PayPalScriptProvider>
        </CardContent>
      </Card>
    </div>
  )
}

const SubmitPayment = ({ processing, setProcessing, billingAddress, paymentAmount }: any) => {
  const { cardFieldsForm } = usePayPalCardFields()

  const handleClick = async () => {
    if (!cardFieldsForm) {
      alert("PayPal form not ready")
      return
    }

    const formState = await cardFieldsForm.getState()
    if (!formState.isFormValid) {
      alert("Please fill in all required fields correctly")
      return
    }

    setProcessing(true)

    cardFieldsForm
      .submit({
        billingAddress: {
          addressLine1: billingAddress.addressLine1,
          locality: billingAddress.city,
          region: "ON",
          postalCode: billingAddress.postalCode,
          countryCodeAlpha2: "CA",
        },
      })
      .catch((err) => {
        console.error("Payment submission failed:", err)
        setProcessing(false)
      })
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
      disabled={processing}
    >
      {processing ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Processing Payment...
        </>
      ) : (
        `Pay $${paymentAmount.toFixed(2)} CAD`
      )}
    </Button>
  )
}
