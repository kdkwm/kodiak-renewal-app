import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, CircleDashed, Key } from "lucide-react"

interface Step {
  type: "add-env-var" | "trigger-deployment" | "test-app"
  stepName: string
  description?: string
}

interface StepsCardProps {
  steps: Step[]
}

export function StepsCard({ steps }: StepsCardProps) {
  const getIcon = (type: Step["type"]) => {
    switch (type) {
      case "add-env-var":
        return <Key className="w-5 h-5 text-blue-500" />
      case "trigger-deployment":
        return <CircleDashed className="w-5 h-5 text-green-500" />
      case "test-app":
        return <CheckCircle className="w-5 h-5 text-purple-500" />
      default:
        return null
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Next Steps</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">{getIcon(step.type)}</div>
            <div>
              <h3 className="font-semibold text-lg">{step.stepName}</h3>
              {step.description && <p className="text-sm text-muted-foreground">{step.description}</p>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
