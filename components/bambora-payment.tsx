"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CreditCard, Loader2, ArrowLeft } from "lucide-react"

export interface BamboraPaymentProps {
  contractData: any
  renewalState: any
  paymentAmount: number
  onPaymentComplete: () => void
  onBack: () => void
}

export function BamboraPayment({
  contractData,
  renewalState,
  paymentAmount,
  onPaymentComplete,
  onBack,
}: BamboraPaymentProps) {
  const [paymentToken, setPaymentToken] = useState("")
  const [bamboraLoaded, setBamboraLoaded] = useState(false)
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [scriptError, setScriptError] = useState<string | null>(null)
  const [serverNote, setServerNote] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const [billingData, setBillingData] = useState({
    cardholder_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "ON",
    postal_code: "",
    country: "CA",
  })

  const checkoutRef = useRef<any>(null)
  const fieldsRef = useRef<any>({})
  const scriptRef = useRef<HTMLScriptElement | null>(null)

  const fixedAmount = Math.round(paymentAmount * 100) / 100
  const totalInstallments = renewalState?.selectedPayments || 1
  const isRecurring = totalInstallments > 1

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.message === "Script error." || event.filename?.includes("bambora")) {
        setScriptError("Failed to load Bambora payment system. Please refresh and try again.")
        setFormError("Payment system unavailable. Please refresh the page.")
      }
    }
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = String(event?.reason?.message || "")
      if (msg.includes("bambora") || msg.includes("customcheckout")) {
        setScriptError("Bambora payment system error. Please refresh and try again.")
        setFormError("Payment system error. Please refresh the page.")
      }
    }
    window.addEventListener("error", handleGlobalError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)
    loadBamboraScript()
    return () => {
      window.removeEventListener("error", handleGlobalError)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
      if (scriptRef.current && document.head.contains(scriptRef.current)) document.head.removeChild(scriptRef.current)
    }
  }, [])

  function loadBamboraScript() {
    try {
      const existing = document.querySelector('script[src*="customcheckout"]')
      if (existing) existing.remove()
      if (typeof (window as any).customcheckout !== "undefined") {
        initializeBambora()
        return
      }
      const script = document.createElement("script")
      script.src = "https://libs.na.bambora.com/customcheckout/1/customcheckout.js"
      script.async = true
      script.crossOrigin = "anonymous"
      script.onload = () => {
        setScriptLoaded(true)
        setScriptError(null)
        setTimeout(initializeBambora, 100)
      }
      script.onerror = () => {
        setScriptError("Failed to load payment system")
        setFormError("Failed to load payment system. Please refresh.")
      }
      scriptRef.current = script
      document.head.appendChild(script)
    } catch {
      setScriptError("Failed to initialize payment system")
      setFormError("Failed to initialize payment system")
    }
  }

  function initializeBambora() {
    try {
      if (typeof (window as any).customcheckout === "undefined") {
        setTimeout(initializeBambora, 200)
        return
      }
      const checkout = (window as any).customcheckout({ cvv: "required" })
      if (!checkout) throw new Error("Failed to create checkout instance")
      checkoutRef.current = checkout
      const cardNumber = checkout.create("card-number")
      const cardCvv = checkout.create("cvv")
      const cardExpiry = checkout.create("expiry")
      fieldsRef.current = { cardNumber, cardCvv, cardExpiry }
      setTimeout(() => {
        try {
          cardNumber.mount("#card-number")
          cardCvv.mount("#card-cvv")
          cardExpiry.mount("#card-expiry")
          setBamboraLoaded(true)
          setFormError(null)
        } catch {
          setFormError("Failed to initialize payment fields. Please refresh the page.")
        }
      }, 150)
    } catch {
      setFormError("Could not initialize the payment form. Please refresh the page.")
    }
  }

  function handleInputChange(field: string, value: string) {
    setBillingData((prev) => ({ ...prev, [field]: value }))
  }

  function validateForm() {
    const required = ["cardholder_name", "email", "phone", "address", "city", "state", "postal_code"] as const
    for (const f of required) {
      // @ts-ignore
      if (!billingData[f]?.trim()) {
        setFormError(`Please fill in the ${String(f).replace("_", " ")} field`)
        return false
      }
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingData.email.trim())
    if (!emailOk) {
      setFormError("Please enter a valid email address")
      return false
    }
    const phoneDigits = billingData.phone.replace(/\D/g, "")
    if (phoneDigits.length < 10) {
      setFormError("Phone number must be at least 10 digits")
      return false
    }
    if (billingData.country === "CA") {
      const pc = billingData.postal_code.replace(/\s+/g, "").toUpperCase()
      if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(pc)) {
        setFormError("Please enter a valid Canadian postal code (e.g., V6B1A1)")
        return false
      }
    }
    return true
  }

  function niceServerError(status: number, rawText: string) {
    try {
      const j = rawText ? JSON.parse(rawText) : null
      const msg = j?.error || j?.message || `HTTP ${status}`
      const details = j?.failures?.length ? ` • ${j.failures.length} scheduling failure(s)` : ""
      return `${msg}${details}`
    } catch {
      return rawText?.slice(0, 240) || `HTTP ${status}`
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setServerNote(null)
    if (!validateForm()) return
    if (!bamboraLoaded || !checkoutRef.current) {
      setFormError("Payment form is not ready. Please wait or refresh.")
      return
    }
    setProcessing(true)

    try {
      checkoutRef.current.createToken(async (result: any) => {
        try {
          if (result?.error) {
            const msg = result.error.message || "Card validation failed"
            setFormError(msg)
            return
          }
          if (!result?.token) {
            setFormError("Failed to create payment token. Please try again.")
            return
          }

          const endpoint = isRecurring ? "/api/charge-initial-and-queue" : "/api/process-bambora-payment"
          const payload = isRecurring
            ? {
                token: result.token,
                amount: fixedAmount,
                installments: totalInstallments,
                billingData,
                contractData,
              }
            : {
                token: result.token,
                amount: fixedAmount,
                isRecurring: false,
                contractData,
                billingData,
              }

          const resp = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })

          const text = await resp.text()
          if (!resp.ok) {
            const msg = niceServerError(resp.status, text)
            setFormError(`Payment failed: ${msg}`)
            return
          }

          let json: any = {}
          try {
            json = text ? JSON.parse(text) : {}
          } catch {
            // ignore malformed JSON
          }

          if (json?.success === false || json?.ok === false) {
            const msg = json?.error || json?.message || "Payment processing failed"
            setFormError(`Payment failed: ${msg}`)
            return
          }

          if (json?.message) setServerNote(json.message)
          setPaymentComplete(true)
          onPaymentComplete()
        } catch (err: any) {
          const msg = err?.message || "Server error"
          setFormError(msg)
        } finally {
          setProcessing(false)
        }
      })
    } catch {
      setFormError("Failed to process payment. Please refresh and try again.")
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {scriptError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Payment System Error</AlertTitle>
          <AlertDescription>
            {scriptError}
            <br />
            <Button
              variant="outline"
              size="sm"
              className="mt-2 bg-transparent"
              onClick={() => {
                setScriptError(null)
                setFormError(null)
                loadBamboraScript()
              }}
            >
              Retry Loading Payment System
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Payment Form */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CreditCard className="w-6 h-6 text-green-600" />
            <CardTitle className="text-2xl">Credit Card Payment</CardTitle>
          </div>
          <CardDescription>
            {isRecurring
              ? `Processing ${totalInstallments} installments (first payment today: $${fixedAmount.toFixed(2)})`
              : `One-time payment of $${fixedAmount.toFixed(2)}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardholder_name">Cardholder Name *</Label>
              <Input
                id="cardholder_name"
                required
                value={billingData.cardholder_name}
                onChange={(e) => handleInputChange("cardholder_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                required
                value={billingData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                required
                value={billingData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                required
                value={billingData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  required
                  value={billingData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">Postal Code *</Label>
                <Input
                  id="postal_code"
                  required
                  value={billingData.postal_code}
                  onChange={(e) => handleInputChange("postal_code", e.target.value.toUpperCase())}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">Province/State *</Label>
                <Select value={billingData.state} onValueChange={(v) => handleInputChange("state", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BC">British Columbia</SelectItem>
                    <SelectItem value="ON">Ontario</SelectItem>
                    <SelectItem value="AB">Alberta</SelectItem>
                    <SelectItem value="SK">Saskatchewan</SelectItem>
                    <SelectItem value="QC">Quebec</SelectItem>
                    <SelectItem value="NB">New Brunswick</SelectItem>
                    <SelectItem value="NS">Nova Scotia</SelectItem>
                    <SelectItem value="PE">Prince Edward Island</SelectItem>
                    <SelectItem value="NL">Newfoundland and Labrador</SelectItem>
                    <SelectItem value="NT">Northwest Territories</SelectItem>
                    <SelectItem value="NU">Nunavut</SelectItem>
                    <SelectItem value="YT">Yukon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Select value={billingData.country} onValueChange={(v) => handleInputChange("country", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Card Number *</Label>
              <div
                id="card-number"
                className="border rounded-md px-3 py-2 min-h-[40px] bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expiry Date *</Label>
                <div
                  id="card-expiry"
                  className="border rounded-md px-3 py-2 min-h-[40px] bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label>CVV *</Label>
                <div
                  id="card-cvv"
                  className="border rounded-md px-3 py-2 min-h-[40px] bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
                />
              </div>
            </div>

            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Validation Error</AlertTitle>
                <AlertDescription className="whitespace-pre-line">{formError}</AlertDescription>
              </Alert>
            )}

            {serverNote && (
              <Alert>
                <AlertTitle>Server</AlertTitle>
                <AlertDescription className="whitespace-pre-line">{serverNote}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between pt-4 gap-3">
              <Button size="lg" variant="outline" onClick={onBack} className="min-w-[140px] bg-transparent">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                type="submit"
                disabled={processing || !bamboraLoaded || !!scriptError}
                className="min-w-[140px] bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : isRecurring ? (
                  "Complete your renewal"
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Process Payment
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {!bamboraLoaded && !scriptError && (
        <div className="flex items-center justify-center py-8 text-slate-600">
          <Loader2 className="w-6 h-6 animate-spin mr-3" />
          <span>{scriptLoaded ? "Initializing secure payment form..." : "Loading payment system..."}</span>
        </div>
      )}
    </div>
  )
}

export default BamboraPayment
