"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useDemo, useStageMap, useUserMap } from "@/lib/demo-store";
import { formatDate, formatDateTime, formatInr } from "@/lib/format";
import { Badge, Button, Card, Field, Select, Textarea, cn } from "@/components/ui";
import { FieldGroup, groupedFields } from "@/components/custom-field-input";
import { PlannedActivities, ScheduleActivityModal } from "@/components/schedule-activity";
import { citiesInState, locationsInPlace, planNamesFromCatalog, useCatalog } from "@/lib/use-catalog";

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, visibleLeads, updateLead, addNote, addActivity, completeActivity, can, isAdmin, currentUser, toast } =
    useDemo();
  const stages = useStageMap();
  const users = useUserMap();
  const lead = visibleLeads.find((l) => l.id === id) ?? state.leads.find((l) => l.id === id);
  const { catalog } = useCatalog(state.settings.catalogApiUrl, state.settings.catalogApiKey);
  const optionOverrides = useMemo(() => {
    const stateName = String(lead?.customValues?.required_state || lead?.state || "");
    const cityName = String(lead?.customValues?.required_city || lead?.city || "");
    const plans = planNamesFromCatalog(catalog);
    return {
      plan_type: plans.length ? plans : ["GST Registration", "Business Registration", "Mailing Address"],
      required_state: [...catalog.states].sort((a, b) => a.name.localeCompare(b.name)).map((s) => s.name),
      required_city: citiesInState(catalog, stateName).map((c) => c.name),
      preferred_location: locationsInPlace(catalog, stateName, cityName),
    };
  }, [catalog, lead]);

  const [note, setNote] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const notes = state.notes.filter((n) => n.leadId === id);
  const activities = state.activities.filter((a) => a.leadId === id);
  const emails = state.emailJobs.filter((e) => e.leadId === id);
  const quotes = state.quotations.filter((q) => q.leadId === id);
  const original = lead ? state.leads.find((l) => l.id === lead.duplicateOfId) : undefined;
  const dupes = lead ? state.leads.filter((l) => l.duplicateOfId === lead.id) : [];
  const groups = groupedFields(state.customFields);

  const timeline = useMemo(() => {
    if (!lead) return [];
    const items: { at: string; title: string; detail: string }[] = [
      { at: lead.createdAt, title: "Lead created", detail: `${lead.source} · assigned to ${users[lead.assignedTo]?.name}` },
    ];
    notes.forEach((n) => items.push({ at: n.createdAt, title: "Note", detail: `${users[n.authorId]?.name}: ${n.body}` }));
    activities.forEach((a) =>
      items.push({
        at: a.completedAt ?? a.dueAt,
        title: `${a.type} · ${a.status}`,
        detail: a.description,
      }),
    );
    quotes.forEach((q) =>
      items.push({
        at: q.sentAt ?? q.createdAt,
        title: `Quotation ${q.status}`,
        detail: formatInr(q.totalAmount),
      }),
    );
    emails.forEach((e) => items.push({ at: e.sentAt ?? e.scheduledAt, title: `Email ${e.status}`, detail: e.to }));
    return items.sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [lead, notes, activities, quotes, emails, users]);

  if (!lead) {
    return (
      <Card>
        <p>This lead is not in your view.</p>
        <Button className="mt-3" onClick={() => router.push("/leads")}>Back to leads</Button>
      </Card>
    );
  }

  const stage = stages[lead.stageId];
  const canReassign = isAdmin || can("reassign_leads");
  const canQuote = isAdmin || can("send_quotations");

  const setCustom = (key: string, value: string | number | boolean | null) => {
    updateLead(lead.id, { customValues: { ...lead.customValues, [key]: value } });
  };

  return (
    <div>
      <Link href="/leads" className="text-sm text-[var(--accent)]">← Leads</Link>
      <div className="mb-3 mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{lead.name}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{lead.mobile} · {lead.email}</p>
        </div>
        <div className="flex gap-2">
          {canQuote ? (
            <Button onClick={() => router.push(`/quotations/new?leadId=${lead.id}`)}>Generate quotation</Button>
          ) : null}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {state.stages.filter((s) => s.isActive).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              updateLead(lead.id, { stageId: s.id });
              toast(`Stage set to ${s.name}`);
            }}
            className={cn(
              "rounded-full px-3 py-1 text-sm",
              lead.stageId === s.id ? "text-white" : "bg-white text-[var(--ink)]",
            )}
            style={lead.stageId === s.id ? { background: s.color } : undefined}
          >
            {s.name}
          </button>
        ))}
        {lead.unsubscribed ? <Badge color="#c45c5c">Unsubscribed</Badge> : null}
        {lead.followupsDisabled ? <Badge color="#6b7280">Follow-ups off</Badge> : null}
      </div>

      {(original || dupes.length > 0) && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          {original ? (
            <p>
              Duplicate of{" "}
              <Link className="font-medium text-[var(--accent)]" href={`/leads/${original.id}`}>
                {original.name}
              </Link>
              . Both records are kept.
            </p>
          ) : null}
          {dupes.length > 0 ? (
            <p>
              Linked duplicates:{" "}
              {dupes.map((d, i) => (
                <span key={d.id}>
                  {i > 0 ? ", " : ""}
                  <Link className="font-medium text-[var(--accent)]" href={`/leads/${d.id}`}>{d.name}</Link>
                </span>
              ))}
            </p>
          ) : null}
        </div>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Assigned to">
                <Select
                  value={lead.assignedTo}
                  disabled={!canReassign}
                  onChange={(e) => {
                    updateLead(lead.id, { assignedTo: e.target.value });
                    toast("Lead reassigned");
                  }}
                >
                  {state.users.filter((u) => u.isActive).map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Source">
                <div className="flex h-10 items-center text-sm">{lead.source}</div>
              </Field>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={lead.followupsDisabled}
                onChange={(e) => {
                  updateLead(lead.id, { followupsDisabled: e.target.checked });
                  toast(e.target.checked ? "Automated follow-ups switched off" : "Follow-ups enabled");
                }}
              />
              Disable automated follow-ups for this lead
            </label>

            <div className="mt-6 grid gap-8 lg:grid-cols-2">
              {groups.map((g) => (
                <FieldGroup
                  key={g.name}
                  title={g.name}
                  fields={g.fields}
                  values={lead.customValues}
                  onChange={setCustom}
                  optionOverrides={optionOverrides}
                />
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">Original submitted data</h2>
            <p className="mb-3 text-xs text-[var(--muted)]">Read-only values from the website, Meta or Google.</p>
            <dl className="grid grid-cols-3 gap-y-2 text-sm">
              <dt className="text-[var(--muted)]">City / state</dt>
              <dd className="col-span-2">{lead.city}, {lead.state}</dd>
              <dt className="text-[var(--muted)]">Message</dt>
              <dd className="col-span-2">{lead.message}</dd>
              <dt className="text-[var(--muted)]">Campaign</dt>
              <dd className="col-span-2">{lead.original.campaign ?? "—"}</dd>
              <dt className="text-[var(--muted)]">Ad set</dt>
              <dd className="col-span-2">{lead.original.adSet ?? "—"}</dd>
              <dt className="text-[var(--muted)]">Form</dt>
              <dd className="col-span-2">{lead.original.formName ?? "—"}</dd>
              <dt className="text-[var(--muted)]">Created by</dt>
              <dd className="col-span-2">{lead.createdByType === "user" ? users[lead.createdBy]?.name : lead.createdBy}</dd>
              <dt className="text-[var(--muted)]">Received</dt>
              <dd className="col-span-2">{formatDateTime(lead.createdAt)}</dd>
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">Log note</h2>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note. Notes cannot be edited later." />
            <Button
              className="mt-2"
              size="sm"
              onClick={() => {
                if (!note.trim()) return;
                addNote(lead.id, note.trim());
                setNote("");
              }}
            >
              Log note
            </Button>
            <div className="mt-4 space-y-3">
              {notes.map((n) => (
                <div key={n.id} className="rounded-xl bg-[var(--canvas)] p-3 text-sm">
                  <p>{n.body}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {users[n.authorId]?.name} · {formatDateTime(n.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <h2 className="mb-3 font-semibold">Quotations</h2>
              {quotes.length === 0 ? <p className="text-sm text-[var(--muted)]">None yet.</p> : null}
              {quotes.map((q) => (
                <div key={q.id} className="mb-2 flex items-center justify-between rounded-xl bg-[var(--canvas)] px-3 py-2 text-sm">
                  <span>{formatInr(q.totalAmount)} · {q.status}</span>
                  <span className="text-xs text-[var(--muted)]">{formatDate(q.createdAt)}</span>
                </div>
              ))}
            </Card>
            <Card>
              <h2 className="mb-3 font-semibold">Timeline</h2>
              <ol className="space-y-3">
                {timeline.map((t, i) => (
                  <li key={i} className="relative border-l-2 border-[var(--line)] pl-4 text-sm">
                    <p className="font-medium">{t.title}</p>
                    <p className="text-[var(--muted)]">{t.detail}</p>
                    <p className="text-xs text-[var(--muted)]">{formatDateTime(t.at)}</p>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>

        <PlannedActivities
          items={activities}
          users={state.users}
          onSchedule={() => setScheduleOpen(true)}
          onComplete={completeActivity}
        />
      </div>

      <ScheduleActivityModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        users={state.users}
        defaultAssignee={lead.assignedTo || currentUser?.id || ""}
        onSave={(draft) => {
          addActivity({
            leadId: lead.id,
            type: draft.type,
            description: draft.description,
            dueAt: draft.dueAt,
            assignedTo: draft.assignedTo,
            status: draft.status,
          });
          if (draft.note) addNote(lead.id, draft.note);
        }}
      />
      <span className="hidden">{stage?.name}</span>
    </div>
  );
}
