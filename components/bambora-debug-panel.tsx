"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Bug, CheckCircle, XCircle } from "lucide-react"

export function BamboraDebugPanel() {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<any>(null)

  const runAccountCheck = async () => {
    setTesting(true)
    try {
      const response = await fetch("/api/bambora-account-check")
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Account check failed:", error)
    } finally {
      setTesting(false)
    }
  }

  const runDebugTest = async (testType: string) => {
    setTesting(true)
    try {
      const response = await fetch("/api/bambora-debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testType }),
      })
      const data = await response.json()
      console.log(`Debug test ${testType}:`, data)
    } catch (error) {
      console.error("Debug test failed:", error)
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card className="mb-6 border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-orange-800 text-lg flex items-center gap-2">
          <Bug className="w-5 h-5" />🔍 Bambora Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            <strong>Issue:</strong> "Authorization Failed" with no details from Bambora. Let's systematically test
            what's wrong.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button onClick={runAccountCheck} disabled={testing} variant="outline">
            {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Test Both Accounts
          </Button>

          <Button onClick={() => runDebugTest("credentials")} disabled={testing} variant="outline">
            Test Credentials Only
          </Button>

          <Button onClick={() => runDebugTest("production")} disabled={testing} variant="outline">
            Test Production Account
          </Button>

          <Button onClick={() => runDebugTest("token")} disabled={testing} variant="outline">
            Test Token Method
          </Button>
        </div>

        {results && (
          <div className="mt-4 space-y-3">
            <h3 className="font-semibold">Test Results:</h3>
            {results.results?.map((result: any, index: number) => (
              <div key={index} className="bg-white p-3 rounded border">
                <div className="flex items-center gap-2 mb-2">
                  {result.success ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="font-medium">{result.test}</span>
                </div>
                <div className="text-sm text-slate-600">
                  <div>Merchant: {result.merchantId}</div>
                  <div>Message: {result.message || result.error}</div>
                  {result.errorType && <div>Error Type: {result.errorType}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-orange-700 bg-orange-100 p-3 rounded">
          <strong>Next Steps:</strong>
          <br />
          1. Run tests above to isolate the issue
          <br />
          2. If production works but sandbox fails → Contact Bambora support
          <br />
          3. If both fail → Check credentials in Bambora dashboard
          <br />
          4. Email support with merchant ID: 383613253
        </div>
      </CardContent>
    </Card>
  )
}
