"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Copy } from "lucide-react"

export default function AuthCheckHelper() {
  const [domain, setDomain] = useState("kodiaksnowremoval.ca")
  const [secret, setSecret] = useState("uzZ8!nJ1t!F0K^pX")
  const url = `https://${domain}/wp-json/kodiak/v1/auth-check`

  const macLinux = `curl -sS -H 'x-kodiak-secret: ${secret}' '${url}'`
  const powershell = `curl.exe -sS -H "x-kodiak-secret: ${secret}" "${url}"`

  const secretForBash = secret.replaceAll("!", "\\\\!")
  const cloudways = `curl -sS -H 'x-kodiak-secret: ${secretForBash}' '${url}'`
  const disableHist = `set +H  # or: set +o histexpand`

  const [copied, setCopied] = useState<string | null>(null)
  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1200)
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">WP Auth‑Check Command Builder</h1>

      <Card>
        <CardHeader>
          <CardTitle>Parameters</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="domain">Domain</Label>
            <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="secret">x-kodiak-secret</Label>
            <Input id="secret" value={secret} onChange={(e) => setSecret(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>macOS/Linux/Cloudways SSH</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea value={macLinux} readOnly className="font-mono text-sm min-h-[70px]" />
          <Button onClick={() => copy(macLinux, "nix")} size="sm" variant="secondary">
            <Copy className="w-4 h-4 mr-1" />
            {copied === "nix" ? "Copied" : "Copy"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Windows PowerShell</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea value={powershell} readOnly className="font-mono text-sm min-h-[70px]" />
          <Button onClick={() => copy(powershell, "ps")} size="sm" variant="secondary">
            <Copy className="w-4 h-4 mr-1" />
            {copied === "ps" ? "Copied" : "Copy"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cloudways SSH (safe: escapes !)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea value={cloudways} readOnly className="font-mono text-sm min-h-[70px]" />
          <Button onClick={() => copy(cloudways, "cw")} size="sm" variant="secondary">
            <Copy className="w-4 h-4 mr-1" />
            {copied === "cw" ? "Copied" : "Copy"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Disable history expansion (current session)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea value={disableHist} readOnly className="font-mono text-sm min-h-[56px]" />
          <Button onClick={() => copy(disableHist, "hx")} size="sm" variant="secondary">
            <Copy className="w-4 h-4 mr-1" />
            {copied === "hx" ? "Copied" : "Copy"}
          </Button>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Use these as-is in your terminal. Do not wrap the URL in brackets like {"[https://...](https://...)"} — that is
        Markdown and will break the command.
      </p>
    </main>
  )
}
