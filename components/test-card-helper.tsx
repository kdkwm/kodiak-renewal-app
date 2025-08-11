"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, CheckCircle } from "lucide-react"
import { useState } from "react"

// This helper intentionally renders nothing in production to avoid
// any sandbox/test card hints appearing in the UI.
export default function TestCardHelper() {
  const [copiedCard, setCopiedCard] = useState<string | null>(null)

  // Test cards for Bambora sandbox
  const testCards = {
    visa: {
      number: "4030000010001234",
      cvv: "123",
      expiry: "12/25",
      description: "Approved Visa",
    },
    mastercard: {
      number: "5100000010001004",
      cvv: "123",
      expiry: "12/25",
      description: "Approved Mastercard",
    },
    declined: {
      number: "4003050500040005",
      cvv: "123",
      expiry: "12/25",
      description: "Always Declined",
    },
  }

  const copyCardDetails = async (cardType: string, cardData: any) => {
    const details = `Card: ${cardData.number}\nCVV: ${cardData.cvv}\nExpiry: ${cardData.expiry}`

    try {
      await navigator.clipboard.writeText(details)
      setCopiedCard(cardType)
      setTimeout(() => setCopiedCard(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  // Conditionally render the test card helper only in development environment
  if (process.env.NODE_ENV === "development") {
    return (
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 text-lg">🧪 Sandbox Test Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(testCards).map(([cardType, cardData]) => (
              <div key={cardType} className="bg-white p-3 rounded border">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-sm capitalize">{cardData.description}</div>
                    <div className="text-xs text-slate-600 mt-1">
                      {cardData.number}
                      <br />
                      CVV: {cardData.cvv} | Exp: {cardData.expiry}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={copiedCard === cardType ? "default" : "outline"}
                    onClick={() => copyCardDetails(cardType, cardData)}
                    className="ml-2"
                  >
                    {copiedCard === cardType ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-blue-700">
            <strong>Environment:</strong> Sandbox (Merchant ID: 383613253)
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
