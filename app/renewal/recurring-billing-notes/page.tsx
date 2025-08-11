import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function RecurringBillingNotesPage() {
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recurring Billing vs. WordPress Queue</CardTitle>
          <CardDescription>How to avoid proration and keep equal installments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <Alert>
            <AlertTitle>Recommendation</AlertTitle>
            <AlertDescription>
              - For 2–4 equal installments, use the WordPress queue: first payment today, then queue exact future dates and amounts.<br />
              - This guarantees no proration and gives full visibility in your WP CPT queue and logs.<br />
              - Bambora Recurring Billing is best for open-ended subscriptions. It can avoid proration only if you defer the start to the next full cycle date.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h3 className="font-medium">Why WordPress queue is safest for installments</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Equal amounts every time, no automatic proration.</li>
              <li>Clear audit trail in WordPress (CPT entries, statuses, responses).</li>
              <li>Manual “process due now” option for support and testing.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">If you prefer Bambora Recurring Billing</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Charge today as a one-time purchase.</li>
              <li>Start the RB plan on the next full cycle date (e.g., next month same day) to avoid proration.</li>
              <li>RB is not ideal for a fixed number of installments; it shines for ongoing monthly charges.</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button asChild variant="secondary">
              <Link href="/renewal/queue-status">Open Queue Status</Link>
            </Button>
            <Button asChild>
              <Link href="/renewal">Return to Renewal</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rollback</CardTitle>
          <CardDescription>We backed up the v175 “schedule in Bambora” route for instant reverts.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          - File path: backups/v175-process-bambora-payment.ts<br />
          - If you want to revert, copy its contents back into app/api/process-bambora-payment/route.ts.<br />
          - Note: That approach triggers immediate charges (the “schedule” body wasn’t honored).
        </CardContent>
      </Card>
    </main>
  )
}
