"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2 } from "lucide-react"

interface PayPalPaymentProps {
  amount: number
  isRecurring: boolean
  contractData: any
  onSuccess: () => void
  onError: (error: string) => void
  processing: boolean
  setProcessing: (processing: boolean) => void
}

export function PayPalPayment({
  amount,
  isRecurring,
  contractData,
  onSuccess,
  onError,
  processing,
  setProcessing,
}: PayPalPaymentProps) {
  const [paypalLoaded, setPaypalLoaded] = useState(false)
  const paypalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

    if (!clientId) {
      console.error("[v0] PayPal Client ID not found in environment variables")
      onError("PayPal configuration error")
      return
    }

    console.log("[v0] Loading PayPal SDK with client ID:", clientId)

    // Load PayPal SDK
    const script = document.createElement("script")
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=${isRecurring ? "subscription" : "capture"}`
    script.onload = () => {
      console.log("[v0] PayPal SDK loaded successfully")
      setPaypalLoaded(true)
      initializePayPal()
    }
    script.onerror = () => {
      console.error("[v0] Failed to load PayPal SDK")
      onError("Failed to load PayPal")
    }
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [isRecurring])

  const initializePayPal = () => {
    if (!paypalRef.current || !(window as any).paypal) {
      console.error("[v0] PayPal reference or SDK not available")
      return
    }

    console.log("[v0] Initializing PayPal buttons")
    const paypal = (window as any).paypal

    if (isRecurring) {
      // For recurring payments, create subscription
      paypal
        .Buttons({
          createSubscription: async (data: any, actions: any) => {
            setProcessing(true)

            try {
              // Create subscription plan on your backend first
              const planResponse = await fetch("/api/create-paypal-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  amount: amount,
                  contractData: contractData,
                }),
              })

              const planData = await planResponse.json()

              return actions.subscription.create({
                plan_id: planData.planId,
              })
            } catch (error) {
              onError("Failed to create subscription plan")
              setProcessing(false)
              throw error
            }
          },
          onApprove: async (data: any, actions: any) => {
            try {
              // Activate subscription on your backend
              const response = await fetch("/api/activate-paypal-subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  subscriptionId: data.subscriptionID,
                  contractData: contractData,
                }),
              })

              const result = await response.json()

              if (result.success) {
                onSuccess()
              } else {
                throw new Error(result.error)
              }
            } catch (error) {
              onError("Failed to activate subscription")
            } finally {
              setProcessing(false)
            }
          },
          onError: (err: any) => {
            onError("PayPal subscription error")
            setProcessing(false)
          },
        })
        .render(paypalRef.current)
    } else {
      // For one-time payments
      paypal
        .Buttons({
          createOrder: (data: any, actions: any) => {
            setProcessing(true)

            return actions.order.create({
              purchase_units: [
                {
                  amount: {
                    value: amount.toFixed(2),
                    currency_code: "CAD",
                  },
                  description: `Snow Removal Contract ${contractData.contractId}`,
                },
              ],
            })
          },
          onApprove: async (data: any, actions: any) => {
            try {
              const details = await actions.order.capture()

              // Send confirmation to your backend
              const response = await fetch("/api/confirm-paypal-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId: data.orderID,
                  paymentDetails: details,
                  contractData: contractData,
                }),
              })

              const result = await response.json()

              if (result.success) {
                onSuccess()
              } else {
                throw new Error(result.error)
              }
            } catch (error) {
              onError("Payment confirmation failed")
            } finally {
              setProcessing(false)
            }
          },
          onError: (err: any) => {
            onError("PayPal payment error")
            setProcessing(false)
          },
        })
        .render(paypalRef.current)
    }
  }

  if (!paypalLoaded) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading PayPal...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
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
    </div>
  )
}
