"use client";

import { useState } from "react";
import { AdminGate } from "@/components/admin-gate";
import { Button, Card, Field, Input, PageHeader, Select } from "@/components/ui";
import { useDemo } from "@/lib/demo-store";
import type { AssignmentRule, LeadSource } from "@/lib/types";

const SOURCES: LeadSource[] = ["Website", "Meta Ads", "Google Ads", "Manual"];

export default function AssignmentPage() {
  const { state, setAssignmentRules, setAllocations } = useDemo();
  const [rules, setRules] = useState<AssignmentRule[]>(state.assignmentRules);
  const sales = state.users.filter((u) => u.role === "salesperson");
  const [percents, setPercents] = useState<Record<string, number>>(
    Object.fromEntries(sales.map((u) => [u.id, u.allocationPercent])),
  );
  const total = Object.values(percents).reduce((a, b) => a + b, 0);
  const leadTotal = state.leads.length;

  return (
    <AdminGate>
      <PageHeader
        title="Assignment"
        subtitle="Source rule first, then percentage rotation. Duplicates assigned to an existing owner do not count toward the percentages."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Source rules</h2>
          <p className="mb-4 text-sm text-[var(--muted)]">Leave as Percentage rotation to use weighted allocation.</p>
          {SOURCES.map((source) => {
            const rule = rules.find((r) => r.source === source);
            return (
              <Field key={source} label={source}>
                <Select
                  value={rule?.userId ?? ""}
                  onChange={(e) => {
                    const userId = e.target.value || null;
                    setRules((rs) => rs.map((r) => (r.source === source ? { ...r, userId } : r)));
                  }}
                >
                  <option value="">Percentage rotation</option>
                  {sales.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </Select>
              </Field>
            );
          })}
          <Button className="mt-3" onClick={() => setAssignmentRules(rules)}>Save rules</Button>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Percentage allocation</h2>
          <p className="mb-4 text-sm text-[var(--muted)]">Total must equal 100 before save. Changing this starts a new cycle.</p>
          {sales.map((u) => {
            const assigned = state.leads.filter((l) => l.assignedTo === u.id).length;
            const share = leadTotal ? (assigned / leadTotal) * 100 : 0;
            return (
              <div key={u.id} className="mb-3 grid grid-cols-[1fr_100px] items-end gap-3">
                <div>
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    Actual share {share.toFixed(1)}% · target {u.allocationPercent}% · {assigned} assigned
                  </p>
                </div>
                <Field label="%">
                  <Input
                    type="number"
                    value={percents[u.id] ?? 0}
                    onChange={(e) => setPercents((p) => ({ ...p, [u.id]: Number(e.target.value) }))}
                  />
                </Field>
              </div>
            );
          })}
          <p className={`text-sm ${total === 100 ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>Total {total}%</p>
          <Button className="mt-3" onClick={() => setAllocations(percents)}>Save allocation</Button>
        </Card>
      </div>
    </AdminGate>
  );
}
