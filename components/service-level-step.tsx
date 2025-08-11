"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Crown } from "lucide-react"

interface ServiceLevelStepProps {
  contractData: any
  renewalState: any
  setRenewalState: any
  onNext: () => void
}

export function ServiceLevelStep({ contractData, renewalState, setRenewalState, onNext }: ServiceLevelStepProps) {
  const platinumPrice = contractData.isWalkway ? 250 : 150
  const serviceArea = contractData.isWalkway ? "driveway and walkway" : "driveway"

  const handlePlatinumChoice = (upgrade: boolean) => {
    setRenewalState((prev: any) => ({ ...prev, platinumService: upgrade }))
    setTimeout(onNext, 300)
  }

  // Skip this step if already platinum or not KSR
  if (contractData.company !== "KSR" || contractData.isPlatinum) {
    setTimeout(onNext, 100)
    return null
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Crown className="w-6 h-6 text-blue-600 flex-shrink-0" />
          <CardTitle className="text-xl sm:text-2xl">Upgrade to platinum coverage</CardTitle>
        </div>
        <CardDescription>Choose your service level for the 2025/2026 season</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Service Comparison */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2 w-full max-w-md mx-auto">
            <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-lg flex-1">
              <div className="text-lg sm:text-xl font-bold">2.5-4.9cm</div>
              <div className="text-xs font-semibold uppercase tracking-wide">Platinum</div>
            </div>
            <div className="text-center flex-shrink-0 px-2">
              <div className="w-8 h-8 bg-white border-2 border-slate-300 rounded-full flex items-center justify-center font-bold text-slate-600 text-sm">
                VS
              </div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-slate-400 to-slate-500 text-white rounded-lg flex-1">
              <div className="text-lg sm:text-xl font-bold">5cm+</div>
              <div className="text-xs font-semibold uppercase tracking-wide">Standard</div>
            </div>
          </div>

          <p className="text-center mt-4 text-amber-800 font-medium text-sm sm:text-base leading-relaxed">
            Platinum covers lighter snowfalls (2.5-4.9cm) for your {serviceArea} that standard service doesn't
          </p>
        </div>

        {/* Options */}
        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full p-4 sm:p-6 h-auto border-2 hover:border-green-500 hover:bg-green-50 transition-all bg-transparent"
            onClick={() => handlePlatinumChoice(true)}
          >
            <div className="text-left w-full">
              <div className="font-semibold text-sm sm:text-base lg:text-lg text-green-700 leading-tight">
                Yes, upgrade my {serviceArea} to Platinum
              </div>
              <div className="text-green-600 font-bold text-base sm:text-lg lg:text-xl mt-1">
                +${platinumPrice} for the season
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full p-4 sm:p-6 h-auto border-2 hover:border-slate-500 hover:bg-slate-50 transition-all bg-transparent"
            onClick={() => handlePlatinumChoice(false)}
          >
            <div className="text-left w-full">
              <div className="font-semibold text-sm sm:text-base lg:text-lg text-slate-700 leading-tight">
                No, I'm okay with standard 5cm+ service
              </div>
              <div className="text-slate-600 mt-1 text-xs sm:text-sm lg:text-base">
                Continue with current service level
              </div>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
