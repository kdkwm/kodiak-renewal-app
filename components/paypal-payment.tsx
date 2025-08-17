"use client"

import { useState, useEffect } from "react"
import { ArrowLeft } from "lucide-react"
import {
  PayPalScriptProvider,
  PayPalCardFieldsProvider,
  PayPalCardNumberField,
  PayPalCardExpiryField,
  PayPalCardCVVField,
  usePayPalCardFields,
} from "@paypal/react-paypal-js"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  const [clientToken, setClientToken] = useState<string | null>(null)
  const [loadingToken, setLoadingToken] = useState(true)
  const [message, setMessage] = useState("")

  const CLIENT_ID =
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    "AV0TyYPKe1QH6uYUKMdNoDhjvVPO_zyg1PyM9o4iJMe5JJW6vaRHbk6NYo_6iYn5dwEhr5zsGbkNG1qzc"

  useEffect(() => {
    async function fetchToken() {
      try {
        const res = await fetch("/api/paypal/generate-client-token", { method: "POST" })
        const data = await res.json()
        if (data.client_token) {
          setClientToken(data.client_token)
        } else {
          console.error("Failed to get client_token", data)
          setMessage("Failed to initialize PayPal. Please try again.")
        }
      } catch (err) {
        console.error("Error fetching client token:", err)
        setMessage("Failed to initialize PayPal. Please try again.")
      } finally {
        setLoadingToken(false)
      }
    }
    fetchToken()
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

      <PayPalScriptProvider
        options={{
          "client-id": CLIENT_ID,
          components: "buttons,card-fields", // ✅ must include both for CardFields to work
          dataClientToken: clientToken, // ✅ camelCase format
          currency: "CAD",
          intent: "capture",
        }}
      >
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <span className="text-blue-600">💳</span>
              Pay with Card
            </CardTitle>
            <CardDescription>One-time payment of ${paymentAmount.toFixed(2)} CAD</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <PayPalCardFieldsProvider
              createOrder={async () => {
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
                return data.id
              }}
            >
              <CardForm onPaymentComplete={onPaymentComplete} setMessage={setMessage} />
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

function CardForm({
  onPaymentComplete,
  setMessage,
}: {
  onPaymentComplete?: () => void
  setMessage: (msg: string) => void
}) {
  const { cardFields } = usePayPalCardFields()
  const [isPaying, setIsPaying] = useState(false)

  const handlePay = async () => {
    if (!cardFields) {
      console.warn("[CardForm] CardFields not ready")
      setMessage("Card fields not ready, please wait a moment.")
      return
    }

    setIsPaying(true)
    try {
      const { orderId } = await cardFields.submit()

      const res = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderID: orderId }),
      })
      const data = await res.json()

      if (data.status === "COMPLETED") {
        setMessage("✅ Payment successful!")
        onPaymentComplete?.()
      } else {
        setMessage("❌ Payment failed")
      }
    } catch (err) {
      console.error("Payment error:", err)
      setMessage("❌ Payment error")
    } finally {
      setIsPaying(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Card Number</Label>
        <div className="border rounded-md p-3 bg-white">
          <PayPalCardNumberField />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Expiry</Label>
          <div className="border rounded-md p-3 bg-white">
            <PayPalCardExpiryField />
          </div>
        </div>
        <div>
          <Label>CVV</Label>
          <div className="border rounded-md p-3 bg-white">
            <PayPalCardCVVField />
          </div>
        </div>
      </div>

      <Button onClick={handlePay} disabled={isPaying} className="w-full mt-6" size="lg">
        {isPaying ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Processing...
          </>
        ) : (
          "Pay Now"
        )}
      </Button>
    </div>
  )
}
