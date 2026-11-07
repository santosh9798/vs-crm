"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDemo, useStageMap, useUserMap } from "@/lib/demo-store";
import {
  DEFAULT_LEAD_COLUMNS,
  LEAD_COLUMNS_KEY,
  buildLeadColumns,
  compareLeadSortValues,
  getLeadCellText,
  getLeadSortValue,
  orderColumnIds,
} from "@/lib/lead-columns";
import { ColumnPicker } from "@/components/column-picker";
import { Badge, Button, Card, Field, Input, PageHeader, Select, cn } from "@/components/ui";
import type { CustomField, Lead, LeadSource, Stage } from "@/lib/types";

const SOURCES: LeadSource[] = ["Website", "Meta Ads", "Google Ads", "Manual"];

function LeadsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { visibleLeads, state, can, isAdmin } = useDemo();
  const stages = useStageMap();
  const users = useUserMap();

  const [q, setQ] = useState(params.get("q") ?? "");
  const [source, setSource] = useState(params.get("source") ?? "");
  const [stage, setStage] = useState(params.get("stage") ?? "");
  const [assignee, setAssignee] = useState(params.get("assignee") ?? "");
  const [duplicate, setDuplicate] = useState(params.get("duplicate") ?? "");
  const [followup, setFollowup] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pref, setPref] = useState("");
  const [sort, setSort] = useState("created");
  const [dir, setDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [columnIds, setColumnIds] = useState(DEFAULT_LEAD_COLUMNS);
  const [columnsReady, setColumnsReady] = useState(false);
  const pageSize = 25;

  const catalog = useMemo(() => buildLeadColumns(state.customFields), [state.customFields]);
  const fieldMap = useMemo(
    () => Object.fromEntries(state.customFields.map((f) => [f.key, f])),
    [state.customFields],
  );
  const visibleColumns = useMemo(
    () => orderColumnIds(columnIds, catalog).map((id) => catalog.find((c) => c.id === id)!).filter(Boolean),
    [columnIds, catalog],
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LEAD_COLUMNS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed) && parsed.length) setColumnIds(parsed);
      }
    } catch {
      /* keep defaults */
    }
    setColumnsReady(true);
  }, []);

  useEffect(() => {
    if (!columnsReady) return;
    localStorage.setItem(LEAD_COLUMNS_KEY, JSON.stringify(columnIds));
  }, [columnIds, columnsReady]);

  const filtered = useMemo(() => {
    let rows = [...visibleLeads];
    const query = q.trim().toLowerCase();
    if (query) {
      rows = rows.filter(
        (l) =>
          l.name.toLowerCase().includes(query) ||
          l.email.toLowerCase().includes(query) ||
          l.mobile.replace(/\s/g, "").includes(query.replace(/\s/g, "")),
      );
    }
    if (source) rows = rows.filter((l) => l.source === source);
    if (stage) rows = rows.filter((l) => l.stageId === stage);
    if (assignee) rows = rows.filter((l) => l.assignedTo === assignee);
    if (duplicate === "yes") rows = rows.filter((l) => l.duplicateOfId);
    if (duplicate === "no") rows = rows.filter((l) => !l.duplicateOfId);
    if (followup === "off") rows = rows.filter((l) => l.followupsDisabled);
    if (followup === "on") rows = rows.filter((l) => !l.followupsDisabled);
    if (from) rows = rows.filter((l) => l.createdAt.slice(0, 10) >= from);
    if (to) rows = rows.filter((l) => l.createdAt.slice(0, 10) <= to);
    if (pref) rows = rows.filter((l) => l.customValues.preferred_location === pref);
    rows.sort((a, b) =>
      compareLeadSortValues(
        getLeadSortValue(a, sort, { stages, fields: fieldMap }),
        getLeadSortValue(b, sort, { stages, fields: fieldMap }),
        dir,
      ),
    );
    return rows;
  }, [visibleLeads, q, source, stage, assignee, duplicate, followup, from, to, pref, sort, dir, stages, fieldMap]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);
  const cellCtx = { stages, users, fields: fieldMap };

  const toggleSort = (columnId: string, kind?: "text" | "number" | "date") => {
    if (sort === columnId) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(columnId);
      setDir(kind === "text" ? "asc" : "desc");
      setPage(1);
    }
  };

  const exportFile = () => {
    const header = visibleColumns.map((c) => c.label);
    const lines = filtered.map((l) =>
      visibleColumns.map((c) => `"${getLeadCellText(l, c.id, cellCtx).replaceAll('"', '""')}"`).join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads-preview.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={`${filtered.length} in this view`}
        actions={
          <>
            <ColumnPicker
              options={catalog}
              selected={visibleColumns.map((c) => c.id)}
              onChange={setColumnIds}
              onReset={() => setColumnIds(DEFAULT_LEAD_COLUMNS)}
            />
            {can("export") ? (
              <>
                <Button variant="outline" size="sm" onClick={exportFile}>Export CSV</Button>
                <Button variant="outline" size="sm" onClick={exportFile}>Export Excel</Button>
              </>
            ) : null}
            <Button size="sm" onClick={() => router.push("/leads/new")}>Add lead</Button>
          </>
        }
      />

      <Card className="mb-4 grid gap-3 md:grid-cols-3 lg:grid-cols-4">
        <Field label="Search">
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Name, mobile, email" />
        </Field>
        <Field label="Source">
          <Select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {SOURCES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Stage">
          <Select value={stage} onChange={(e) => { setStage(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {state.stages.filter((s) => s.isActive).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </Field>
        {isAdmin || can("view_all_leads") ? (
          <Field label="Assigned">
            <Select value={assignee} onChange={(e) => { setAssignee(e.target.value); setPage(1); }}>
              <option value="">All</option>
              {state.users.filter((u) => u.role === "salesperson").map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label="Duplicate">
          <Select value={duplicate} onChange={(e) => { setDuplicate(e.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="yes">Duplicates</option>
            <option value="no">Originals</option>
          </Select>
        </Field>
        <Field label="Follow-ups">
          <Select value={followup} onChange={(e) => setFollowup(e.target.value)}>
            <option value="">All</option>
            <option value="on">Enabled</option>
            <option value="off">Disabled</option>
          </Select>
        </Field>
        <Field label="Created from">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="Created to">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label="Preferred location">
          <Select value={pref} onChange={(e) => setPref(e.target.value)}>
            <option value="">All</option>
            {["Delhi", "Mumbai", "Bengaluru", "Hyderabad", "Pune"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
      </Card>

      <Card className="overflow-auto p-0">
        <table className="w-full text-sm" style={{ minWidth: Math.max(720, visibleColumns.length * 148) }}>
          <thead className="bg-[#f7f9f7] text-left text-[var(--muted)]">
            <tr>
              {visibleColumns.map((col, i) => (
                <th
                  key={col.id}
                  className={
                    col.sortKind
                      ? "cursor-pointer select-none whitespace-nowrap px-4 py-3 font-medium hover:text-[var(--ink)]"
                      : "whitespace-nowrap px-4 py-3 font-medium"
                  }
                  style={i === 0 ? { position: "sticky", left: 0, zIndex: 11, background: "#f7f9f7" } : undefined}
                  onClick={col.sortKind ? () => toggleSort(col.id, col.sortKind) : undefined}
                >
                  {col.label}
                  {col.sortKind && sort === col.id ? (dir === "asc" ? " ↑" : " ↓") : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((l) => (
              <LeadRow
                key={l.id}
                lead={l}
                columns={visibleColumns}
                stage={stages[l.stageId]}
                fields={fieldMap}
                cellCtx={cellCtx}
              />
            ))}
          </tbody>
        </table>
        {slice.length === 0 ? <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">No leads match these filters.</p> : null}
      </Card>
      <div className="mt-3 flex items-center justify-between text-sm text-[var(--muted)]">
        <span>Page {page} of {pages} · 25 per page</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}

function LeadRow({
  lead,
  columns,
  stage,
  fields,
  cellCtx,
}: {
  lead: Lead;
  columns: { id: string; label: string }[];
  stage?: Stage;
  fields: Record<string, CustomField | undefined>;
  cellCtx: Parameters<typeof getLeadCellText>[2];
}) {
  return (
    <tr className="group border-t border-[var(--line)] hover:bg-[#f8fbf9]">
      {columns.map((col, i) => (
        <td
          key={col.id}
          className={cn(
            "max-w-[240px] truncate whitespace-nowrap px-4 py-3",
            i === 0 && "sticky left-0 z-10 bg-white group-hover:bg-[#f8fbf9]",
          )}
          title={getLeadCellText(lead, col.id, cellCtx)}
        >
          <LeadCell lead={lead} columnId={col.id} stage={stage} fields={fields} cellCtx={cellCtx} />
        </td>
      ))}
    </tr>
  );
}

function LeadCell({
  lead,
  columnId,
  stage,
  fields,
  cellCtx,
}: {
  lead: Lead;
  columnId: string;
  stage?: Stage;
  fields: Record<string, CustomField | undefined>;
  cellCtx: Parameters<typeof getLeadCellText>[2];
}) {
  if (columnId === "name") {
    return (
      <Link href={`/leads/${lead.id}`} className="font-medium text-[var(--ink)] hover:text-[var(--accent)]">
        {lead.name}
      </Link>
    );
  }
  if (columnId === "stage") {
    return <Badge color={stage?.color}>{stage?.name}</Badge>;
  }
  if (columnId === "flags") {
    return (
      <div className="flex flex-wrap gap-1">
        {lead.duplicateOfId ? <Badge color="#c9852a">Duplicate</Badge> : null}
        {lead.unsubscribed ? <Badge color="#c45c5c">Unsubscribed</Badge> : null}
        {lead.followupsDisabled ? <Badge color="#6b7280">Follow-ups off</Badge> : null}
        {!lead.duplicateOfId && !lead.unsubscribed && !lead.followupsDisabled ? "—" : null}
      </div>
    );
  }
  if (columnId.startsWith("cf:") && fields[columnId.slice(3)]?.type === "checkbox") {
    const on = Boolean(lead.customValues[columnId.slice(3)]);
    return on ? <Badge>Yes</Badge> : <span className="text-[var(--muted)]">No</span>;
  }
  return <>{getLeadCellText(lead, columnId, cellCtx)}</>;
}

export default function LeadsPage() {
  return (
    <Suspense>
      <LeadsInner />
    </Suspense>
  );
}
