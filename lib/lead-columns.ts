import { formatDate, formatDateTime } from "@/lib/format";
import type { CustomField, FieldType, Lead, Stage, User } from "@/lib/types";

export type SortKind = "text" | "number" | "date";

export type LeadColumn = {
  id: string;
  label: string;
  group: string;
  locked?: boolean;
  sortKind?: SortKind;
};

export const CORE_LEAD_COLUMNS: LeadColumn[] = [
  { id: "name", label: "Name", group: "Lead details", locked: true, sortKind: "text" },
  { id: "mobile", label: "Mobile", group: "Lead details" },
  { id: "email", label: "Email", group: "Lead details" },
  { id: "city", label: "City", group: "Lead details" },
  { id: "state", label: "State", group: "Lead details" },
  { id: "source", label: "Source", group: "Lead details" },
  { id: "message", label: "Message", group: "Lead details" },
  { id: "stage", label: "Stage", group: "Pipeline", sortKind: "number" },
  { id: "assigned", label: "Assigned", group: "Pipeline" },
  { id: "created", label: "Created", group: "Pipeline", sortKind: "date" },
  { id: "flags", label: "Flags", group: "Pipeline" },
];

export const DEFAULT_LEAD_COLUMNS = [
  "name",
  "mobile",
  "email",
  "source",
  "cf:plan_type",
  "cf:visit_date",
  "stage",
  "assigned",
  "created",
];

export const LEAD_COLUMNS_KEY = "vs-crm-lead-columns";

export function buildLeadColumns(customFields: CustomField[]): LeadColumn[] {
  const custom = customFields
    .filter((f) => f.isActive)
    .map((f) => ({
      id: `cf:${f.key}`,
      label: f.label,
      group: f.group || "Custom fields",
      sortKind: f.type === "number" ? "number" : undefined,
    }));
  return [...CORE_LEAD_COLUMNS, ...custom];
}

export function getLeadSortValue(
  lead: Lead,
  columnId: string,
  ctx: {
    stages: Record<string, Stage | undefined>;
    fields: Record<string, CustomField | undefined>;
  },
): string | number | null {
  if (columnId === "name") return lead.name || null;
  if (columnId === "created") return lead.createdAt || null;
  if (columnId === "stage") return ctx.stages[lead.stageId]?.position ?? null;
  if (!columnId.startsWith("cf:")) return null;
  const key = columnId.slice(3);
  const raw = lead.customValues[key];
  if (raw === null || raw === undefined || raw === "") return null;
  if (ctx.fields[key]?.type === "number") {
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function compareLeadSortValues(a: string | number | null, b: string | number | null, dir: "asc" | "desc") {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === "number" && typeof b === "number") {
    return dir === "asc" ? a - b : b - a;
  }
  const cmp = String(a).localeCompare(String(b), "en", { numeric: true, sensitivity: "base" });
  return dir === "asc" ? cmp : -cmp;
}

export function orderColumnIds(ids: string[], catalog: LeadColumn[]) {
  const selected = new Set(ids);
  catalog.filter((c) => c.locked).forEach((c) => selected.add(c.id));
  return catalog.filter((c) => selected.has(c.id)).map((c) => c.id);
}

export function formatCustomValue(value: string | number | boolean | null | undefined, type?: FieldType) {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "checkbox") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (type === "date" && /^\d{4}-\d{2}-\d{2}/.test(value)) return formatDate(value);
    if (type === "datetime") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return formatDateTime(value);
    }
  }
  return String(value);
}

export function getLeadCellText(
  lead: Lead,
  columnId: string,
  ctx: {
    stages: Record<string, Stage | undefined>;
    users: Record<string, User | undefined>;
    fields: Record<string, CustomField | undefined>;
  },
) {
  if (columnId.startsWith("cf:")) {
    const key = columnId.slice(3);
    return formatCustomValue(lead.customValues[key], ctx.fields[key]?.type);
  }
  switch (columnId) {
    case "name":
      return lead.name || "—";
    case "mobile":
      return lead.mobile || "—";
    case "email":
      return lead.email || "—";
    case "city":
      return lead.city || "—";
    case "state":
      return lead.state || "—";
    case "source":
      return lead.source;
    case "message":
      return lead.message || "—";
    case "stage":
      return ctx.stages[lead.stageId]?.name ?? "—";
    case "assigned":
      return ctx.users[lead.assignedTo]?.name ?? "—";
    case "created":
      return formatDate(lead.createdAt);
    case "flags": {
      const flags = [
        lead.duplicateOfId ? "Duplicate" : null,
        lead.unsubscribed ? "Unsubscribed" : null,
        lead.followupsDisabled ? "Follow-ups off" : null,
      ].filter(Boolean);
      return flags.length ? flags.join(", ") : "—";
    }
    default:
      return "—";
  }
}
