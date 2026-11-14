import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canViewAllLeads, toUserDto } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto-secret";
import { customMap } from "@/lib/custom-values";
import { requiredIso, toUiActivity, toUiSource } from "@/lib/map";
import type {
  Activity,
  AppNotification,
  AppSettings,
  AssignmentShare,
  CustomField,
  EmailJob,
  EmailTemplate,
  IncomingEvent,
  Lead,
  Note,
  Quotation,
  Stage,
  User,
} from "@/lib/types";

const leadInclude = {
  original: true,
  customValues: { include: { field: true } },
} satisfies Prisma.LeadInclude;

export type AppState = {
  users: User[];
  stages: Stage[];
  leads: Lead[];
  notes: Note[];
  activities: Activity[];
  quotations: Quotation[];
  emailJobs: EmailJob[];
  notifications: AppNotification[];
  customFields: CustomField[];
  emailTemplates: EmailTemplate[];
  assignmentShares: AssignmentShare[];
  incomingEvents: IncomingEvent[];
  settings: AppSettings;
};

function settingsFromJson(raw: unknown): AppSettings {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<AppSettings> & {
    smtp?: Partial<AppSettings["smtp"]> & { password?: string };
    meta?: Partial<AppSettings["meta"]>;
  };
  const encrypted = value.smtp?.password ?? "";
  const hasPassword = Boolean(encrypted);
  const hasAppSecret = Boolean(value.meta?.appSecret);
  const hasPageToken = Boolean(value.meta?.pageAccessToken);
  return {
    companyName: value.companyName ?? "VS CRM",
    catalogApiUrl: value.catalogApiUrl ?? "",
    catalogApiKey: value.catalogApiKey ?? "",
    smtp: {
      host: value.smtp?.host ?? "",
      port: value.smtp?.port ?? "587",
      username: value.smtp?.username ?? "",
      password: hasPassword ? "••••••••" : "",
      fromName: value.smtp?.fromName ?? "VOspaces",
      fromEmail: value.smtp?.fromEmail ?? "",
    },
    meta: {
      verifyToken: value.meta?.verifyToken ?? "",
      appSecret: hasAppSecret ? "••••••••" : "",
      pageAccessToken: hasPageToken ? "••••••••" : "",
      pageId: value.meta?.pageId ?? "",
    },
  };
}

export function readSmtpPassword(raw: unknown) {
  const value = (raw && typeof raw === "object" ? raw : {}) as { smtp?: { password?: string } };
  return decryptSecret(value.smtp?.password ?? "");
}

function mapLead(
  row: Prisma.LeadGetPayload<{ include: typeof leadInclude }>,
  fields: Prisma.CustomFieldGetPayload<object>[],
): Lead {
  return {
    id: row.id,
    name: row.name,
    mobile: row.mobile,
    email: row.email,
    state: row.state,
    city: row.city,
    source: toUiSource(row.source),
    stageId: row.stageId,
    assignedTo: row.assignedToId,
    createdBy: row.createdById,
    createdByType: row.createdByType,
    duplicateOfId: row.duplicateOfId,
    followupsDisabled: row.followupsDisabled,
    unsubscribed: row.unsubscribed,
    createdAt: requiredIso(row.createdAt),
    message: row.message,
    original: {
      raw: (row.original?.rawPayload as Record<string, string>) ?? {},
      campaign: row.original?.campaign ?? undefined,
      adSet: row.original?.adSet ?? undefined,
      formName: row.original?.formName ?? undefined,
      pageUrl: row.original?.pageUrl ?? undefined,
    },
    customValues: customMap(fields, row.customValues),
  };
}

