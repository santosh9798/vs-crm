"use client";

import { useState } from "react";
import { AdminGate } from "@/components/admin-gate";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select } from "@/components/ui";
import { useDemo } from "@/lib/demo-store";
import type { CustomField, FieldType } from "@/lib/types";

const TYPES: FieldType[] = ["text", "number", "email", "phone", "dropdown", "date", "datetime", "checkbox", "textarea"];
const GROUPS = ["Enquiry details", "Follow-up tracking"];

export default function CustomFieldsPage() {
  const { state, upsertCustomField } = useDemo();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<CustomField | null>(null);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FieldType>("text");
  const [options, setOptions] = useState("");
  const [required, setRequired] = useState(false);
  const [group, setGroup] = useState("Enquiry details");

  const start = (field?: CustomField) => {
    setEdit(field ?? null);
    setLabel(field?.label ?? "");
    setType(field?.type ?? "text");
    setOptions(field?.options.join(", ") ?? "");
    setRequired(field?.required ?? false);
    setGroup(field?.group ?? "Enquiry details");
    setOpen(true);
  };

  const save = () => {
    upsertCustomField({
      id: edit?.id,
      label,
      type,
      options: type === "dropdown" ? options.split(",").map((s) => s.trim()).filter(Boolean) : [],
      required,
      group,
    });
    setOpen(false);
  };

  return (
    <AdminGate>
      <PageHeader
        title="Custom fields"
        subtitle="Organization-wide. Deactivating hides the field from forms but keeps values."
        actions={<Button onClick={() => start()}>Create field</Button>}
      />
      <Card className="overflow-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-[#f7f9f7] text-left text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Label</th>
              <th className="px-4 py-3 font-medium">Key</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Group</th>
              <th className="px-4 py-3 font-medium">Required</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {state.customFields.map((f) => (
              <tr key={f.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3 font-medium">{f.label}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{f.key}</td>
                <td className="px-4 py-3">{f.type}</td>
                <td className="px-4 py-3">{f.group}</td>
                <td className="px-4 py-3">{f.required ? "Yes" : "No"}</td>
                <td className="px-4 py-3">
                  <Badge color={f.isActive ? "#16A34A" : "#6B7280"}>{f.isActive ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => start(f)}>Rename</Button>
                    <Button size="sm" variant="ghost" onClick={() => upsertCustomField({ ...f, isActive: !f.isActive })}>
                      {f.isActive ? "Deactivate" : "Reactivate"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Modal open={open} title={edit ? "Edit field" : "Create field"} onClose={() => setOpen(false)}>
        <div className="grid gap-3">
          <Field label="Label">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </Field>
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as FieldType)} disabled={Boolean(edit)}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          {type === "dropdown" ? (
            <Field label="Options (comma separated)">
              <Input value={options} onChange={(e) => setOptions(e.target.value)} />
            </Field>
          ) : null}
          <Field label="Group">
            <Select value={group} onChange={(e) => setGroup(e.target.value)}>
              {GROUPS.map((g) => <option key={g}>{g}</option>)}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
            Required on new and edited leads
          </label>
          <Button onClick={save} disabled={!label.trim()}>Save</Button>
        </div>
      </Modal>
    </AdminGate>
  );
}
