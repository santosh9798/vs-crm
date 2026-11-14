import { hashSync } from "bcryptjs";
import { prisma } from "@/lib/db";
import { can, canViewAllLeads, isAdmin } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto-secret";
import { slugify } from "@/lib/format";
import { toDbSource } from "@/lib/map";
import { resetAssignmentCounts, validateShares } from "@/lib/assignment";
import { createManualLead, processWebsiteEvent, saveCustomValues } from "@/lib/ingest";
import { inspectStoredPageToken, processMetaEvent } from "@/lib/meta";
import { sendMail } from "@/lib/mail";
import { sendQuotationMail } from "@/lib/quotation-send";
import { encodeQuoteOptions, type QuoteOptions } from "@/lib/quotation-view";
import type {
  ActivityStatus,
  ActivityType,
  AppSettings,
  AssignmentShare,
  CustomField,
  EmailTemplate,
  FieldType,
  Lead,
  LeadSource,
  Permissions,
  QuotationItem,
  QuotationStatus,
  Stage,
  StageKind,
  User,
} from "@/lib/types";

function isMaskedSecret(value?: string) {
  return !value || /^•+$/.test(value.trim());
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

async function assertLead(user: User, leadId: string) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, deletedAt: null }, include: { stage: true } });
  if (!lead) throw new Error("Lead not found");
  if (!canViewAllLeads(user) && lead.assignedToId !== user.id) throw new Error("Not allowed");
  return lead;
}

