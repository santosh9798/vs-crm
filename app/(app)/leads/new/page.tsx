"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { FieldGroup, groupedFields } from "@/components/custom-field-input";
import { PlannedActivities, ScheduleActivityModal, type DraftActivity } from "@/components/schedule-activity";
import { Button, Card, Field, Input, Modal, Select, Textarea, cn } from "@/components/ui";
import type { FieldType, LeadSource } from "@/lib/types";

const FIELD_TYPES: FieldType[] = ["text", "number", "email", "phone", "dropdown", "date", "datetime", "checkbox", "textarea"];

function defaultsFrom(fields: { key: string; defaultValue: string; type: FieldType }[]) {
  return Object.fromEntries(
    fields.map((f) => [f.key, f.type === "checkbox" ? f.defaultValue === "true" : f.defaultValue || null]),
  ) as Record<string, string | number | boolean | null>;
}

export default function NewLeadPage() {
  const { addLead, addActivity, addNote, currentUser, state, upsertCustomField, can, isAdmin, toast } = useDemo();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [stateName, setStateName] = useState("Delhi");
  const [city, setCity] = useState("New Delhi");
  const [source, setSource] = useState<LeadSource>("Manual");
  const [assignedTo, setAssignedTo] = useState(currentUser?.id ?? "");
  const [stageId, setStageId] = useState("st_new");
  const [message, setMessage] = useState("");
  const [values, setValues] = useState<Record<string, string | number | boolean | null>>(() =>
    defaultsFrom(state.customFields),
  );
  const [queued, setQueued] = useState<DraftActivity[]>([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [propOpen, setPropOpen] = useState(false);
  const [propLabel, setPropLabel] = useState("");
  const [propType, setPropType] = useState<FieldType>("text");
  const [propGroup, setPropGroup] = useState("Enquiry details");
  const [propOptions, setPropOptions] = useState("");

  useEffect(() => {
    if (!assignedTo && currentUser?.id) setAssignedTo(currentUser.id);
  }, [assignedTo, currentUser?.id]);

  const groups = useMemo(() => groupedFields(state.customFields), [state.customFields]);
  const canAddField = isAdmin || can("create_fields");

  const setValue = (key: string, value: string | number | boolean | null) => {
    setValues((v) => ({ ...v, [key]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast("Sign in again, then create the lead", "err");
      return;
    }
    setSaving(true);
    try {
      const lead = await addLead({
        name,
        mobile,
        email,
        state: stateName,
        city,
        source,
        stageId,
        assignedTo: assignedTo || currentUser.id,
        createdBy: currentUser.id,
        createdByType: "user",
        followupsDisabled: false,
        unsubscribed: false,
        message,
        original: { raw: { name, mobile, email, message, entered_by: "CRM form" } },
        customValues: {
          ...values,
          whatsapp_number: values.whatsapp_number || mobile,
          required_city: values.required_city || city,
          required_state: values.required_state || stateName,
        },
      });
      for (const a of queued) {
        await addActivity({
          leadId: lead.id,
          type: a.type,
          description: a.description,
          dueAt: a.dueAt,
          assignedTo: a.assignedTo,
          status: a.status,
          silent: true,
        });
        if (a.note) await addNote(lead.id, a.note);
      }
      router.push(`/leads/${lead.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not create lead", "err");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Add lead</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Custom fields appear here as soon as they are created — same idea as Odoo properties.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create lead"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Discard
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {state.stages.filter((s) => s.isActive).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStageId(s.id)}
            className={cn(
              "rounded-full px-3 py-1 text-sm",
              stageId === s.id ? "text-white" : "bg-white text-[var(--ink)]",
            )}
            style={stageId === s.id ? { background: s.color } : undefined}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Contact</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <Input required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Mobile">
              <Input
                required
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value);
                  if (!values.whatsapp_number) setValue("whatsapp_number", e.target.value);
                }}
                placeholder="+91"
              />
            </Field>
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Assign to">
              <Select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                {state.users.filter((u) => u.isActive).map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="City">
              <Input
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setValue("required_city", e.target.value);
                }}
              />
            </Field>
            <Field label="State">
              <Input
                value={stateName}
                onChange={(e) => {
                  setStateName(e.target.value);
                  setValue("required_state", e.target.value);
                }}
              />
            </Field>
            <Field label="Source">
              <Select value={source} onChange={(e) => setSource(e.target.value as LeadSource)}>
                <option>Manual</option>
                <option>Website</option>
                <option>Meta Ads</option>
                <option>Google Ads</option>
              </Select>
            </Field>
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            {groups.map((g) => (
              <FieldGroup
                key={g.name}
                title={g.name}
                fields={g.fields}
                values={values}
                onChange={setValue}
              />
            ))}
          </div>

          {canAddField ? (
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-1 text-sm text-[var(--accent)]"
              onClick={() => setPropOpen(true)}
            >
              <Plus size={14} /> Add property
            </button>
          ) : null}

          <div className="mt-6">
            <Field label="Message">
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Add a description…" />
            </Field>
          </div>
        </Card>

        <PlannedActivities
          items={queued}
          users={state.users}
          onSchedule={() => setScheduleOpen(true)}
        />
      </div>

      <ScheduleActivityModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        users={state.users}
        defaultAssignee={assignedTo || currentUser?.id || ""}
        onSave={(draft) => {
          setQueued((q) => [...q, { ...draft, id: `draft_${q.length + 1}` }]);
        }}
      />

      <Modal open={propOpen} title="Add property" onClose={() => setPropOpen(false)}>
        <div className="grid gap-3">
          <Field label="Label">
            <Input value={propLabel} onChange={(e) => setPropLabel(e.target.value)} placeholder="e.g. WhatsApp number" />
          </Field>
          <Field label="Field type">
            <Select value={propType} onChange={(e) => setPropType(e.target.value as FieldType)}>
              {FIELD_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          {propType === "dropdown" ? (
            <Field label="Options (comma separated)">
              <Input value={propOptions} onChange={(e) => setPropOptions(e.target.value)} />
            </Field>
          ) : null}
          <Field label="Group">
            <Select value={propGroup} onChange={(e) => setPropGroup(e.target.value)}>
              <option>Enquiry details</option>
              <option>Follow-up tracking</option>
            </Select>
          </Field>
          <Button
            type="button"
            disabled={!propLabel.trim()}
            onClick={() => {
              upsertCustomField({
                label: propLabel,
                type: propType,
                options: propType === "dropdown" ? propOptions.split(",").map((s) => s.trim()).filter(Boolean) : [],
                group: propGroup,
              });
              setPropLabel("");
              setPropOptions("");
              setPropOpen(false);
            }}
          >
            Add to form
          </Button>
        </div>
      </Modal>
    </form>
  );
}
