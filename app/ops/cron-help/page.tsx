import { CopyField } from '@/components/copy-field'

function buildCommands(domain: string, secret: string) {
  // Escape exclamation marks for safe cron execution
  const safeSecret = secret.replace(/!/g, '\\!')
  const base = `/usr/bin/curl -sS -X POST -H "x-kodiak-secret: ${safeSecret}" https://${domain}/wp-json/kodiak/v1/process-due --max-time 45 -o /dev/null`
  return {
    daily0520: `20 5 * * * ${base}`,
    daily0920: `20 9 * * * ${base}`,
    every15: `*/15 * * * * ${base}`,
    commandOnly: base,
  }
}

export default function CronHelpPage() {
  // Prefilled with your details; adjust if needed.
  const domain = 'kodiaksnowremoval.ca'
  const secret = 'uzZ8!nJ1t!F0K^pX'
  const cmds = buildCommands(domain, secret)

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Cloudways CRON Commands</h1>
      <p className="text-sm text-muted-foreground">
        Copy the lines below into the Cloudways Advanced CRON editor. If the UI separates schedule and command,
        use the "Command only" field in the command box and the schedule fields for timing.
      </p>

      <div className="space-y-4">
        <CopyField label="Daily 05:20 (server time)" value={cmds.daily0520} />
        <CopyField label="Optional retry 09:20" value={cmds.daily0920} />
        <CopyField label="Optional every 15 minutes catch-up" value={cmds.every15} />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">If Cloudways asks for the command only</h2>
        <CopyField label="Command only" value={cmds.commandOnly} />
      </div>

      <div className="prose prose-sm dark:prose-invert">
        <h3>Tips</h3>
        <ul>
          <li>Confirm WordPress timezone in Settings → General.</li>
          <li>Running the job more than once a day is safe: pending items flip to completed after a successful charge, so repeats won&apos;t double-charge.</li>
          <li>You can test now from your machine with: <code>{`curl -sS -X POST -H "x-kodiak-secret: ${secret.replace(/"/g, '\\"')}" https://${domain}/wp-json/kodiak/v1/process-due`}</code></li>
        </ul>
      </div>
    </main>
  )
}
