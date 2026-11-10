import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { bumpAssignmentCount, pickAssignee } from "@/lib/assignment";
import { normalizeEmail, normalizeMobile } from "@/lib/phone";
import { toDbSource } from "@/lib/map";
import type { LeadSource } from "@/lib/types";

export type WebsitePayload = {
  submission_id?: string;
  submitted_at?: string;
  name?: string;
  mobile?: string;
  email?: string;
  state?: string;
  city?: string;
  message?: string;
  page_url?: string;
  utm?: { source?: string; campaign?: string; medium?: string };
  [key: string]: unknown;
};

export function validateWebsitePayload(body: WebsitePayload) {
  const submissionId = String(body.submission_id ?? "").trim();
  const name = String(body.name ?? "").trim();
  const mobile = String(body.mobile ?? "").trim();
  const email = String(body.email ?? "").trim();
  if (!submissionId) return "submission_id is required";
  if (!name) return "name is required";
  if (!mobile && !email) return "mobile or email is required";
  return null;
}

async function findDuplicate(mobileNormalized: string, emailLower: string, tx: Prisma.TransactionClient) {
  if (mobileNormalized) {
    const byMobile = await tx.lead.findFirst({
      where: { deletedAt: null, mobileNormalized, duplicateOfId: null },
      include: { stage: true, assignedTo: true },
      orderBy: { createdAt: "asc" },
    });
    if (byMobile) return byMobile;
  }
  if (emailLower) {
    return tx.lead.findFirst({
      where: { deletedAt: null, emailLower, duplicateOfId: null },
      include: { stage: true, assignedTo: true },
      orderBy: { createdAt: "asc" },
    });
  }
  return null;
}

function treatAsNew(original: { stage: { kind: string }; assignedTo: { isActive: boolean } }) {
  return !original.assignedTo.isActive || original.stage.kind === "converted" || original.stage.kind === "lost";
}

export async function processWebsiteEvent(eventId: string) {
  const event = await prisma.incomingEvent.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Event not found");
  if (event.status === "processed" && event.leadId) return event;

  const body = event.rawPayload as WebsitePayload;
  const error = validateWebsitePayload(body);
  if (error) {
    await prisma.incomingEvent.update({
      where: { id: eventId },
      data: { status: "failed", lastError: error, attempts: { increment: 1 }, lastSyncAt: new Date() },
    });
    throw new Error(error);
  }

  try {
    const lead = await prisma.$transaction(async (tx) => {
      const admin = await tx.user.findFirst({ where: { role: "admin", isActive: true }, orderBy: { createdAt: "asc" } });
      if (!admin) throw new Error("No admin user");
      const newStage = await tx.leadStage.findUnique({ where: { id: "st_new" } });
      if (!newStage) throw new Error("New stage is missing");

      const mobile = String(body.mobile ?? "").trim();
      const email = String(body.email ?? "").trim();
      const mobileNormalized = normalizeMobile(mobile);
      const emailLower = normalizeEmail(email);
      const original = await findDuplicate(mobileNormalized, emailLower, tx);
      const isDupe = original && !treatAsNew(original);
      const assignedToId = isDupe ? original.assignedToId : await pickAssignee(event.source, tx);

      const created = await tx.lead.create({
        data: {
          name: String(body.name).trim(),
          mobile,
          mobileNormalized,
          email,
          emailLower,
          state: String(body.state ?? "").trim(),
          city: String(body.city ?? "").trim(),
          source: event.source,
          stageId: "st_new",
          assignedToId,
          createdById: admin.id,
          createdByType: "integration",
          duplicateOfId: isDupe ? original.id : null,
          message: String(body.message ?? ""),
          original: {
            create: {
              rawPayload: JSON.parse(JSON.stringify(body)) as Prisma.InputJsonValue,
              campaign: body.utm?.campaign ?? null,
              adSet: String(body.ad_name ?? body.ad_id ?? "").trim() || null,
              formName: String(body.form_id ?? "").trim() || null,
              pageUrl: body.page_url ? String(body.page_url) : null,
              receivedAt: body.submitted_at ? new Date(String(body.submitted_at)) : new Date(),
            },
          },
        },
      });

      await tx.assignmentHistory.create({
        data: {
          leadId: created.id,
          toUserId: assignedToId,
          reason: isDupe ? "duplicate" : "rule",
          byUserId: admin.id,
        },
      });
      await tx.stageHistory.create({
        data: { leadId: created.id, toStageId: "st_new", userId: admin.id },
      });

      if (!isDupe) await bumpAssignmentCount(assignedToId, event.source, tx);

      const city = String(body.city ?? "").trim();
      const preferred = String(body.preferred_location ?? "").trim() || city;
      await saveCustomValues(created.id, {
        whatsapp_number: mobile || null,
        preferred_location: preferred || null,
        required_city: city || null,
        required_state: String(body.state ?? "").trim() || null,
        company_name: String(body.company ?? "").trim() || null,
        plan_type: String(body.plan_type ?? "").trim() || null,
      }, tx);

      await tx.notification.create({
        data: {
          userId: assignedToId,
          type: isDupe ? "duplicate" : "assignment",
          leadId: created.id,
          message: isDupe
            ? `Duplicate lead detected for ${created.name}`
            : `New lead assigned: ${created.name}`,
        },
      });

      await tx.incomingEvent.update({
        where: { id: eventId },
        data: {
          status: "processed",
          lastError: null,
          leadId: created.id,
          attempts: { increment: 1 },
          lastSyncAt: new Date(),
        },
      });
      return created;
    });
    return lead;
  } catch (err) {
    await prisma.incomingEvent.update({
      where: { id: eventId },
      data: {
        status: "failed",
        lastError: err instanceof Error ? err.message : "Processing failed",
        attempts: { increment: 1 },
        lastSyncAt: new Date(),
      },
    });
    throw err;
  }
}

