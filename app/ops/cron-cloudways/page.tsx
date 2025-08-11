"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Copy } from "lucide-react"
import { useState } from "react"

const secret = "uzZ8!nJ1t!F0K^pX"
const url = "https://kodiaksnowremoval.ca/wp-json/kodiak/v1/process-due"

// Full shell command for Advanced tab
const fullCommand = `/usr/bin/curl -sS --fail -X POST -H 'x-kodiak-secret: ${secret}' '${url}' --max-time 45 -o /dev/null`

// Flags-only for Basic modal when Type=cURL
const curlFlagsOnly = `-sS --fail -X POST -H 'x-kodiak-secret: ${secret}' '${url}' --max-time 45 -o /dev/null`

// Full crontab lines with schedule prefix
const fullWithEvery5 = `*/5 * * * * ${fullCommand}`
const fullWith0920UTC = `20 9 * * * ${fullCommand}`
const fullWith1320UTC = `20 13 * * * ${fullCommand}`

export default function CloudwaysCronHelp() {
  const [copied, setCopied] = useState<string | null>(null)

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Cloudways Cron — Copy‑ready Commands</h1>

      <Card>
        <CardHeader>
          <CardTitle>Advanced tab (paste full command)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="full">Command</Label>
          <div className="relative">
            <Textarea id="full" value={fullCommand} readOnly className="font-mono text-sm min-h-[120px]" />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => copy(fullCommand, "full")}
              className="absolute top-2 right-2"
              aria-label="Copy full command"
            >
              <Copy className="h-4 w-4 mr-1" />
              {copied === "full" ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Paste only the command above. Do not include any "Command:" prefix and do not wrap the URL in brackets.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Basic modal — Type = cURL (flags only)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="flags">Command (flags)</Label>
          <div className="relative">
            <Textarea id="flags" value={curlFlagsOnly} readOnly className="font-mono text-sm min-h-[120px]" />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => copy(curlFlagsOnly, "flags")}
              className="absolute top-2 right-2"
              aria-label="Copy flags"
            >
              <Copy className="h-4 w-4 mr-1" />
              {copied === "flags" ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            In the Basic modal, set Type to cURL, then paste the flags above. Cloudways will prepend the curl binary.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Advanced tab — include schedule prefix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            In the Cloudways Advanced editor, paste the entire line including the schedule and the command. Do not add
            any "Command:" prefix and do not wrap the URL in brackets.
          </p>
          <div className="space-y-2">
            <Label>Every 5 minutes (testing)</Label>
            <div className="relative">
              <Textarea readOnly value={fullWithEvery5} className="font-mono text-sm min-h-[90px]" />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => copy(fullWithEvery5, "adv5")}
                className="absolute top-2 right-2"
              >
                {copied === "adv5" ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Daily 05:20 local (UTC‑4) → 09:20 UTC</Label>
            <div className="relative">
              <Textarea readOnly value={fullWith0920UTC} className="font-mono text-sm min-h-[90px]" />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => copy(fullWith0920UTC, "adv0920")}
                className="absolute top-2 right-2"
              >
                {copied === "adv0920" ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Daily 09:20 local (UTC‑4) → 13:20 UTC</Label>
            <div className="relative">
              <Textarea readOnly value={fullWith1320UTC} className="font-mono text-sm min-h-[90px]" />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => copy(fullWith1320UTC, "adv1320")}
                className="absolute top-2 right-2"
              >
                {copied === "adv1320" ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedules (server is UTC, WP/local is UTC‑4)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="list-disc pl-5 space-y-1">
            <li>Run at 05:20 local (UTC‑4) → set Minutes=20, Hours=9 (09:20 UTC)</li>
            <li>Run at 09:20 local (UTC‑4) → set Minutes=20, Hours=13 (13:20 UTC)</li>
            <li>Quick test → Minutes=*/5, Hours=*, Days=*, Month=*, Weeks=*</li>
          </ul>
          <p className="text-muted-foreground">
            Keep the server timezone as UTC. In WordPress Settings → General set Timezone to{" "}
            <span className="font-mono">America/Toronto</span>. In your app&apos;s environment, set{" "}
            <span className="font-mono">WP_TZ=America/Toronto</span>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual one‑off test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="manual">Run from any terminal</Label>
          <div className="relative">
            <Textarea
              id="manual"
              value={`curl -sS --fail -X POST -H 'x-kodiak-secret: ${secret}' '${url}'`}
              readOnly
              className="font-mono text-sm min-h-[120px]"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => copy(`curl -sS --fail -X POST -H 'x-kodiak-secret: ${secret}' '${url}'`, "manual")}
              className="absolute top-2 right-2"
              aria-label="Copy manual test command"
            >
              <Copy className="h-4 w-4 mr-1" />
              {copied === "manual" ? "Copied" : "Copy"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
