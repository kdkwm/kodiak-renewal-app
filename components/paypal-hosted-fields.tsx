"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CreditCard, Shield } from "lucide-react"

interface PayPalHostedFieldsProps {
  contractData: any
  renewalState: any
  onSuccess: () => void
  onError: (error: string) => void
  onFallback?: () => void // Added fallback callback for when Hosted Fields fails
}

export default function PayPalHostedFields({
  contractData,
  renewalState,
  onSuccess,
  onError,
  onFallback,
}: PayPalHostedFieldsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const [scriptError, setScriptError] = useState(false) // Track script loading errors
  const [paypalInstance, setPaypalInstance] = useState<any>(null)
  const hostedFieldsRef = useRef<any>(null)

  const subtotal = Number.parseFloat(contractData?.subtotal || "0")
  const tax = subtotal * 0.13 // 13% tax
  const platinumUpgrade = renewalState?.platinumService ? 25 : 0
  const totalAmount = subtotal + tax + platinumUpgrade
  const isInstallment = renewalState?.paymentSchedule !== "full"
  const installmentAmount = isInstallment
    ? totalAmount / Number.parseInt(renewalState?.paymentSchedule || "1")
    : totalAmount

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "sb" // Use sandbox client ID as fallback

    if (!clientId || clientId === "YOUR_PAYPAL_CLIENT_ID") {
      console.error("[v0] PayPal client ID not configured")
      setScriptError(true)
      onError("PayPal configuration error")
      return
    }

    const script = document.createElement("script")
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&components=hosted-fields&currency=CAD`

    script.onload = () => {
      console.log("[v0] PayPal SDK loaded successfully")
      setIsScriptLoaded(true)
    }

    script.onerror = (error) => {
      console.error("[v0] Failed to load PayPal SDK:", error)
      setScriptError(true)
      onError("Failed to load PayPal SDK")
    }

    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [onError])

  useEffect(() => {
    if (isScriptLoaded && window.paypal && !hostedFieldsRef.current) {
      initializeHostedFields()
    }
  }, [isScriptLoaded])

  const initializeHostedFields = async () => {
    try {
      console.log("[v0] Initializing PayPal Hosted Fields")

      const hostedFields = await window.paypal.HostedFields.render({
        createOrder: () => {
          return fetch("/api/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: installmentAmount.toFixed(2),
              currency: "CAD",
              invoice_id: contractData?.contractId,
              description: `${contractData?.serviceAddress} - ${isInstallment ? `Payment 1 of ${renewalState?.paymentSchedule}` : "Full Payment"}`,
              isInstallment,
              totalInstallments: isInstallment ? Number.parseInt(renewalState?.paymentSchedule) : 1,
            }),
          })
            .then((res) => res.json())
            .then((data) => data.id)
        },
        styles: {
          ".valid": { color: "green" },
          ".invalid": { color: "red" },
          input: {
            "font-size": "16px",
            "font-family": "system-ui, -apple-system, sans-serif",
            color: "#333",
          },
        },
        fields: {
          number: {
            selector: "#card-number",
            placeholder: "1234 1234 1234 1234",
          },
          cvv: {
            selector: "#cvv",
            placeholder: "123",
          },
          expirationDate: {
            selector: "#expiration-date",
            placeholder: "MM/YY",
          },
        },
      })

      hostedFieldsRef.current = hostedFields
      setPaypalInstance(hostedFields)
      console.log("[v0] PayPal Hosted Fields initialized successfully")
    } catch (error) {
      console.error("[v0] PayPal Hosted Fields initialization error:", error)
      onError("Failed to initialize payment form")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paypalInstance) return

    setIsLoading(true)
    console.log("[v0] Submitting PayPal Hosted Fields payment")

    try {
      const { orderId } = await paypalInstance.submit({
        // Cardholder's first and last name
        cardholderName: `${contractData?.firstName || ""} ${contractData?.lastName || ""}`.trim(),
        // Billing Address
        billingAddress: {
          streetAddress: contractData?.serviceAddress || "",
          locality: contractData?.city || "",
          region: contractData?.province || "",
          postalCode: contractData?.postalCode || "",
          countryCodeAlpha2: "CA",
        },
      })

      console.log("[v0] PayPal order created:", orderId)

      // Capture the order
      const captureResponse = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })

      const captureResult = await captureResponse.json()

      if (captureResult.success) {
        console.log("[v0] PayPal payment captured successfully")
        onSuccess()
      } else {
        throw new Error(captureResult.error || "Payment capture failed")
      }
    } catch (error) {
      console.error("[v0] PayPal payment error:", error)
      onError(error instanceof Error ? error.message : "Payment failed")
    } finally {
      setIsLoading(false)
    }
  }

  if (scriptError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
          <CardDescription>Unable to load embedded payment form</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-gray-600">
            <p>The embedded payment form couldn't be loaded.</p>
            <p>Please use the alternative payment method below.</p>
          </div>

          {onFallback && (
            <Button onClick={onFallback} className="w-full">
              Continue with PayPal Checkout
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  if (!isScriptLoaded) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading payment form...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Credit Card Payment
        </CardTitle>
        <CardDescription>Enter your credit card details securely. Powered by PayPal.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>Service Address:</span>
              <span className="font-medium">{contractData?.serviceAddress}</span>
            </div>
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (13%):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            {platinumUpgrade > 0 && (
              <div className="flex justify-between">
                <span>Platinum Upgrade:</span>
                <span>${platinumUpgrade.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>{isInstallment ? `Payment 1 of ${renewalState?.paymentSchedule}:` : "Total:"}</span>
              <span>${installmentAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Hosted Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Card Number</label>
              <div id="card-number" className="border rounded-md p-3 min-h-[48px]"></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Expiry Date</label>
                <div id="expiration-date" className="border rounded-md p-3 min-h-[48px]"></div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">CVV</label>
                <div id="cvv" className="border rounded-md p-3 min-h-[48px]"></div>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <Shield className="h-4 w-4 text-blue-600" />
            <span>Your payment information is encrypted and secure. Processed by PayPal.</span>
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isLoading || !paypalInstance}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing Payment...
              </>
            ) : (
              `Pay $${installmentAmount.toFixed(2)} Securely`
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
