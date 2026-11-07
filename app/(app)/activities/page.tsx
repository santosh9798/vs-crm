"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDemo, useUserMap } from "@/lib/demo-store";
import { formatDateTime } from "@/lib/format";
import { Badge, Button, Card, PageHeader, Select } from "@/components/ui";

export default function ActivitiesPage() {
  const { state, currentUser, isAdmin, can, completeActivity } = useDemo();
  const users = useUserMap();
  const [status, setStatus] = useState("pending");
  const [type, setType] = useState("");

  const mine = useMemo(() => {
    const leadIds = new Set(
      (isAdmin || can("view_all_leads")
        ? state.leads
        : state.leads.filter((l) => l.assignedTo === currentUser?.id)
      ).map((l) => l.id),
    );
    return state.activities.filter((a) => leadIds.has(a.leadId));
  }, [state, isAdmin, can, currentUser]);

  const rows = mine.filter((a) => {
    if (status && a.status !== status) return false;
    if (type && a.type !== type) return false;
    return true;
  });

  const now = new Date("2026-11-05T12:00:00+05:30").getTime();

  return (
    <div>
      <PageHeader
        title="Activities"
        subtitle="Calls, meetings, follow-ups and tasks"
        actions={
          <div className="flex gap-2">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </Select>
            <Select value={type} onChange={(e) => setType(e.target.value)} className="w-40">
              <option value="">All types</option>
              {["call", "meeting", "follow-up", "email", "task"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </div>
        }
      />
      <Card className="overflow-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-[#f7f9f7] text-left text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Activity</th>
              <th className="px-4 py-3 font-medium">Lead</th>
              <th className="px-4 py-3 font-medium">Due</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 80).map((a) => {
              const lead = state.leads.find((l) => l.id === a.leadId);
              const overdue = a.status === "pending" && new Date(a.dueAt).getTime() < now;
              return (
                <tr key={a.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3">
                    <p className="font-medium capitalize">{a.type}</p>
                    <p className="text-xs text-[var(--muted)]">{a.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    {lead ? <Link className="text-[var(--accent)]" href={`/leads/${lead.id}`}>{lead.name}</Link> : "—"}
                  </td>
                  <td className="px-4 py-3">{formatDateTime(a.dueAt)}</td>
                  <td className="px-4 py-3">{users[a.assignedTo]?.name}</td>
                  <td className="px-4 py-3">
                    {overdue ? <Badge color="#c45c5c">Overdue</Badge> : <Badge color={a.status === "completed" ? "#16A34A" : "#F5A524"}>{a.status}</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    {a.status === "pending" ? (
                      <Button size="sm" variant="outline" onClick={() => completeActivity(a.id)}>
                        Mark complete
                      </Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
