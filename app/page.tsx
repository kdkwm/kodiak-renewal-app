"use client"

import { useEffect, useMemo, useState } from "react"
import { Home, CheckCircle } from "lucide-react"
import { ServiceLevelStep } from "../components/service-level-step"
import { PaymentScheduleStep } from "../components/payment-schedule-step"
import { PaymentMethodStep } from "../components/payment-method-step"
import { ReviewStep } from "../components/review-step"

type Company = "KSR" | "KSB"

interface ContractData {
  serviceAddress: string
  contractSubtotal: number
  company: Company
  contractId: string
  isPlatinum: boolean
  isWalkway: boolean
}

interface RenewalState {
  platinumService: boolean
  selectedPayments: number
  selectedPaymentMethod: "etransfer" | "credit" | ""
  currentStep: number
}

function parseBool(v: string | null | undefined, fallback = false) {
  if (!v) return fallback
  const s = v.trim().toLowerCase()
  return s === "1" || s === "true" || s === "yes" || s === "y"
}

function parseNumber(v: string | null | undefined, fallback = 0) {
  if (!v) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export default function ContractRenewal() {
  const [contractData, setContractData] = useState<ContractData | null>(null)
  const [renewalState, setRenewalState] = useState<RenewalState>({
    platinumService: false,
    selectedPayments: 1,
    selectedPaymentMethod: "",
    currentStep: 1,
  })
  const [loading, setLoading] = useState(true)
  const [hasValidData, setHasValidData] = useState(false)
  const [paymentComplete, setPaymentComplete] = useState(false)

  const getSteps = useMemo(
    () => (isPlatinum: boolean) => {
      if (isPlatinum) {
        return [
          { id: 1, title: "Payment Schedule", description: "Select payment options" },
          { id: 2, title: "Review Contract", description: "Review your selections" },
          { id: 3, title: "Payment Method", description: "Complete your payment" },
        ]
      } else {
        return [
          { id: 1, title: "Service Level", description: "Choose your service level" },
          { id: 2, title: "Payment Schedule", description: "Select payment options" },
          { id: 3, title: "Review Contract", description: "Review your selections" },
          { id: 4, title: "Payment Method", description: "Complete your payment" },
        ]
      }
    },
    [],
  )

  const [steps, setSteps] = useState(getSteps(false))

  useEffect(() => {
    const url = new URL(window.location.href)
    const q = url.searchParams

    const address = q.get("address") || ""
    const subtotal = parseNumber(q.get("subtotal"), Number.NaN)
    const companyQ = (q.get("company") || "").toUpperCase()
    const company: Company = companyQ === "KSB" ? "KSB" : "KSR"
    const contractId = q.get("contractId") || q.get("contract_id") || ""

    const isPlatinum = parseBool(q.get("isPlatinum") || q.get("platinum"), false)
    const isWalkway = parseBool(q.get("isWalkway") || q.get("walkway"), false)
    const payments = Math.max(1, Math.min(12, parseNumber(q.get("payments"), 1)))
    const method = (q.get("method") as RenewalState["selectedPaymentMethod"]) || ""

    const hasQueryParams = address.length > 0 && Number.isFinite(subtotal) && subtotal >= 0 && contractId.length > 0

    if (hasQueryParams) {
      const data: ContractData = {
        serviceAddress: address,
        contractSubtotal: subtotal,
        company,
        contractId,
        isPlatinum,
        isWalkway,
      }

      const initialRenewalState: RenewalState = {
        platinumService: false,
        selectedPayments: payments,
        selectedPaymentMethod: method || "",
        currentStep: isPlatinum ? 1 : 1,
      }

      setContractData(data)
      setHasValidData(true)
      setSteps(getSteps(isPlatinum))
      setRenewalState(initialRenewalState)

      localStorage.setItem("kodiak-contract-data", JSON.stringify(data))
      localStorage.setItem("kodiak-renewal-state", JSON.stringify(initialRenewalState))

      if (url.search) {
        window.history.replaceState(null, "", url.pathname)
      }
    } else {
      const savedContractData = localStorage.getItem("kodiak-contract-data")
      const savedRenewalState = localStorage.getItem("kodiak-renewal-state")

      if (savedContractData && savedRenewalState) {
        try {
          const contractData = JSON.parse(savedContractData)
          const renewalState = JSON.parse(savedRenewalState)

          setContractData(contractData)
          setRenewalState(renewalState)
          setHasValidData(true)
          setSteps(getSteps(contractData.isPlatinum))
        } catch (e) {
          localStorage.removeItem("kodiak-contract-data")
          localStorage.removeItem("kodiak-renewal-state")
          setHasValidData(false)
          setContractData(null)
        }
      } else {
        setHasValidData(false)
        setContractData(null)
      }
    }

    setLoading(false)
  }, [getSteps])

  useEffect(() => {
    if (hasValidData && renewalState) {
      localStorage.setItem("kodiak-renewal-state", JSON.stringify(renewalState))
    }
  }, [renewalState, hasValidData])

  const nextStep = () => {
    setRenewalState((prev) => {
      const next = Math.min(prev.currentStep + 1, steps.length)
      return { ...prev, currentStep: next }
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const prevStep = () => {
    setRenewalState((prev) => {
      const prevStep = Math.max(prev.currentStep - 1, 1)
      return { ...prev, currentStep: prevStep }
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const goToStep = (step: number) => {
    setRenewalState((prev) => ({ ...prev, currentStep: step }))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handlePaymentComplete = () => {
    setPaymentComplete(true)
    localStorage.removeItem("kodiak-contract-data")
    localStorage.removeItem("kodiak-renewal-state")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading contract information...</p>
        </div>
      </div>
    )
  }

  if (!hasValidData || !contractData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-6">
        <div className="max-w-xl mx-auto bg-white border rounded-lg shadow p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Contract not found</h2>
          <p className="text-slate-600">Please contact us for more details.</p>
        </div>
      </div>
    )
  }

  if (paymentComplete) {
    const platinumUpgrade =
      !contractData.isPlatinum && renewalState.platinumService ? (contractData.isWalkway ? 250 : 150) : 0
    const subtotal = contractData.contractSubtotal + platinumUpgrade
    const total = subtotal * 1.13
    const paymentAmount = total / (renewalState?.selectedPayments || 1)

    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-green-700 mb-4">Contract Renewal Complete!</h1>
            <p className="text-xl text-green-600 mb-8">Thank you for renewing your winter service contract</p>

            <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
              <div className="space-y-4">
                <div className="border-b pb-6 mb-6">
                  <h3 className="text-lg font-bold text-green-700 mb-4">What's next?</h3>
                  <div className="space-y-3 text-left">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-green-700 text-sm">
                        <strong>Marker Installation:</strong> We'll begin installing markers at some point in
                        October/November. We'll stay in touch about when the installation process starts for your area.
                      </p>
                    </div>
                    {(renewalState?.selectedPayments || 1) > 1 && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-green-700 text-sm">
                          <strong>Future Payments:</strong> We'll automatically capture your remaining payments every 30
                          days until your full contract amount is complete. No action required on your part.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-green-800 mb-4">
                  <Home className="w-5 h-5" />
                  <span className="font-medium">Service Address:</span>
                </div>
                <p className="text-green-700 font-semibold">{contractData.serviceAddress}</p>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Service Level:</span>
                    <span className="font-semibold">{renewalState?.platinumService ? "Platinum" : "Standard"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Schedule:</span>
                    <span className="font-semibold">
                      {(renewalState?.selectedPayments || 1) === 1
                        ? "One-time Payment"
                        : `${renewalState?.selectedPayments || 1} Installments`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Amount:</span>
                    <span className="font-semibold">${paymentAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-green-700 border-t pt-2">
                    <span>Total Contract Value:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-green-600 mb-2">
                A confirmation email has been sent to your registered email address.
              </p>
            </div>

            <div className="text-center mt-8 text-sm text-slate-500">© 2025 Kodiak Snowblowing & Lawncare Inc.</div>
          </div>
        </div>
      </div>
    )
  }

  const renderCurrentStep = () => {
    if (contractData.isPlatinum) {
      switch (renewalState.currentStep) {
        case 1:
          return (
            <PaymentScheduleStep
              contractData={contractData}
              renewalState={renewalState}
              setRenewalState={setRenewalState}
              onNext={nextStep}
              onPrev={prevStep}
              showBackButton={false}
            />
          )
        case 2:
          return (
            <ReviewStep
              contractData={contractData}
              renewalState={renewalState}
              setRenewalState={setRenewalState}
              onNext={nextStep}
              onPrev={prevStep}
            />
          )
        case 3:
          return (
            <PaymentMethodStep
              contractData={contractData}
              renewalState={renewalState}
              setRenewalState={setRenewalState}
              onPrev={prevStep}
              onPaymentComplete={handlePaymentComplete}
            />
          )
        default:
          return null
      }
    } else {
      switch (renewalState.currentStep) {
        case 1:
          return (
            <ServiceLevelStep
              contractData={contractData}
              renewalState={renewalState}
              setRenewalState={setRenewalState}
              onNext={nextStep}
            />
          )
        case 2:
          return (
            <PaymentScheduleStep
              contractData={contractData}
              renewalState={renewalState}
              setRenewalState={setRenewalState}
              onNext={nextStep}
              onPrev={prevStep}
              showBackButton={true}
            />
          )
        case 3:
          return (
            <ReviewStep
              contractData={contractData}
              renewalState={renewalState}
              setRenewalState={setRenewalState}
              onNext={nextStep}
              onPrev={prevStep}
            />
          )
        case 4:
          return (
            <PaymentMethodStep
              contractData={contractData}
              renewalState={renewalState}
              setRenewalState={setRenewalState}
              onPrev={prevStep}
              onPaymentComplete={handlePaymentComplete}
            />
          )
        default:
          return null
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {renewalState.currentStep !== steps.length && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Kodiak Snow Removal</h1>
              <p className="text-slate-600">Winter 2025/2026 Season Renewal</p>

              <div className="mt-4 p-4 bg-blue-100 rounded-lg border border-blue-200 max-w-2xl mx-auto">
                <div className="flex items-center justify-center gap-2 text-blue-800">
                  <Home className="w-5 h-5" />
                  <span className="font-medium">Renewing service for:</span>
                </div>
                <p className="text-blue-700 font-semibold mt-1">{contractData.serviceAddress}</p>
                {contractData.isPlatinum && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Current Platinum Customer
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-center mb-6 px-4">
                {steps.map((step, index) => {
                  const isActive = renewalState.currentStep === step.id
                  const isCompleted = renewalState.currentStep > step.id

                  return (
                    <div key={step.id} className="flex items-center">
                      <div
                        className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 transition-all cursor-pointer font-semibold text-sm sm:text-base ${
                          isCompleted
                            ? "bg-green-500 border-green-500 text-white"
                            : isActive
                              ? "bg-blue-500 border-blue-500 text-white"
                              : "bg-white border-slate-300 text-slate-400"
                        }`}
                        onClick={() => isCompleted && goToStep(step.id)}
                      >
                        {step.id}
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={`w-8 sm:w-14 h-0.5 mx-1 sm:mx-2 ${isCompleted ? "bg-green-500" : "bg-slate-300"}`}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {renderCurrentStep()}

        <div className="text-center mt-8 text-sm text-slate-500">© 2025 Kodiak Snowblowing & Lawncare Inc.</div>
      </div>
    </div>
  )
}
