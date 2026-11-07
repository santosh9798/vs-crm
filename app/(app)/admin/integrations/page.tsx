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
        subtitle="Raw events are saved before processing. Failed items can be reprocessed. Token expiry is warned here."
      />
      <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
        Meta long-lived token expires in 18 days. Renew it before leads stop flowing.
      </div>
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
      <Button className="mt-3" variant="outline" onClick={() => toast("Sync started (preview)")}>
        Run scheduled sync now
      </Button>
    </AdminGate>
  );
}
