"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, TestTube, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

export function SandboxVerificationPanel() {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<any>(null)

  const verifySandbox = async () => {
    setTesting(true)
    try {
      const response = await fetch("/api/verify-bambora-sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await response.json()
      setResults(data)
      console.log("Sandbox verification results:", data)
    } catch (error) {
      console.error("Sandbox verification failed:", error)
      setResults({ error: "Verification failed" })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-blue-800 text-lg flex items-center gap-2">
          <TestTube className="w-5 h-5" />🧪 Sandbox Credentials Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Confirming Sandbox Mode:</strong>
            <br />
            Merchant ID: 383613253
            <br />
            API Key: 0c3a403f7C0547008423f18063C00275
            <br />
            Recurring API Key: 858966679b9942F3Ba0B0462255dA9AE
          </AlertDescription>
        </Alert>

        <Button onClick={verifySandbox} disabled={testing} className="w-full">
          {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TestTube className="w-4 h-4 mr-2" />}
          Verify Sandbox Credentials
        </Button>

        {results && (
          <div className="mt-4 space-y-3">
            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold mb-3">Verification Results:</h3>

              {results.error ? (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-4 h-4" />
                  <span>Error: {results.error}</span>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="text-sm text-slate-600">
                      <div>Environment: {results.environment}</div>
                      <div>Merchant ID: {results.credentials?.merchantId}</div>
                      <div>Endpoint: {results.endpoint}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="border rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        {results.tests?.basic?.success ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="font-medium">Basic Transaction Test</span>
                      </div>
                      <div className="text-sm text-slate-600">
                        <div>Message: {results.tests?.basic?.message}</div>
                        {results.tests?.basic?.transactionId && (
                          <div>Transaction ID: {results.tests?.basic?.transactionId}</div>
                        )}
                      </div>
                    </div>

                    <div className="border rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        {results.tests?.recurring?.success ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="font-medium">Recurring Transaction Test</span>
                      </div>
                      <div className="text-sm text-slate-600">
                        <div>Message: {results.tests?.recurring?.message}</div>
                        {results.tests?.recurring?.recurringId && (
                          <div>Recurring ID: {results.tests?.recurring?.recurringId}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Analysis */}
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <h4 className="font-semibold text-yellow-800 mb-2">Analysis:</h4>
              <div className="text-sm text-yellow-700">
                {results.tests?.basic?.success && results.tests?.recurring?.success ? (
                  <div>✅ Both tests passed! Your sandbox credentials are working correctly.</div>
                ) : results.tests?.basic?.success ? (
                  <div>⚠️ Basic payments work, but recurring payments fail. Recurring billing may not be enabled.</div>
                ) : (
                  <div>❌ Authorization failed. The sandbox account may not be activated for API transactions.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
