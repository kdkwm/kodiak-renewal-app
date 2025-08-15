"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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
  const paypalRef = useRef<HTMLDivElement>(null)
  const initializationRef = useRef(false)

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

    // Load PayPal SDK
    const script = document.createElement("script")
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=${isRecurring ? "subscription" : "capture"}&currency=CAD`
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

    if (!paypalRef.current) {
      console.error("[v0] PayPal container not available")
      return
    }

    if (!(window as any).paypal) {
      console.error("[v0] PayPal SDK not available")
      setTimeout(() => {
        initializePayPal()
      }, 500)
      return
    }

    console.log("[v0] Initializing PayPal buttons")
    initializationRef.current = true
    const paypal = (window as any).paypal

    if (isRecurring) {
      // For recurring payments, create subscription
      paypal
        .Buttons({
          createSubscription: async (data: any, actions: any) => {
            setProcessing(true)

            try {
              // Create subscription plan on your backend first
              const planResponse = await fetch("/api/paypal/create-subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  amount: paymentAmount,
                  installments: renewalState?.selectedPayments || 1,
                  contractData: contractData,
                }),
              })

              const planData = await planResponse.json()

              return actions.subscription.create({
                plan_id: planData.planId,
              })
            } catch (error) {
              setError("Failed to create subscription plan")
              setProcessing(false)
              throw error
            }
          },
          onApprove: async (data: any, actions: any) => {
            try {
              // Activate subscription on your backend
              const response = await fetch("/api/paypal/activate-subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  subscriptionId: data.subscriptionID,
                  contractData: contractData,
                  renewalState: renewalState,
                }),
              })

              const result = await response.json()

              if (result.success) {
                onPaymentComplete?.()
              } else {
                throw new Error(result.error)
              }
            } catch (error) {
              setError("Failed to activate subscription")
            } finally {
              setProcessing(false)
            }
          },
          onError: (err: any) => {
            console.error("[v0] PayPal subscription error:", err)
            setError("PayPal subscription error")
            setProcessing(false)
          },
        })
        .render(paypalRef.current)
    } else {
      // For one-time payments
      paypal
        .Buttons({
          createOrder: async (data: any, actions: any) => {
            setProcessing(true)

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
              return orderData.orderID
            } catch (error) {
              setError("Failed to create order")
              setProcessing(false)
              throw error
            }
          },
          onApprove: async (data: any, actions: any) => {
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
                throw new Error(result.error)
              }
            } catch (error) {
              setError("Payment confirmation failed")
            } finally {
              setProcessing(false)
            }
          },
          onError: (err: any) => {
            console.error("[v0] PayPal payment error:", err)
            setError("PayPal payment error")
            setProcessing(false)
          },
        })
        .render(paypalRef.current)
    }
  }

  if (error) {
    return (
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
    )
  }

  if (!paypalLoaded) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading PayPal...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">PayPal Payment</CardTitle>
        <CardDescription>
          {isRecurring
            ? `Complete your ${renewalState?.selectedPayments}-payment installment plan`
            : "Complete your one-time payment"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Payment Amount:</span>
            <span className="font-bold text-green-600 text-lg">${paymentAmount.toFixed(2)} CAD</span>
          </div>
          {isRecurring && (
            <div className="text-sm text-slate-600 mt-2">
              First payment of {renewalState?.selectedPayments} installments
            </div>
          )}
        </div>

        {/* PayPal Button Container */}
        <div ref={paypalRef} className="min-h-[50px]"></div>

        {processing && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span>Processing payment...</span>
          </div>
        )}

        {isRecurring && (
          <p className="text-xs text-slate-600 text-center">
            By proceeding, you authorize recurring payments for your installment plan.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
