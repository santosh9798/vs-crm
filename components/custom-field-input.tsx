"use client";

import { Input, Select, Textarea, cn } from "@/components/ui";
import type { CustomField, FieldType } from "@/lib/types";

export function CustomFieldInput({
  type,
  options,
  value,
  onChange,
  compact,
}: {
  type: FieldType;
  options: string[];
  value: string | number | boolean | null | undefined;
  onChange: (v: string | number | boolean | null) => void;
  compact?: boolean;
}) {
  const inputClass = compact ? "h-8 rounded-lg border-transparent bg-transparent px-1 shadow-none focus:border-[var(--line)] focus:bg-white" : undefined;

  if (type === "checkbox") {
    return (
      <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
    );
  }
  if (type === "dropdown") {
    return (
      <Select className={inputClass} value={String(value ?? "")} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Select</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </Select>
    );
  }
  if (type === "textarea") {
    return (
      <Textarea
        className={cn(compact && "min-h-[64px] rounded-lg")}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  const inputType =
    type === "number" ? "number" : type === "date" ? "date" : type === "datetime" ? "datetime-local" : type === "email" ? "email" : type === "phone" ? "tel" : "text";
  return (
    <Input
      className={inputClass}
      type={inputType}
      value={value === null || value === undefined ? "" : String(value)}
      onChange={(e) => onChange(type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)}
    />
  );
}

export function PropertyRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[148px_1fr] items-center gap-3 border-b border-[var(--line)] py-2 last:border-b-0">
      <span className="text-[13px] text-[var(--muted)]">
        {label}
        {required ? <span className="text-[var(--danger)]"> *</span> : null}
      </span>
      <div>{children}</div>
    </div>
  );
}

export function FieldGroup({
  title,
  fields,
  values,
  onChange,
  optionOverrides,
  skipKeys,
}: {
  title: string;
  fields: CustomField[];
  values: Record<string, string | number | boolean | null>;
  onChange: (key: string, value: string | number | boolean | null) => void;
  optionOverrides?: Record<string, string[]>;
  skipKeys?: string[];
}) {
  const hidden = new Set(skipKeys ?? []);
  const visible = fields.filter((f) => !hidden.has(f.key));
  if (visible.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{title}</p>
      {visible.map((f) => (
        <PropertyRow key={f.id} label={f.label} required={f.required}>
          <CustomFieldInput
            compact
            type={f.type}
            options={optionOverrides?.[f.key] ?? f.options}
            value={values[f.key]}
            onChange={(v) => onChange(f.key, v)}
          />
        </PropertyRow>
      ))}
    </div>
  );
}

export function groupedFields(fields: CustomField[]) {
  const active = fields.filter((f) => f.isActive);
  const names = [...new Set(active.map((f) => f.group || "Details"))];
  return names.map((name) => ({ name, fields: active.filter((f) => (f.group || "Details") === name) }));
}
