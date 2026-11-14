import { prisma } from "@/lib/db";
import { assertSmtpReady, loadSmtpConfig, sendMail } from "@/lib/mail";
import { buildQuotationEmail } from "@/lib/quotation-email";
import { parseQuoteOptions, planKindFromLabel } from "@/lib/quotation-view";
import type { QuotationItem } from "@/lib/types";

const QUOTE_TEMPLATE_ID = "et_quote";

async function ensureQuoteTemplate() {
  await prisma.emailTemplate.upsert({
    where: { id: QUOTE_TEMPLATE_ID },
    update: {},
    create: {
      id: QUOTE_TEMPLATE_ID,
      kind: "quotation",
      subject: "Your virtual office quotation",
      body: "Hi {{lead_name}},\n\nPlease find your quotation. Prices are in INR as listed on our website, including 18% GST.\n\n{{salesperson_name}}\n{{salesperson_phone}}",
      delayDays: 0,
      isActive: true,
    },
  });
}

export async function sendQuotationMail(quotationId: string) {
  const quote = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { items: true, lead: true, createdBy: true },
  });
  if (!quote) throw new Error("Quotation not found");
  const to = (quote.recipient || quote.lead.email).trim();
  if (!to) throw new Error("This lead has no email address");
  assertSmtpReady(await loadSmtpConfig());

  await ensureQuoteTemplate();
  const template = await prisma.emailTemplate.findUnique({ where: { id: QUOTE_TEMPLATE_ID } });
  const setting = await prisma.setting.findUnique({ where: { key: "app" } });
  const companyName =
    setting?.value && typeof setting.value === "object" && "companyName" in setting.value
      ? String((setting.value as { companyName?: string }).companyName ?? "VOspaces")
      : "VOspaces";

  const items: QuotationItem[] = quote.items.map((item) => ({
    id: item.id,
    spaceId: item.spaceId,
    name: item.name,
    details: item.details,
    planName: item.planName,
    duration: item.duration,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    city: item.city ?? undefined,
    location: item.location ?? undefined,
    listingUrl: item.listingUrl ?? undefined,
    kind: item.kind === "ca" ? "ca" : "space",
  }));
  const inferredPlan = items.find((item) => item.kind !== "ca")?.planName ?? "";
  const options = parseQuoteOptions(quote.pdfPath, {
    planKind: planKindFromLabel(inferredPlan),
    includeCa: items.some((item) => item.kind === "ca"),
    stateName: quote.lead.state,
  });

  const vars = {
    lead_name: quote.lead.name,
    salesperson_name: quote.createdBy.name,
    salesperson_phone: quote.createdBy.phone,
    company_name: companyName,
  };
  const email = buildQuotationEmail({
    templateSubject: template?.subject ?? "Your virtual office quotation",
    templateBody: template?.body ?? "",
    vars,
    leadName: quote.lead.name,
    items,
    options,
  });

  const job = await prisma.emailJob.create({
    data: {
      leadId: quote.leadId,
      templateId: QUOTE_TEMPLATE_ID,
      toEmail: to,
      scheduledAt: new Date(),
      status: "scheduled",
    },
  });

  try {
    const info = await sendMail({
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: quote.createdBy.email || undefined,
    });
    await prisma.$transaction([
      prisma.emailJob.update({
        where: { id: job.id },
        data: { status: "sent", sentAt: new Date(), attempts: 1, response: info.messageId },
      }),
      prisma.quotation.update({
        where: { id: quote.id },
        data: { status: "sent", sentAt: new Date(), recipient: to },
      }),
      prisma.notification.create({
        data: {
          userId: quote.createdById,
          type: "quotation_sent",
          leadId: quote.leadId,
          message: `Quotation emailed to ${to}`,
        },
      }),
    ]);
    return { to };
  } catch (err) {
    const message = err instanceof Error ? err.message : "SMTP send failed";
    await prisma.$transaction([
      prisma.emailJob.update({
        where: { id: job.id },
        data: { status: "failed", attempts: 1, response: message },
      }),
      prisma.quotation.update({
        where: { id: quote.id },
        data: { status: "failed" },
      }),
      prisma.notification.create({
        data: {
          userId: quote.createdById,
          type: "quotation_failed",
          leadId: quote.leadId,
          message: `Quotation email failed: ${message}`,
        },
      }),
    ]);
    throw new Error(message);
  }
}
