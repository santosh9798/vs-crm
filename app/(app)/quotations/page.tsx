"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDemo } from "@/lib/demo-store";
import { formatDate, formatInr } from "@/lib/format";
import { Badge, Button, Card, PageHeader } from "@/components/ui";

export default function QuotationsPage() {
  const { state, visibleLeads, can, isAdmin } = useDemo();
  const router = useRouter();
  const leadIds = new Set(visibleLeads.map((l) => l.id));
  const rows = state.quotations.filter((q) => isAdmin || can("view_all_leads") || leadIds.has(q.leadId));
  const canSend = isAdmin || can("send_quotations");

  return (
    <div>
      <PageHeader
        title="Quotations"
        subtitle="Client quotation with 11-month location options, 18% GST, and CA add-ons."
        actions={
          canSend ? (
            <Button onClick={() => router.push("/quotations/new")}>Generate quotation</Button>
          ) : null
        }
      />
      <Card className="overflow-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-[#f7f9f7] text-left text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Lead</th>
              <th className="px-4 py-3 font-medium">Recipient</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((q) => {
              const lead = state.leads.find((l) => l.id === q.leadId);
              return (
                <tr key={q.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3">
                    {lead ? <Link className="text-[var(--accent)]" href={`/leads/${lead.id}`}>{lead.name}</Link> : q.leadId}
                  </td>
                  <td className="px-4 py-3">{q.recipient || "—"}</td>
                  <td className="px-4 py-3">
                    <Link className="text-[var(--accent)]" href={`/quotations/${q.id}`}>
                      {q.items.filter((i) => i.kind !== "ca").map((i) => i.name).join(", ") || "View quotation"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/quotations/${q.id}`}>{formatInr(q.totalAmount)}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={q.status === "sent" ? "#16A34A" : q.status === "failed" ? "#c45c5c" : "#F5A524"}>
                      {q.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{formatDate(q.sentAt ?? q.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">No quotations yet.</p> : null}
      </Card>
    </div>
  );
}
