"use client"

import { useEffect, useMemo, useState } from "react"
import { Home, CheckCircle } from "lucide-react"
import { ServiceLevelStep } from "../components/service-level-step"
import { PaymentScheduleStep } from "../components/payment-schedule-step"
import { ReviewStep } from "../components/review-step"
import { PaymentMethodSection } from "../components/payment-method-section"

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
  selectedPaymentMethod: "etransfer" | "credit" | "paypal" | ""
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
    () => (isPlatinum: boolean, company: Company) => {
      if (isPlatinum || company === "KSB") {
        return [
          { id: 1, title: "Review Contract", description: "Review your contract details" },
          { id: 2, title: "Payment & Checkout", description: "Select payment schedule and complete payment" },
          { id: 3, title: "Payment", description: "Complete your payment" },
        ]
      } else {
        return [
          { id: 1, title: "Service Level", description: "Choose your service level" },
          { id: 2, title: "Review Contract", description: "Review your contract details" },
          { id: 3, title: "Payment & Checkout", description: "Select payment schedule and complete payment" },
          { id: 4, title: "Payment", description: "Complete your payment" },
        ]
      }
    },
    [],
  )

  const [steps, setSteps] = useState(getSteps(false, "KSR"))

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
        selectedPayments: 1,
        selectedPaymentMethod: "",
        currentStep: isPlatinum || company === "KSB" ? 1 : 1,
      }

      setContractData(data)
      setHasValidData(true)
      setSteps(getSteps(isPlatinum, company))
      setRenewalState(initialRenewalState)

      localStorage.setItem("kodiak-contract-data", JSON.stringify(data))
      localStorage.removeItem("kodiak-renewal-state")

      if (url.search) {
        window.history.replaceState(null, "", url.pathname)
      }
    } else {
      const savedContractData = localStorage.getItem("kodiak-contract-data")

      if (savedContractData) {
        try {
          const contractData = JSON.parse(savedContractData)

          const freshRenewalState: RenewalState = {
            platinumService: false,
            selectedPayments: 1,
            selectedPaymentMethod: "",
            currentStep: contractData.isPlatinum || contractData.company === "KSB" ? 1 : 1,
          }

          setContractData(contractData)
          setRenewalState(freshRenewalState)
          setHasValidData(true)
          setSteps(getSteps(contractData.isPlatinum, contractData.company))
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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" })
      if (window.pageYOffset > 0) {
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
      }
    }, 100)
  }

  const nextStep = () => {
    setRenewalState((prev) => {
      const next = Math.min(prev.currentStep + 1, steps.length)
      return { ...prev, currentStep: next }
    })
    scrollToTop()
  }

  const prevStep = () => {
    setRenewalState((prev) => {
      const prevStep = Math.max(prev.currentStep - 1, 1)
      return { ...prev, currentStep: prevStep }
    })
    scrollToTop()
  }

  const goToStep = (step: number) => {
    setRenewalState((prev) => ({ ...prev, currentStep: step }))
    scrollToTop()
  }

  const handlePaymentComplete = () => {
    setPaymentComplete(true)
    localStorage.removeItem("kodiak-contract-data")
    localStorage.removeItem("kodiak-renewal-state")
    scrollToTop()
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
          <p className="text-slate-600">Make sure you click on the renewal link in your email</p>
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
    if (contractData.isPlatinum || contractData.company === "KSB") {
      switch (renewalState.currentStep) {
        case 1:
          return (
            <ReviewStep
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
            <PaymentScheduleStep
              contractData={contractData}
              renewalState={renewalState}
              setRenewalState={setRenewalState}
              onNext={nextStep}
              onPrev={prevStep}
              showBackButton={true}
              onPaymentComplete={handlePaymentComplete}
              showPaymentMethod={true}
            />
          )
        case 3:
          return (
            <div className="max-w-2xl mx-auto">
              <PaymentMethodSection
                contractData={contractData}
                renewalState={renewalState}
                setRenewalState={setRenewalState}
                onPaymentComplete={handlePaymentComplete}
                onBack={prevStep}
                showAsSelection={false}
              />
            </div>
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
            <ReviewStep
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
            <PaymentScheduleStep
              contractData={contractData}
              renewalState={renewalState}
              setRenewalState={setRenewalState}
              onNext={nextStep}
              onPrev={prevStep}
              showBackButton={true}
              onPaymentComplete={handlePaymentComplete}
              showPaymentMethod={true}
            />
          )
        case 4:
          return (
            <div className="max-w-2xl mx-auto">
              <PaymentMethodSection
                contractData={contractData}
                renewalState={renewalState}
                setRenewalState={setRenewalState}
                onPaymentComplete={handlePaymentComplete}
                onBack={prevStep}
                showAsSelection={false}
              />
            </div>
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

              <div className="mt-4 p-4 bg-blue-100 rounded-lg border border-blue-200 max-w-2xl mx-auto">
                <div className="flex items-center justify-center gap-2 text-blue-800">
                  <Home className="w-5 h-5" />
                  <span className="font-medium">Renewing 2025/26 service for:</span>
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
                {steps.slice(0, -1).map((step, index) => {
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
                      {index < steps.length - 2 && (
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