export async function loadAppState(user: User): Promise<AppState> {
  const viewAll = canViewAllLeads(user);
  const leadWhere = viewAll
    ? { deletedAt: null }
    : { deletedAt: null, assignedToId: user.id };

  const [users, stages, fields, leads, notes, activities, quotations, emailJobs, notifications, templates, shares, events, setting] =
    await Promise.all([
      prisma.user.findMany({ include: { permissions: true }, orderBy: { createdAt: "asc" } }),
      prisma.leadStage.findMany({ orderBy: { position: "asc" } }),
      prisma.customField.findMany({ orderBy: { label: "asc" } }),
      prisma.lead.findMany({ where: leadWhere, include: leadInclude, orderBy: { createdAt: "desc" } }),
      prisma.note.findMany({ where: { lead: leadWhere }, orderBy: { createdAt: "desc" } }),
      prisma.activity.findMany({ where: { lead: leadWhere }, orderBy: { dueAt: "desc" } }),
      prisma.quotation.findMany({ where: { lead: leadWhere }, include: { items: true }, orderBy: { createdAt: "desc" } }),
      prisma.emailJob.findMany({ where: { lead: leadWhere }, orderBy: { scheduledAt: "desc" } }),
      prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.emailTemplate.findMany({ orderBy: { id: "asc" } }),
      prisma.assignmentShare.findMany(),
      user.role === "admin"
        ? prisma.incomingEvent.findMany({ orderBy: { receivedAt: "desc" }, take: 100 })
        : Promise.resolve([]),
      prisma.setting.findUnique({ where: { key: "app" } }),
    ]);

  const mappedUsers: User[] = users.map(toUserDto);
  const mappedStages: Stage[] = stages.map((s) => ({
    id: s.id,
    name: s.name,
    position: s.position,
    isActive: s.isActive,
    kind: s.kind,
    color: s.color,
  }));
  const mappedFields: CustomField[] = fields.map((f) => ({
    id: f.id,
    key: f.key,
    label: f.label,
    type: f.type,
    options: Array.isArray(f.options) ? (f.options as string[]) : [],
    required: f.required,
    isActive: f.isActive,
    createdBy: f.createdById,
    group: f.group,
    defaultValue: f.defaultValue,
  }));
  const mappedLeads = leads.map((l) => mapLead(l, fields));
  const mappedNotes: Note[] = notes.map((n) => ({
    id: n.id,
    leadId: n.leadId,
    body: n.body,
    authorId: n.authorId,
    createdAt: requiredIso(n.createdAt),
  }));
  const mappedActivities: Activity[] = activities.map((a) => ({
    id: a.id,
    leadId: a.leadId,
    type: toUiActivity(a.type),
    description: a.description,
    dueAt: requiredIso(a.dueAt),
    assignedTo: a.assignedToId,
    status: a.status,
    completedAt: a.completedAt ? requiredIso(a.completedAt) : null,
  }));
  const mappedQuotes: Quotation[] = quotations.map((q) => ({
    id: q.id,
    leadId: q.leadId,
    createdBy: q.createdById,
    recipient: q.recipient,
    totalAmount: q.totalAmount,
    status: q.status,
    sentAt: q.sentAt ? requiredIso(q.sentAt) : null,
    createdAt: requiredIso(q.createdAt),
    optionsJson: q.pdfPath ?? undefined,
    items: q.items.map((i) => ({
      id: i.id,
      spaceId: i.spaceId,
      name: i.name,
      details: i.details,
      planName: i.planName,
      duration: i.duration,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
      city: i.city ?? undefined,
      location: i.location ?? undefined,
      listingUrl: i.listingUrl ?? undefined,
      kind: i.kind === "ca" ? "ca" : "space",
    })),
  }));
  const mappedJobs: EmailJob[] = emailJobs.map((e) => ({
    id: e.id,
    leadId: e.leadId,
    templateId: e.templateId,
    to: e.toEmail,
    scheduledAt: requiredIso(e.scheduledAt),
    sentAt: e.sentAt ? requiredIso(e.sentAt) : null,
    status: e.status,
    attempts: e.attempts,
    response: e.response,
  }));
  const mappedNotesNotifs: AppNotification[] = notifications.map((n) => ({
    id: n.id,
    userId: n.userId,
    type: n.type as AppNotification["type"],
    leadId: n.leadId ?? undefined,
    message: n.message,
    readAt: n.readAt ? requiredIso(n.readAt) : null,
    createdAt: requiredIso(n.createdAt),
  }));
  const mappedTemplates: EmailTemplate[] = templates.map((t) => ({
    id: t.id,
    kind: t.kind,
    stageId: t.stageId,
    subject: t.subject,
    body: t.body,
    delayDays: t.delayDays,
    isActive: t.isActive,
  }));
  const mappedShares: AssignmentShare[] = shares.map((s) => ({
    source: toUiSource(s.source),
    userId: s.userId,
    percent: s.percent,
  }));
  const mappedEvents: IncomingEvent[] = events.map((e) => ({
    id: e.id,
    source: toUiSource(e.source),
    externalId: e.externalId,
    status: e.status,
    lastError: e.lastError,
    receivedAt: requiredIso(e.receivedAt),
    lastSyncAt: e.lastSyncAt ? requiredIso(e.lastSyncAt) : null,
  }));

  return {
    users: mappedUsers,
    stages: mappedStages,
    leads: mappedLeads,
    notes: mappedNotes,
    activities: mappedActivities,
    quotations: mappedQuotes,
    emailJobs: mappedJobs,
    notifications: mappedNotesNotifs,
    customFields: mappedFields,
    emailTemplates: mappedTemplates,
    assignmentShares: mappedShares,
    incomingEvents: mappedEvents,
    settings: settingsFromJson(setting?.value),
  };
}
