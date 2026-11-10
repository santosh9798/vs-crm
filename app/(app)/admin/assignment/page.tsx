"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AdminGate } from "@/components/admin-gate";
import { Button, Card, Input, PageHeader, Select } from "@/components/ui";
import { useDemo } from "@/lib/demo-store";
import type { AssignmentShare, LeadSource } from "@/lib/types";

const SOURCES: LeadSource[] = ["Website", "Meta Ads", "Google Ads", "Manual"];

type Row = { userId: string; percent: number };

function groupShares(shares: AssignmentShare[]): Record<LeadSource, Row[]> {
  return Object.fromEntries(
    SOURCES.map((source) => [
      source,
      shares.filter((s) => s.source === source).map((s) => ({ userId: s.userId, percent: s.percent })),
    ]),
  ) as Record<LeadSource, Row[]>;
}

function totalOf(rows: Row[]) {
  return rows.reduce((sum, row) => sum + (Number(row.percent) || 0), 0);
}

export default function AssignmentPage() {
  const { state, setAssignmentShares } = useDemo();
  const sales = state.users.filter((u) => u.role === "salesperson");
  const activeSales = sales.filter((u) => u.isActive);
  const [draft, setDraft] = useState<Record<LeadSource, Row[]>>(() => groupShares(state.assignmentShares));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(groupShares(state.assignmentShares));
  }, [state.assignmentShares]);

  const sourceLeads = useMemo(() => {
    const fresh = state.leads.filter((l) => !l.duplicateOfId);
    return Object.fromEntries(
      SOURCES.map((source) => [source, fresh.filter((l) => l.source === source)]),
    ) as Record<LeadSource, typeof fresh>;
  }, [state.leads]);

  const invalid = SOURCES.some((source) => {
    const rows = draft[source] ?? [];
    if (rows.length === 0) return false;
    return totalOf(rows) !== 100 || rows.some((row) => !row.userId);
  });

  const setRows = (source: LeadSource, rows: Row[]) => {
    setDraft((current) => ({ ...current, [source]: rows }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await setAssignmentShares(
        SOURCES.flatMap((source) =>
          (draft[source] ?? [])
            .filter((row) => row.userId && Number(row.percent) > 0)
            .map((row) => ({ source, userId: row.userId, percent: Number(row.percent) })),
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminGate>
      <PageHeader
        title="Assignment"
        subtitle="Put more than one salesperson on the same source. New leads from that source rotate by the percentages you set. Duplicates stay with the existing owner and do not count."
        actions={
          <Button onClick={save} disabled={invalid || saving}>
            {saving ? "Saving…" : "Save assignment"}
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {SOURCES.map((source) => {
          const rows = draft[source] ?? [];
          const total = totalOf(rows);
          const used = new Set(rows.map((row) => row.userId));
          const available = activeSales.filter((u) => !used.has(u.id));
          const leads = sourceLeads[source] ?? [];
          const ok = rows.length === 0 || total === 100;
          return (
            <Card key={source}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{source}</h2>
                  <p className="text-sm text-[var(--muted)]">
                    {rows.length === 0
                      ? "No one assigned — new leads go to Admin."
                      : `${leads.length} assigned leads in this source`}
                  </p>
                </div>
                <p className={`text-sm font-medium ${ok ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>
                  {rows.length === 0 ? "Admin" : `${total}%`}
                </p>
              </div>
              {rows.map((row, index) => {
                const person = sales.find((u) => u.id === row.userId);
                const assigned = leads.filter((l) => l.assignedTo === row.userId).length;
                const share = leads.length ? (assigned / leads.length) * 100 : 0;
                const options = activeSales.filter((u) => u.id === row.userId || !used.has(u.id));
                return (
                  <div key={`${source}-${index}`} className="mb-3 grid grid-cols-[1fr_88px_auto] items-end gap-2">
                    <div>
                      <Select
                        value={row.userId}
                        onChange={(e) => {
                          const next = [...rows];
                          next[index] = { ...row, userId: e.target.value };
                          setRows(source, next);
                        }}
                      >
                        <option value="">Select salesperson</option>
                        {options.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </Select>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {person ? `Actual ${share.toFixed(1)}% · ${assigned} leads` : "Pick who should receive this share"}
                      </p>
                    </div>
                    <div>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={row.percent}
                        onChange={(e) => {
                          const next = [...rows];
                          next[index] = { ...row, percent: Number(e.target.value) };
                          setRows(source, next);
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setRows(source, rows.filter((_, i) => i !== index))}
                      aria-label={`Remove ${person?.name ?? "salesperson"} from ${source}`}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                );
              })}
              {available.length ? (
                <button
                  type="button"
                  className="mt-1 inline-flex items-center gap-1 text-sm text-[var(--accent)]"
                  onClick={() => {
                    const leftover = Math.max(0, 100 - total);
                    setRows(source, [
                      ...rows,
                      { userId: available[0].id, percent: rows.length === 0 ? 100 : leftover || 1 },
                    ]);
                  }}
                >
                  <Plus size={14} /> Add salesperson
                </button>
              ) : null}
            </Card>
          );
        })}
      </div>
    </AdminGate>
  );
}
