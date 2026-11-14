"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { quotationPlainText, QuotationDocument } from "@/components/quotation-document";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { useDemo, useUserMap } from "@/lib/demo-store";
import { formatDateTime, formatInr } from "@/lib/format";
import { documentPropsFromQuotation } from "@/lib/quotation-view";

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, visibleLeads, can, isAdmin, sendQuotation, toast } = useDemo();
  const users = useUserMap();
  const quote = state.quotations.find((q) => q.id === id);
  const lead = quote
    ? visibleLeads.find((l) => l.id === quote.leadId) ?? state.leads.find((l) => l.id === quote.leadId)
    : undefined;
  const [sending, setSending] = useState(false);
  const canSend = isAdmin || can("send_quotations");
  const jobs = quote
    ? state.emailJobs.filter((e) => e.leadId === quote.leadId && e.templateId === "et_quote")
    : [];

  if (!quote) {
    return (
      <Card>
        <p>This quotation is not in your view.</p>
        <Button className="mt-3" onClick={() => router.push("/quotations")}>Back to quotations</Button>
      </Card>
    );
  }

  const doc = documentPropsFromQuotation(quote, lead?.name);
  const sendLabel = quote.status === "sent" ? "Resend email" : "Send to lead";

  const copyQuote = async () => {
    await navigator.clipboard.writeText(quotationPlainText(doc));
    toast("Quotation copied — paste into email or WhatsApp");
  };

  const send = async () => {
    if (!canSend || sending) return;
    if (!quote.recipient.trim()) {
      toast("This lead has no email address", "err");
      return;
    }
    setSending(true);
    try {
      const result = await sendQuotation(quote.id);
      if (result.mailError) toast(result.mailError, "err");
      else toast(`Quotation emailed to ${quote.recipient}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not send quotation", "err");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <Link href="/quotations" className="text-sm text-[var(--accent)]">← Quotations</Link>
      <PageHeader
        title={`Quotation · ${formatInr(quote.totalAmount)}`}
        subtitle={lead ? `${lead.name} · ${quote.recipient || "no email"}` : quote.recipient}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={copyQuote}>Copy text</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>Print</Button>
            {canSend ? (
              <Button size="sm" disabled={sending} onClick={send}>
                {sending ? "Sending…" : sendLabel}
              </Button>
            ) : null}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Badge color={quote.status === "sent" ? "#16A34A" : quote.status === "failed" ? "#c45c5c" : "#F5A524"}>
          {quote.status}
        </Badge>
        <span className="text-[var(--muted)]">
          Created {formatDateTime(quote.createdAt)}
          {quote.sentAt ? ` · emailed ${formatDateTime(quote.sentAt)}` : ""}
          {users[quote.createdBy] ? ` · ${users[quote.createdBy].name}` : ""}
        </span>
        {lead ? (
          <Link className="text-[var(--accent)]" href={`/leads/${lead.id}`}>Open lead</Link>
        ) : null}
      </div>

      {jobs.length > 0 ? (
        <Card className="mb-4 print:hidden">
          <h2 className="mb-2 font-semibold">Email log</h2>
          <ul className="space-y-1 text-sm">
            {jobs.slice(0, 6).map((job) => (
              <li key={job.id} className="flex flex-wrap justify-between gap-2">
                <span>
                  {job.to} · {job.status}
                  {job.response ? ` · ${job.response}` : ""}
                </span>
                <span className="text-[var(--muted)]">{formatDateTime(job.sentAt ?? job.scheduledAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="overflow-auto p-0 print:border-0 print:shadow-none">
        <QuotationDocument {...doc} />
      </Card>
    </div>
  );
}