export async function runAction(user: User, type: string, payload: Record<string, unknown>) {
  switch (type) {
    case "lead.create": {
      const created = await createManualLead({
        name: String(payload.name ?? ""),
        mobile: String(payload.mobile ?? ""),
        email: String(payload.email ?? ""),
        state: String(payload.state ?? ""),
        city: String(payload.city ?? ""),
        source: (payload.source as LeadSource) ?? "Manual",
        stageId: String(payload.stageId ?? "st_new"),
        assignedTo: String(payload.assignedTo ?? user.id),
        createdBy: user.id,
        message: String(payload.message ?? ""),
        original: { raw: (payload.original as { raw: Record<string, string> })?.raw ?? {} },
        customValues: (payload.customValues as Record<string, string | number | boolean | null>) ?? {},
      });
      return { leadId: created.id };
    }
    case "lead.update": {
      const id = String(payload.id);
      const patch = (payload.patch ?? {}) as Partial<Lead>;
      const lead = await assertLead(user, id);
      if (patch.assignedTo && patch.assignedTo !== lead.assignedToId) {
        if (!isAdmin(user) && !can(user, "reassign_leads")) throw new Error("Cannot reassign");
      }
      await prisma.$transaction(async (tx) => {
        await tx.lead.update({
          where: { id },
          data: {
            name: patch.name ?? undefined,
            mobile: patch.mobile ?? undefined,
            email: patch.email ?? undefined,
            state: patch.state ?? undefined,
            city: patch.city ?? undefined,
            message: patch.message ?? undefined,
            stageId: patch.stageId ?? undefined,
            assignedToId: patch.assignedTo ?? undefined,
            followupsDisabled: patch.followupsDisabled ?? undefined,
            unsubscribed: patch.unsubscribed ?? undefined,
            source: patch.source ? toDbSource(patch.source) : undefined,
          },
        });
        if (patch.customValues) await saveCustomValues(id, patch.customValues, tx);
        if (patch.stageId && patch.stageId !== lead.stageId) {
          await tx.stageHistory.create({
            data: { leadId: id, fromStageId: lead.stageId, toStageId: patch.stageId, userId: user.id },
          });
          await tx.notification.create({
            data: {
              userId: lead.assignedToId,
              type: "stage_changed",
              leadId: id,
              message: `Stage changed for ${lead.name}`,
            },
          });
        }
        if (patch.assignedTo && patch.assignedTo !== lead.assignedToId) {
          await tx.assignmentHistory.create({
            data: {
              leadId: id,
              fromUserId: lead.assignedToId,
              toUserId: patch.assignedTo,
              reason: "manual",
              byUserId: user.id,
            },
          });
        }
      });
      return { ok: true };
    }
    case "note.create": {
      const leadId = String(payload.leadId);
      await assertLead(user, leadId);
      await prisma.note.create({ data: { leadId, body: String(payload.body ?? ""), authorId: user.id } });
      return { ok: true };
    }
    case "activity.create": {
      const leadId = String(payload.leadId);
      await assertLead(user, leadId);
      const status = (payload.status as ActivityStatus) ?? "pending";
      await prisma.activity.create({
        data: {
          leadId,
          type: payload.type === "follow-up" ? "follow_up" : (payload.type as Exclude<ActivityType, "follow-up">),
          description: String(payload.description ?? ""),
          dueAt: new Date(String(payload.dueAt)),
          assignedToId: String(payload.assignedTo ?? user.id),
          status,
          completedAt: status === "completed" ? new Date() : null,
        },
      });
      return { ok: true };
    }
    case "activity.complete": {
      const id = String(payload.id);
      const activity = await prisma.activity.findUnique({ where: { id } });
      if (!activity) throw new Error("Activity not found");
      await assertLead(user, activity.leadId);
      await prisma.activity.update({
        where: { id },
        data: { status: "completed", completedAt: new Date() },
      });
      return { ok: true };
    }
    case "quotation.create": {
      if (!isAdmin(user) && !can(user, "send_quotations")) throw new Error("Cannot send quotations");
      const leadId = String(payload.leadId);
      await assertLead(user, leadId);
      const items = (payload.items as QuotationItem[]) ?? [];
      const wantSend = (payload.status as QuotationStatus) === "sent";
      const options = payload.options as QuoteOptions | undefined;
      const quote = await prisma.quotation.create({
        data: {
          leadId,
          createdById: user.id,
          recipient: String(payload.recipient ?? ""),
          totalAmount: Number(payload.totalAmount ?? 0),
          status: "draft",
          pdfPath: options ? encodeQuoteOptions(options) : null,
          items: {
            create: items.map((item) => ({
              spaceId: item.spaceId,
              name: item.name,
              details: item.details,
              planName: item.planName,
              duration: item.duration,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
              city: item.city,
              location: item.location,
              listingUrl: item.listingUrl,
              kind: item.kind,
            })),
          },
        },
      });
      if (!wantSend) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: "quotation_sent",
            leadId,
            message: "Quotation draft saved",
          },
        });
        return { quotationId: quote.id, sent: false };
      }
      try {
        await sendQuotationMail(quote.id);
        return { quotationId: quote.id, sent: true };
      } catch (err) {
        return {
          quotationId: quote.id,
          sent: false,
          mailError: err instanceof Error ? err.message : "SMTP send failed",
        };
      }
    }
    case "quotation.send": {
      if (!isAdmin(user) && !can(user, "send_quotations")) throw new Error("Cannot send quotations");
      const quote = await prisma.quotation.findUnique({ where: { id: String(payload.id) } });
      if (!quote) throw new Error("Quotation not found");
      await assertLead(user, quote.leadId);
      try {
        await sendQuotationMail(quote.id);
        return { quotationId: quote.id, sent: true };
      } catch (err) {
        return {
          quotationId: quote.id,
          sent: false,
          mailError: err instanceof Error ? err.message : "SMTP send failed",
        };
      }
    }
    case "smtp.test": {
      if (!isAdmin(user)) throw new Error("Admin only");
      const to = user.email.trim();
      if (!to) throw new Error("Your account has no email address");
      await sendMail({
        to,
        subject: "VS CRM test email",
        text: "SMTP is working. Quotations can now be emailed from VS CRM.",
        html: "<p>SMTP is working. Quotations can now be emailed from VS CRM.</p>",
      });
      return { to };
    }
    case "field.upsert": {
      if (!isAdmin(user) && !can(user, "create_fields")) throw new Error("Cannot manage fields");
      const field = payload as Partial<CustomField> & { label: string; type: FieldType };
      if (field.id) {
        await prisma.customField.update({
          where: { id: field.id },
          data: {
            label: field.label,
            type: field.type,
            options: field.options ?? [],
            required: field.required,
            isActive: field.isActive,
            group: field.group,
            defaultValue: field.defaultValue,
          },
        });
      } else {
        await prisma.customField.create({
          data: {
            key: slugify(field.label),
            label: field.label,
            type: field.type,
            options: field.options ?? [],
            required: field.required ?? false,
            group: field.group ?? "Enquiry details",
            defaultValue: field.defaultValue ?? "",
            createdById: user.id,
          },
        });
      }
      return { ok: true };
    }
    case "stage.upsert": {
      if (!isAdmin(user)) throw new Error("Admin only");
      const stage = payload as Partial<Stage> & { name: string };
      if (stage.id) {
        await prisma.leadStage.update({
          where: { id: stage.id },
          data: {
            name: stage.name,
            kind: stage.kind as StageKind | undefined,
            color: stage.color,
            isActive: stage.isActive,
          },
        });
      } else {
        const count = await prisma.leadStage.count();
        await prisma.leadStage.create({
          data: {
            id: `st_${slugify(stage.name)}_${Date.now().toString(36)}`,
            name: stage.name,
            position: count + 1,
            kind: (stage.kind as StageKind) ?? "open",
            color: stage.color ?? "#64748B",
          },
        });
      }
      return { ok: true };
    }
    case "stage.reorder": {
      if (!isAdmin(user)) throw new Error("Admin only");
      const id = String(payload.id);
      const dir = Number(payload.dir) as -1 | 1;
      const ordered = await prisma.leadStage.findMany({ orderBy: { position: "asc" } });
      const idx = ordered.findIndex((s) => s.id === id);
      const swap = idx + dir;
      if (idx < 0 || swap < 0 || swap >= ordered.length) return { ok: true };
      const a = ordered[idx];
      const b = ordered[swap];
      await prisma.$transaction([
        prisma.leadStage.update({ where: { id: a.id }, data: { position: b.position } }),
        prisma.leadStage.update({ where: { id: b.id }, data: { position: a.position } }),
      ]);
      return { ok: true };
    }
    case "user.upsert": {
      if (!isAdmin(user)) throw new Error("Admin only");
      const input = payload as Partial<User> & { name: string; email: string; password?: string };
      if (input.id) {
        const existing = await prisma.user.findUnique({ where: { id: input.id } });
        if (!existing) throw new Error("User not found");
        const deactivating = existing.isActive && input.isActive === false;
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: input.id },
            data: {
              name: input.name,
              email: input.email,
              phone: input.phone,
              initials: initialsOf(input.name),
              isActive: input.isActive,
              inRotation: input.inRotation,
              ...(input.password ? { passwordHash: hashSync(input.password, 12) } : {}),
            },
          });
          if (input.permissions) {
            await tx.userPermission.update({
              where: { userId: input.id! },
              data: {
                viewAllLeads: input.permissions.view_all_leads,
                reassignLeads: input.permissions.reassign_leads,
                export: input.permissions.export,
                createFields: input.permissions.create_fields,
                sendQuotations: input.permissions.send_quotations,
              },
            });
          }
          if (deactivating) {
            const admin = await tx.user.findFirst({ where: { role: "admin", isActive: true } });
            if (admin) {
              const open = await tx.lead.findMany({
                where: { assignedToId: input.id, deletedAt: null, stage: { kind: "open" } },
              });
              for (const lead of open) {
                await tx.lead.update({ where: { id: lead.id }, data: { assignedToId: admin.id } });
                await tx.assignmentHistory.create({
                  data: {
                    leadId: lead.id,
                    fromUserId: input.id,
                    toUserId: admin.id,
                    reason: "deactivation",
                    byUserId: user.id,
                  },
                });
              }
            }
          }
        });
      } else {
        const password = input.password?.trim() || "ChangeMe123!";
        await prisma.user.create({
          data: {
            name: input.name,
            email: input.email,
            phone: input.phone ?? "",
            initials: initialsOf(input.name),
            role: "salesperson",
            passwordHash: hashSync(password, 12),
            permissions: { create: {} },
          },
        });
      }
      return { ok: true };
    }
    case "assignment.shares": {
      if (!isAdmin(user)) throw new Error("Admin only");
      const shares = (payload.shares as AssignmentShare[]).map((share) => ({
        source: share.source,
        userId: share.userId,
        percent: Number(share.percent),
      }));
      validateShares(shares);
      const dbShares = shares.map((share) => ({
        source: toDbSource(share.source),
        userId: share.userId,
        percent: share.percent,
      }));
      const inPool = [...new Set(dbShares.map((share) => share.userId))];
      await prisma.$transaction(async (tx) => {
        await tx.assignmentShare.deleteMany();
        if (dbShares.length) await tx.assignmentShare.createMany({ data: dbShares });
        await tx.user.updateMany({ where: { role: "salesperson" }, data: { inRotation: false } });
        if (inPool.length) {
          await tx.user.updateMany({ where: { id: { in: inPool } }, data: { inRotation: true } });
        }
        await resetAssignmentCounts(tx);
      });
      return { ok: true };
    }
    case "template.upsert": {
      if (!isAdmin(user)) throw new Error("Admin only");
      const t = payload as EmailTemplate;
      await prisma.emailTemplate.upsert({
        where: { id: t.id },
        update: { subject: t.subject, body: t.body, delayDays: t.delayDays, isActive: t.isActive },
        create: {
          id: t.id,
          kind: t.kind,
          stageId: t.stageId,
          subject: t.subject,
          body: t.body,
          delayDays: t.delayDays,
          isActive: t.isActive,
        },
      });
      return { ok: true };
    }
    case "settings.update": {
      if (!isAdmin(user)) throw new Error("Admin only");
      const patch = payload as Partial<AppSettings>;
      const current = await prisma.setting.findUnique({ where: { key: "app" } });
      const prev = (current?.value ?? {}) as AppSettings & {
        smtp?: { password?: string };
        meta?: Partial<AppSettings["meta"]>;
      };
      const keepPassword = !patch.smtp || isMaskedSecret(patch.smtp.password);
      const keepAppSecret = !patch.meta || isMaskedSecret(patch.meta.appSecret);
      const keepPageToken = !patch.meta || isMaskedSecret(patch.meta.pageAccessToken);
      const next = {
        ...prev,
        ...patch,
        smtp: {
          ...(typeof prev.smtp === "object" ? prev.smtp : {}),
          ...(patch.smtp ?? {}),
          password: keepPassword
            ? prev.smtp?.password ?? ""
            : encryptSecret(patch.smtp?.password ?? ""),
        },
        meta: {
          ...(typeof prev.meta === "object" ? prev.meta : {}),
          ...(patch.meta ?? {}),
          appSecret: keepAppSecret
            ? prev.meta?.appSecret ?? ""
            : encryptSecret(patch.meta?.appSecret ?? ""),
          pageAccessToken: keepPageToken
            ? prev.meta?.pageAccessToken ?? ""
            : encryptSecret(patch.meta?.pageAccessToken ?? ""),
        },
      };
      await prisma.setting.upsert({
        where: { key: "app" },
        update: { value: next },
        create: { key: "app", value: next },
      });
      return { ok: true };
    }
    case "notifications.read": {
      const ids = payload.ids as string[] | undefined;
      await prisma.notification.updateMany({
        where: { userId: user.id, ...(ids ? { id: { in: ids } } : { readAt: null }) },
        data: { readAt: new Date() },
      });
      return { ok: true };
    }
    case "event.reprocess": {
      if (!isAdmin(user)) throw new Error("Admin only");
      const event = await prisma.incomingEvent.findUnique({ where: { id: String(payload.id) } });
      if (!event) throw new Error("Event not found");
      if (event.source === "MetaAds") await processMetaEvent(event.id);
      else await processWebsiteEvent(event.id);
      return { ok: true };
    }
    case "meta.checkToken": {
      if (!isAdmin(user)) throw new Error("Admin only");
      return inspectStoredPageToken();
    }
    case "password.update": {
      const password = String(payload.password ?? "");
      if (password.length < 8) throw new Error("Password must be at least 8 characters");
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashSync(password, 12) },
      });
      return { ok: true };
    }
    default:
      throw new Error(`Unknown action ${type}`);
  }
}
