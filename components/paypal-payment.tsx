"use client"
import { useState } from "react"
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  PayPalScriptProvider,
  PayPalButtons,
  PayPalCardFieldsProvider,
  PayPalNameField,
  PayPalNumberField,
  PayPalExpiryField,
  PayPalCVVField,
  usePayPalCardFields,
} from "@paypal/react-paypal-js"

interface PayPalPaymentProps {
  contractData: any
  renewalState: any
  paymentAmount: number
  onPaymentComplete?: () => void
  onBack?: () => void
}

// <CHANGE> Custom submit component using PayPal React SDK hook
function SubmitPayment({ 
  billingAddress, 
  onPaymentComplete 
}: { 
  billingAddress: any
  onPaymentComplete?: () => void 
}) {
  const { cardFieldsForm } = usePayPalCardFields()

  const handleSubmit = async () => {
    if (!cardFieldsForm) {
      alert("Card fields not available")
      return
    }

    try {
      const formState = await cardFieldsForm.getState()
      if (!formState.isFormValid) {
        alert("Please fill in all required fields")
        return
      }

      await cardFieldsForm.submit({ billingAddress })
      onPaymentComplete?.()
    } catch (err) {
      console.error("Card payment failed:", err)
      alert("Payment failed. Please try again.")
    }
  }

  return (
    <Button onClick={handleSubmit} className="w-full" size="lg">
      Pay with Card
    </Button>
  )
}

export function PayPalPayment({
  contractData,
  renewalState,
  paymentAmount,
  onPaymentComplete,
  onBack,
}: PayPalPaymentProps) {
  const [billingAddress, setBillingAddress] = useState({
    addressLine1: "",
    adminArea2: "",
    adminArea1: "",
    postalCode: "",
    countryCode: "CA",
  })

  const CLIENT_ID = "AV0TyYPKe1QH6uYUKMdNoDhjvVPO_zyg1PyM9o4iJMe5JJW6vaRHbk6NYo_6iYn5dwEhr5zsGbkNG1qzc"

  // <CHANGE> PayPal order creation function
  const createOrder = async () => {
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
      console.error(error)
      throw new Error(`Could not initiate PayPal Checkout...${error}`)
    }
  }

  // <CHANGE> PayPal order approval function
  const onApprove = async (data: any) => {
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
      }
      return result
    } catch (error) {
      throw new Error(`Sorry, your transaction could not be processed...${error}`)
    }
  }

  const handleBillingAddressChange = (field: string, value: string) => {
    setBillingAddress((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <div>
      <div className="mb-6 flex justify-center">
        <Button size="lg" variant="outline" onClick={onBack} className="bg-white h-12">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* <CHANGE> PayPal React SDK Provider with proper configuration */}
      <PayPalScriptProvider
        options={{
          clientId: CLIENT_ID,
          currency: "CAD",
          intent: "capture",
          components: "buttons,card-fields",
        }}
      >
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <span className="text-blue-600">💳</span>
              PayPal Payment
            </CardTitle>
            <CardDescription>One-time payment of ${paymentAmount.toFixed(2)} CAD</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* <CHANGE> PayPal Buttons using React SDK */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Pay with PayPal</h3>
                <PayPalButtons
                  createOrder={createOrder}
                  onApprove={onApprove}
                  onError={(error) => {
                    console.error("PayPal error:", error)
                    alert("Payment failed. Please try again.")
                  }}
                  style={{
                    shape: "rect",
                    layout: "vertical",
                    color: "gold",
                    label: "paypal",
                  }}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">Or pay with card</span>
                </div>
              </div>

              {/* <CHANGE> PayPal Card Fields using React SDK */}
              <PayPalCardFieldsProvider
                createOrder={createOrder}
                onApprove={onApprove}
                onError={(error) => {
                  console.error("PayPal card error:", error)
                  alert("Payment failed. Please try again.")
                }}
                style={{
                  input: {
                    "font-size": "16px",
                    "font-family": "system-ui, sans-serif",
                    color: "#374151",
                  },
                  ".invalid": {
                    color: "#ef4444",
                  },
                }}
              >
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="paypal-name-field">Cardholder Name</Label>
                    <div className="mt-1 border rounded-md p-3 min-h-[48px]">
                      <PayPalNameField />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="paypal-number-field">Card Number</Label>
                    <div className="mt-1 border rounded-md p-3 min-h-[48px]">
                      <PayPalNumberField />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="paypal-expiry-field">Expiry Date</Label>
                      <div className="mt-1 border rounded-md p-3 min-h-[48px]">
                        <PayPalExpiryField />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="paypal-cvv-field">CVV</Label>
                      <div className="mt-1 border rounded-md p-3 min-h-[48px]">
                        <PayPalCVVField />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Billing Address</h4>

                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        placeholder="123 Main Street"
                        value={billingAddress.addressLine1}
                        onChange={(e) => handleBillingAddressChange("addressLine1", e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          placeholder="Toronto"
                          value={billingAddress.adminArea2}
                          onChange={(e) => handleBillingAddressChange("adminArea2", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="province">Province</Label>
                        <Input
                          id="province"
                          placeholder="ON"
                          value={billingAddress.adminArea1}
                          onChange={(e) => handleBillingAddressChange("adminArea1", e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="postal-code">Postal Code</Label>
                      <Input
                        id="postal-code"
                        placeholder="K1A 0A6"
                        value={billingAddress.postalCode}
                        onChange={(e) => handleBillingAddressChange("postalCode", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* <CHANGE> Submit component using PayPal React SDK hook */}
                  <SubmitPayment 
                    billingAddress={billingAddress} 
                    onPaymentComplete={onPaymentComplete}
                  />
                </div>
              </PayPalCardFieldsProvider>
            </div>

            <div className="text-center text-sm text-slate-500 mt-6">
              <div className="flex items-center justify-center gap-2">
                <span>🔒</span>
                <span>Secure payments processed by PayPal</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </PayPalScriptProvider>
    </div>
  )
}
