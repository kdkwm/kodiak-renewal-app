"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, FileCheck, ArrowRight } from "lucide-react"

interface ReviewStepProps {
  contractData: any
  renewalState: any
  setRenewalState: any
  onNext: () => void
  onPrev: () => void
  showBackButton?: boolean
}

export function ReviewStep({
  contractData,
  renewalState,
  setRenewalState,
  onNext,
  onPrev,
  showBackButton = true,
}: ReviewStepProps) {
  const platinumUpgrade =
    !contractData.isPlatinum && renewalState?.platinumService ? (contractData.isWalkway ? 250 : 150) : 0
  const subtotal = contractData.contractSubtotal + platinumUpgrade
  const hst = Math.round(subtotal * 0.13 * 100) / 100
  const total = Math.round((subtotal + hst) * 100) / 100
  const paymentAmount = Math.round((total / (renewalState?.selectedPayments || 1)) * 100) / 100

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <FileCheck className="w-6 h-6 text-purple-600" />
          <CardTitle className="text-2xl">Review Contract</CardTitle>
        </div>
        <CardDescription>Please review your contract details before proceeding</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contract Summary */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Service Address:</span>
            <span className="font-medium">{contractData.serviceAddress}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-600">Service Level:</span>
            <div className="text-right">
              {contractData.isPlatinum || renewalState?.platinumService ? (
                <Badge className="bg-yellow-500">Platinum Service</Badge>
              ) : (
                <Badge variant="secondary">Standard Service</Badge>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Cost Breakdown */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${contractData.contractSubtotal.toFixed(2)}</span>
          </div>

          {platinumUpgrade > 0 && (
            <div className="flex justify-between">
              <span>Platinum Upgrade</span>
              <span>${platinumUpgrade.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>HST (13%)</span>
            <span>${hst.toFixed(2)}</span>
          </div>

          <Separator />

          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span className="text-green-600">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 gap-3">
          {showBackButton ? (
            <Button size="lg" variant="outline" onClick={onPrev} className="min-w-[140px] bg-transparent">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          ) : (
            <div />
          )}
          <Button size="lg" onClick={onNext} className="bg-purple-600 hover:bg-purple-700">
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
