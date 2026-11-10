import type { CustomField as DbField, CustomFieldValue, FieldType } from "@prisma/client";

export function splitCustomValue(type: FieldType, value: string | number | boolean | null) {
  if (value === null || value === undefined || value === "") {
    return { valueText: null, valueNumber: null, valueDate: null, valueBool: null };
  }
  if (type === "number") {
    const n = typeof value === "number" ? value : Number(value);
    return { valueText: null, valueNumber: Number.isFinite(n) ? n : null, valueDate: null, valueBool: null };
  }
  if (type === "checkbox") {
    return { valueText: null, valueNumber: null, valueDate: null, valueBool: value === true || value === "true" };
  }
  if (type === "date" || type === "datetime") {
    const d = new Date(String(value));
    return { valueText: String(value), valueNumber: null, valueDate: Number.isNaN(d.getTime()) ? null : d, valueBool: null };
  }
  return { valueText: String(value), valueNumber: null, valueDate: null, valueBool: null };
}

export function readCustomValue(type: FieldType, row: CustomFieldValue): string | number | boolean | null {
  if (type === "number") return row.valueNumber;
  if (type === "checkbox") return row.valueBool;
  if (type === "date" || type === "datetime") return row.valueText ?? (row.valueDate ? row.valueDate.toISOString() : null);
  return row.valueText;
}

export function customMap(
  fields: DbField[],
  values: (CustomFieldValue & { field?: DbField })[],
): Record<string, string | number | boolean | null> {
  const byId = Object.fromEntries(fields.map((f) => [f.id, f]));
  const out: Record<string, string | number | boolean | null> = {};
  for (const row of values) {
    const field = row.field ?? byId[row.fieldId];
    if (!field) continue;
    out[field.key] = readCustomValue(field.type, row);
  }
  return out;
}
