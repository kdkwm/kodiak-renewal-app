"use client"
import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  PayPalScriptProvider,
  PayPalButtons,
  PayPalCardFieldsProvider,
  PayPalCardFieldsForm,
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

  const CLIENT_ID =
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    "AV0TyYPKe1QH6uYUKMdNoDhjvVPO_zyg1PyM9o4iJMe5JJW6vaRHbk6NYo_6iYn5dwEhr5zsGbkNG1qzc"

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

  const initialOptions = {
    "client-id": CLIENT_ID,
    currency: "CAD",
    intent: "capture",
    components: "buttons,card-fields",
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
          amount: paymentAmount,
          contractData: contractData,
          renewalState: renewalState,
        }),
      })

      const orderData = await response.json()

      if (orderData.id) {
        return orderData.id
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

  async function onApprove(data: any) {
    try {
      const response = await fetch(`/api/paypal/capture-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderID: data.orderID,
          contractData: contractData,
          renewalState: renewalState,
        }),
      })

      const orderData = await response.json()
      const transaction =
        orderData?.purchase_units?.[0]?.payments?.captures?.[0] ||
        orderData?.purchase_units?.[0]?.payments?.authorizations?.[0]
      const errorDetail = orderData?.details?.[0]

      if (errorDetail || !transaction || transaction.status === "DECLINED") {
        let errorMessage
        if (transaction) {
          errorMessage = `Transaction ${transaction.status}: ${transaction.id}`
        } else if (errorDetail) {
          errorMessage = `${errorDetail.description} (${orderData.debug_id})`
        } else {
          errorMessage = JSON.stringify(orderData)
        }
        throw new Error(errorMessage)
      } else {
        console.log("Capture result", orderData, JSON.stringify(orderData, null, 2))
        onPaymentComplete?.()
        return `Transaction ${transaction.status}: ${transaction.id}`
      }
    } catch (error) {
      return `Sorry, your transaction could not be processed...${error}`
    }
  }

  function onError(error: any) {
    console.error("PayPal error:", error)
    setMessage("Payment failed. Please try again.")
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
            {/* PayPal Buttons for modal payment */}
            <div>
              <h3 className="font-semibold mb-3">Pay with PayPal</h3>
              <PayPalButtons
                createOrder={createOrder}
                onApprove={async (data) => setMessage(await onApprove(data))}
                onError={onError}
                style={{
                  shape: "rect",
                  layout: "vertical",
                  color: "gold",
                  label: "paypal",
                }}
              />
            </div>

            <div className="text-center text-sm text-gray-500">OR PAY WITH CARD</div>

            {/* PayPal Card Fields for inline payment */}
            <div>
              <h3 className="font-semibold mb-3">Pay with Card</h3>
              <PayPalCardFieldsProvider
                createOrder={createOrder}
                onApprove={async (data) => setMessage(await onApprove(data))}
              >
                <PayPalCardFieldsForm />

                {/* Billing Address Fields */}
                <div className="mt-4 space-y-4">
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

                {/* Custom Submit Button */}
                <SubmitPayment billingAddress={billingAddress} />
              </PayPalCardFieldsProvider>
            </div>

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

const SubmitPayment = ({ billingAddress }: { billingAddress: any }) => {
  const [isPaying, setIsPaying] = useState(false)
  const { cardFieldsForm } = usePayPalCardFields()

  const handleClick = async () => {
    if (!cardFieldsForm) {
      const childErrorMessage = "Unable to find any child components in the <PayPalCardFieldsProvider />"
      throw new Error(childErrorMessage)
    }

    const formState = await cardFieldsForm.getState()

    if (!formState.isFormValid) {
      return alert("The payment form is invalid")
    }

    setIsPaying(true)

    cardFieldsForm.submit({ billingAddress }).finally(() => {
      setIsPaying(false)
    })
  }

  return (
    <Button onClick={handleClick} disabled={isPaying} className="w-full mt-4" size="lg">
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