export async function saveCustomValues(
  leadId: string,
  values: Record<string, string | number | boolean | null>,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const { splitCustomValue } = await import("@/lib/custom-values");
  const fields = await tx.customField.findMany();
  const rows = fields.flatMap((field) => {
    if (!(field.key in values)) return [];
    const value = values[field.key];
    if (value === null || value === undefined || value === "") return [];
    const split = splitCustomValue(field.type, value);
    if (split.valueText == null && split.valueNumber == null && split.valueDate == null && split.valueBool == null) {
      return [];
    }
    return [{ leadId, fieldId: field.id, ...split }];
  });
  if (rows.length === 0) return;
  await tx.customFieldValue.createMany({ data: rows, skipDuplicates: true });
}

export async function createManualLead(input: {
  name: string;
  mobile: string;
  email: string;
  state: string;
  city: string;
  source: LeadSource;
  stageId: string;
  assignedTo: string;
  createdBy: string;
  message: string;
  original: { raw: Record<string, string> };
  customValues: Record<string, string | number | boolean | null>;
}) {
  const mobileNormalized = normalizeMobile(input.mobile);
  const emailLower = normalizeEmail(input.email);
  return prisma.$transaction(async (tx) => {
    const original = await findDuplicate(mobileNormalized, emailLower, tx);
    const isDupe = original && !treatAsNew(original);
    const assignedToId = isDupe ? original.assignedToId : input.assignedTo;
    const lead = await tx.lead.create({
      data: {
        name: input.name.trim(),
        mobile: input.mobile.trim(),
        mobileNormalized,
        email: input.email.trim(),
        emailLower,
        state: input.state,
        city: input.city,
        source: toDbSource(input.source),
        stageId: input.stageId,
        assignedToId,
        createdById: input.createdBy,
        createdByType: "user",
        duplicateOfId: isDupe ? original.id : null,
        message: input.message,
        original: {
          create: {
            rawPayload: input.original.raw as Prisma.InputJsonValue,
            receivedAt: new Date(),
          },
        },
      },
    });
    await saveCustomValues(lead.id, input.customValues, tx);
    await tx.assignmentHistory.create({
      data: {
        leadId: lead.id,
        toUserId: assignedToId,
        reason: isDupe ? "duplicate" : "manual",
        byUserId: input.createdBy,
      },
    });
    await tx.stageHistory.create({
      data: { leadId: lead.id, toStageId: input.stageId, userId: input.createdBy },
    });
    if (!isDupe) await bumpAssignmentCount(assignedToId, toDbSource(input.source), tx);
    await tx.notification.create({
      data: {
        userId: assignedToId,
        type: isDupe ? "duplicate" : "assignment",
        leadId: lead.id,
        message: isDupe ? `Duplicate lead detected for ${lead.name}` : `New lead assigned: ${lead.name}`,
      },
    });
    return lead;
  });
}
