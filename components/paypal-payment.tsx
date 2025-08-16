"use client"
import { useState, useEffect } from "react"
import { ArrowLeft } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  PayPalScriptProvider,
  PayPalCardFieldsProvider,
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

export function PayPalPayment({
  contractData,
  renewalState,
  paymentAmount,
  onPaymentComplete,
  onBack,
}: PayPalPaymentProps) {
  const [billingAddress, setBillingAddress] = useState({
    addressLine1: contractData.address || "",
    addressLine2: "",
    adminArea1: "ON", // Province
    adminArea2: "", // City
    countryCode: "CA",
    postalCode: "",
  })
  const [message, setMessage] = useState("")
  const [clientToken, setClientToken] = useState<string | null>(null)
  const [isLoadingToken, setIsLoadingToken] = useState(true)

  const CLIENT_ID =
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    "AV0TyYPKe1QH6uYUKMdNoDhjvVPO_zyg1PyM9o4iJMe5JJW6vaRHbk6NYo_6iYn5dwEhr5zsGbkNG1qzc"

  useEffect(() => {
    async function fetchClientToken() {
      try {
        const response = await fetch("/api/paypal/generate-client-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })

        const data = await response.json()

        if (data.client_token) {
          setClientToken(data.client_token)
        } else {
          setMessage("Failed to initialize PayPal. Please try again.")
        }
      } catch (error) {
        console.error("Error fetching PayPal client token:", error)
        setMessage("Failed to initialize PayPal. Please try again.")
      } finally {
        setIsLoadingToken(false)
      }
    }

    fetchClientToken()
  }, [])

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

  if (isLoadingToken) {
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

  const initialOptions = {
    "client-id": CLIENT_ID,
    currency: "CAD",
    intent: "capture",
    components: "card-fields",
    "data-client-token": clientToken,
  }

  function handleBillingAddressChange(field: string, value: string) {
    setBillingAddress((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  async function createOrder() {
    try {
      const response = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentAmount: paymentAmount,
          contractData: contractData,
          renewalState: renewalState,
        }),
      })

      const orderData = await response.json()

      if (orderData.orderId) {
        return orderData.orderId
      } else {
        const errorDetail = orderData?.details?.[0]
        const errorMessage = errorDetail
          ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
          : JSON.stringify(orderData)
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error(error)
      return `Could not initiate PayPal Checkout...${error}`
    }
  }

  return (
    <div>
      <div className="mb-6 flex justify-center">
        <Button size="lg" variant="outline" onClick={onBack} className="bg-white h-12">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <PayPalScriptProvider options={initialOptions}>
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <span className="text-blue-600">💳</span>
              PayPal Payment
            </CardTitle>
            <CardDescription>One-time payment of ${paymentAmount.toFixed(2)} CAD</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <PayPalCardFieldsProvider createOrder={createOrder}>
              <div className="space-y-4">
                <h3 className="font-semibold mb-3">Pay with Card</h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="card-number">Card Number</Label>
                    <div className="border rounded-md p-3 bg-white">
                      <PayPalNumberField />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiration-date">Expiry Date</Label>
                      <div className="border rounded-md p-3 bg-white">
                        <PayPalExpiryField />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="cvv">CVV</Label>
                      <div className="border rounded-md p-3 bg-white">
                        <PayPalCVVField />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Billing Address Fields */}
                <div className="mt-6 space-y-4">
                  <h4 className="font-medium">Billing Address</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="address1">Address Line 1</Label>
                      <Input
                        id="address1"
                        value={billingAddress.addressLine1}
                        onChange={(e) => handleBillingAddressChange("addressLine1", e.target.value)}
                        placeholder="Street address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="address2">Address Line 2</Label>
                      <Input
                        id="address2"
                        value={billingAddress.addressLine2}
                        onChange={(e) => handleBillingAddressChange("addressLine2", e.target.value)}
                        placeholder="Apt, suite, etc."
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={billingAddress.adminArea2}
                        onChange={(e) => handleBillingAddressChange("adminArea2", e.target.value)}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <Label htmlFor="postal">Postal Code</Label>
                      <Input
                        id="postal"
                        value={billingAddress.postalCode}
                        onChange={(e) => handleBillingAddressChange("postalCode", e.target.value)}
                        placeholder="Postal code"
                      />
                    </div>
                  </div>
                </div>

                <SubmitPayment
                  billingAddress={billingAddress}
                  onPaymentComplete={onPaymentComplete}
                  setMessage={setMessage}
                />
              </div>
            </PayPalCardFieldsProvider>

            {message && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">{message}</p>
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
      </PayPalScriptProvider>
    </div>
  )
}

const SubmitPayment = ({
  billingAddress,
  onPaymentComplete,
  setMessage,
}: {
  billingAddress: any
  onPaymentComplete?: () => void
  setMessage: (msg: string) => void
}) => {
  const [isPaying, setIsPaying] = useState(false)
  const { cardFields } = usePayPalCardFields()

  const handleClick = async () => {
    if (!cardFields) {
      setMessage("PayPal card fields not ready. Please try again.")
      return
    }

    setIsPaying(true)

    try {
      const { orderId } = await cardFields.submit({
        billingAddress,
      })

      // Capture the order
      const response = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })

      const data = await response.json()

      if (data.status === "COMPLETED") {
        setMessage("✅ Payment successful!")
        onPaymentComplete?.()
      } else {
        setMessage("❌ Payment failed. Please try again.")
      }
    } catch (error) {
      console.error("Payment error:", error)
      setMessage("❌ Payment failed. Please try again.")
    } finally {
      setIsPaying(false)
    }
  }

  return (
    <Button onClick={handleClick} disabled={isPaying} className="w-full mt-6" size="lg">
      {isPaying ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Processing...
        </>
      ) : (
        "Pay Now"
      )}
    </Button>
  )
}
