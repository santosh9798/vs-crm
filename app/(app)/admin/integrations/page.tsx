"use client";

import { AdminGate } from "@/components/admin-gate";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { useDemo } from "@/lib/demo-store";
import { formatDateTime } from "@/lib/format";

export default function IntegrationsPage() {
  const { state, reprocessEvent, toast } = useDemo();
  const sources = ["Website", "Meta Ads", "Google Ads"] as const;

  return (
    <AdminGate>
      <PageHeader
        title="Integrations"
        subtitle="Website webhook is live. Raw events are saved before processing. Failed items can be reprocessed."
      />
      <Card className="mb-4">
        <h2 className="font-semibold">Website webhook</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          vospaces.com should POST JSON to <code>/api/webhooks/website</code> with HMAC headers.
          Upload <code>vs-crm-webhook.php</code>, <code>vs-crm-webhook-config.php</code> and the updated <code>quick_form_api.php</code> to the website root so landing-page forms create CRM leads.
        </p>
        <pre className="mt-3 overflow-auto rounded-xl bg-[var(--canvas)] p-3 text-xs">
{`POST /api/webhooks/website
X-Timestamp: unix seconds
X-Signature: sha256=<HMAC-SHA256 of timestamp + "." + raw body>

{
  "submission_id": "web-000123",
  "submitted_at": "2026-11-09T10:15:00+05:30",
  "name": "Asha Verma",
  "mobile": "+91 98765 43210",
  "email": "asha@example.com",
  "state": "Delhi",
  "city": "New Delhi",
  "message": "Need a virtual office address",
  "page_url": "https://vospaces.com/...",
  "utm": { "source": "google", "campaign": "delhi-vo" }
}`}
        </pre>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Success is 202 with an event_id. Retries with the same submission_id do not create a second lead.
          Meta and Google Ads stay for a later phase.
        </p>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        {sources.map((source) => {
          const events = state.incomingEvents.filter((e) => e.source === source);
          const last = events.sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1))[0];
          const failed = events.filter((e) => e.status === "failed").length;
          return (
            <Card key={source}>
              <p className="text-sm text-[var(--muted)]">{source}</p>
              <p className="mt-2 text-lg font-semibold">{failed ? `${failed} failed` : "Healthy"}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Last event {last ? formatDateTime(last.receivedAt) : "—"}
              </p>
            </Card>
          );
        })}
      </div>
      <Card className="mt-4 overflow-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-[#f7f9f7] text-left text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">External ID</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Error</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {state.incomingEvents.map((e) => (
              <tr key={e.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3">{formatDateTime(e.receivedAt)}</td>
                <td className="px-4 py-3">{e.source}</td>
                <td className="px-4 py-3">{e.externalId}</td>
                <td className="px-4 py-3">
                  <Badge color={e.status === "failed" ? "#c45c5c" : "#16A34A"}>{e.status}</Badge>
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">{e.lastError ?? "—"}</td>
                <td className="px-4 py-3">
                  {e.status === "failed" ? (
                    <Button size="sm" variant="outline" onClick={() => reprocessEvent(e.id)}>
                      Reprocess
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Button className="mt-3" variant="outline" onClick={() => toast("Meta and Google sync is not connected yet", "info")}>
        Run scheduled sync now
      </Button>
    </AdminGate>
  );
}
