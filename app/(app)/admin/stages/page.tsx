"use client";

import { useState } from "react";
import { AdminGate } from "@/components/admin-gate";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select } from "@/components/ui";
import { useDemo } from "@/lib/demo-store";
import type { StageKind } from "@/lib/types";

export default function StagesPage() {
  const { state, upsertStage, reorderStage } = useDemo();
  const [open, setOpen] = useState(false);
  const [id, setId] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<StageKind>("open");
  const [color, setColor] = useState("#64748B");

  const ordered = [...state.stages].sort((a, b) => a.position - b.position);

  return (
    <AdminGate>
      <PageHeader
        title="Stages"
        subtitle="Converted and Lost are tagged by kind so dashboards keep working after a rename. Stages with leads can be deactivated, not deleted."
        actions={
          <Button onClick={() => { setId(undefined); setName(""); setKind("open"); setOpen(true); }}>
            Add stage
          </Button>
        }
      />
      <Card className="space-y-2">
        {ordered.map((s, i) => (
          <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--line)] px-3 py-3">
            <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
            <div className="min-w-40 flex-1">
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-[var(--muted)]">kind: {s.kind}</p>
            </div>
            <Badge color={s.isActive ? "#16A34A" : "#6B7280"}>{s.isActive ? "Active" : "Inactive"}</Badge>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={i === 0} onClick={() => reorderStage(s.id, -1)}>Up</Button>
              <Button size="sm" variant="outline" disabled={i === ordered.length - 1} onClick={() => reorderStage(s.id, 1)}>Down</Button>
              <Button size="sm" variant="ghost" onClick={() => { setId(s.id); setName(s.name); setKind(s.kind); setColor(s.color); setOpen(true); }}>Rename</Button>
              <Button size="sm" variant="ghost" onClick={() => upsertStage({ ...s, isActive: !s.isActive })}>
                {s.isActive ? "Deactivate" : "Reactivate"}
              </Button>
            </div>
          </div>
        ))}
      </Card>
      <Modal open={open} title={id ? "Rename stage" : "New stage"} onClose={() => setOpen(false)}>
        <div className="grid gap-3">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Kind">
            <Select value={kind} onChange={(e) => setKind(e.target.value as StageKind)}>
              <option value="open">open</option>
              <option value="converted">converted</option>
              <option value="lost">lost</option>
            </Select>
          </Field>
          <Field label="Colour"><Input value={color} onChange={(e) => setColor(e.target.value)} /></Field>
          <Button
            onClick={() => {
              upsertStage({ id, name, kind, color });
              setOpen(false);
            }}
            disabled={!name.trim()}
          >
            Save
          </Button>
        </div>
      </Modal>
    </AdminGate>
  );
}
