"use client";

import { useMemo, useState } from "react";
import { AdminGate } from "@/components/admin-gate";
import { Badge, Button, Card, Field, Input, PageHeader } from "@/components/ui";
import { useDemo } from "@/lib/demo-store";
import { formatDateTime } from "@/lib/format";

export default function IntegrationsPage() {
  const { state, reprocessEvent, updateSettings, toast } = useDemo();
  const sources = ["Website", "Meta Ads", "Google Ads"] as const;
  const emptyMeta = { verifyToken: "", appSecret: "", pageAccessToken: "", pageId: "" };
  const [meta, setMeta] = useState(state.settings.meta ?? emptyMeta);
  const [saving, setSaving] = useState(false);
  const callbackUrl = useMemo(() => {
    if (typeof window === "undefined") return "/api/webhooks/meta";
    return `${window.location.origin}/api/webhooks/meta`;
  }, []);
  const metaReady = Boolean(
    meta.verifyToken &&
      (meta.appSecret || state.settings.meta?.appSecret) &&
      (meta.pageAccessToken || state.settings.meta?.pageAccessToken),
  );

  const saveMeta = async () => {
    setSaving(true);
    try {
      await updateSettings({ meta });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminGate>
      <PageHeader
        title="Integrations"
        subtitle="Website and Meta Lead Ads create CRM leads. Failed items can be reprocessed."
      />
      <Card className="mb-4">
        <h2 className="font-semibold">Website webhook</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          vospaces.com POSTs JSON to <code>/api/webhooks/website</code> with HMAC headers after a form is saved.
        </p>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Success is 202. The same submission_id does not create a second lead.
        </p>
      </Card>
      <Card className="mb-4">
        <h2 className="font-semibold">Meta Lead Ads</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          In Meta Developer Console, add this callback URL, subscribe the Page to <code>leadgen</code>, then paste tokens below.
          Instant Form fills become CRM leads with source Meta Ads and use Assignment percentages.
        </p>
        {callbackUrl.includes("localhost") ? (
          <p className="mt-2 text-sm text-[#b45309]">
            Meta cannot reach localhost. After Vercel deploy, use{" "}
            <code>https://vs-crm-psi.vercel.app/api/webhooks/meta</code> and save tokens on the live CRM.
          </p>
        ) : null}
        <Field label="Callback URL">
          <div className="flex gap-2">
            <Input readOnly value={callbackUrl} onFocus={(e) => e.currentTarget.select()} />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(callbackUrl).then(() => toast("Callback URL copied", "ok"));
              }}
            >
              Copy
            </Button>
          </div>
        </Field>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Verify token">
            <Input
              value={meta.verifyToken}
              onChange={(e) => setMeta({ ...meta, verifyToken: e.target.value })}
              placeholder="Any string you also enter in Meta"
            />
          </Field>
          <Field label="Page ID">
            <Input
              value={meta.pageId}
              onChange={(e) => setMeta({ ...meta, pageId: e.target.value })}
              placeholder="Optional — only accept this Page"
            />
          </Field>
          <Field label="App secret">
            <Input
              type="password"
              value={meta.appSecret}
              onChange={(e) => setMeta({ ...meta, appSecret: e.target.value })}
              placeholder="From Meta app settings"
            />
          </Field>
          <Field label="Page access token">
            <Input
              type="password"
              value={meta.pageAccessToken}
              onChange={(e) => setMeta({ ...meta, pageAccessToken: e.target.value })}
              placeholder="Page token with leads_retrieval"
            />
          </Field>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          App secret and page token are stored encrypted. You can also set META_VERIFY_TOKEN, META_APP_SECRET and META_PAGE_ACCESS_TOKEN on Vercel.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={saveMeta} disabled={saving}>{saving ? "Saving…" : "Save Meta"}</Button>
          <p className="self-center text-sm text-[var(--muted)]">
            {metaReady ? "Configured — Meta can send test leads." : "Save verify token, app secret and page token to go live."}
          </p>
        </div>
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
      <Button
        className="mt-3"
        variant="outline"
        onClick={async () => {
          const failed = state.incomingEvents.filter((e) => e.source === "Meta Ads" && e.status === "failed");
          if (!failed.length) {
            toast("No failed Meta events", "info");
            return;
          }
          for (const event of failed) await reprocessEvent(event.id);
        }}
      >
        Reprocess failed Meta events
      </Button>
    </AdminGate>
  );
}
