"use client";

import { useMemo, useState } from "react";
import { Calendar, CheckSquare, Mail, Phone, StickyNote } from "lucide-react";
import { Button, Field, Input, Modal, Select, Textarea, cn } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { Activity, ActivityStatus, ActivityType, User } from "@/lib/types";

export const ACTIVITY_TYPES: { id: ActivityType; label: string; icon: typeof Phone }[] = [
  { id: "task", label: "To-Do", icon: CheckSquare },
  { id: "email", label: "Email", icon: Mail },
  { id: "call", label: "Call", icon: Phone },
  { id: "meeting", label: "Meeting", icon: Calendar },
  { id: "follow-up", label: "Follow-up", icon: StickyNote },
];

export type DraftActivity = {
  id: string;
  type: ActivityType;
  description: string;
  dueAt: string;
  assignedTo: string;
  status: ActivityStatus;
  note: string;
};

const DEFAULT_SUMMARY: Record<ActivityType, string> = {
  task: "To-Do",
  email: "Email",
  call: "Call",
  meeting: "Meeting",
  "follow-up": "Follow-up",
};

export function ScheduleActivityModal({
  open,
  onClose,
  users,
  defaultAssignee,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  users: User[];
  defaultAssignee: string;
  onSave: (draft: Omit<DraftActivity, "id">) => void;
}) {
  const [type, setType] = useState<ActivityType>("call");
  const [summary, setSummary] = useState("Call");
  const [due, setDue] = useState("2026-11-07T15:00");
  const [assignedTo, setAssignedTo] = useState(defaultAssignee);
  const [note, setNote] = useState("");

  const pickType = (next: ActivityType) => {
    setType(next);
    if (ACTIVITY_TYPES.some((t) => t.id === next) && (!summary || Object.values(DEFAULT_SUMMARY).includes(summary))) {
      setSummary(DEFAULT_SUMMARY[next]);
    }
  };

  const save = (status: ActivityStatus) => {
    onSave({
      type,
      description: summary.trim() || DEFAULT_SUMMARY[type],
      dueAt: new Date(due).toISOString(),
      assignedTo,
      status,
      note: note.trim(),
    });
    setNote("");
    setSummary(DEFAULT_SUMMARY[type]);
    onClose();
  };

  return (
    <Modal open={open} title="Schedule activity" onClose={onClose} wide>
      <div className="mb-4 flex flex-wrap gap-2">
        {ACTIVITY_TYPES.map((t) => {
          const Icon = t.icon;
          const active = type === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => pickType(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
                active ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--line)] bg-white",
              )}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>
      <Field label="Summary">
        <Input value={summary} onChange={(e) => setSummary(e.target.value)} />
      </Field>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Due date">
          <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
        <Field label="Assigned to">
          <Select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            {users.filter((u) => u.isActive).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Log a note">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note saved with the activity" />
        </Field>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" onClick={() => save("pending")}>Save</Button>
        <Button type="button" variant="secondary" onClick={() => save("completed")}>Mark done</Button>
        <Button type="button" variant="ghost" onClick={onClose}>Discard</Button>
      </div>
    </Modal>
  );
}

export function PlannedActivities({
  items,
  users,
  onSchedule,
  onComplete,
}: {
  items: Array<Pick<Activity, "id" | "type" | "description" | "dueAt" | "assignedTo" | "status">>;
  users: User[];
  onSchedule: () => void;
  onComplete?: (id: string) => void;
}) {
  const pending = useMemo(() => items.filter((a) => a.status === "pending"), [items]);
  const done = useMemo(() => items.filter((a) => a.status === "completed").slice(0, 4), [items]);
  const now = Date.now();

  return (
    <div className="card flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold">Planned activities</h2>
        <Button size="sm" type="button" onClick={onSchedule}>
          Schedule
        </Button>
      </div>
      {pending.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No planned activity. Schedule a call, meeting or follow-up while adding this lead.</p>
      ) : (
        <div className="space-y-2">
          {pending.map((a) => {
            const overdue = new Date(a.dueAt).getTime() < now;
            const Icon = ACTIVITY_TYPES.find((t) => t.id === a.type)?.icon ?? Phone;
            return (
              <div key={a.id} className="rounded-xl border border-[var(--line)] px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <Icon size={16} className="mt-0.5 text-[var(--accent)]" />
                    <div>
                      <p className="text-sm font-medium">{a.description}</p>
                      <p className={cn("text-xs", overdue ? "text-[var(--danger)]" : "text-[var(--muted)]")}>
                        {overdue ? "Overdue · " : ""}
                        {formatDateTime(a.dueAt)} · {users.find((u) => u.id === a.assignedTo)?.name}
                      </p>
                    </div>
                  </div>
                  {onComplete ? (
                    <Button size="sm" variant="outline" type="button" onClick={() => onComplete(a.id)}>
                      Mark done
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {done.length > 0 ? (
        <div className="mt-4 border-t border-[var(--line)] pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Done</p>
          {done.map((a) => (
            <p key={a.id} className="py-1 text-sm text-[var(--muted)]">
              {a.description} · {formatDateTime(a.dueAt)}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
