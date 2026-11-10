import { PrismaClient, LeadSource, FieldType, TemplateKind, StageKind } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

const STAGES: { id: string; name: string; position: number; kind: StageKind; color: string }[] = [
  { id: "st_new", name: "New", position: 1, kind: "open", color: "#4C7DFF" },
  { id: "st_active", name: "Active", position: 2, kind: "open", color: "#F5A524" },
  { id: "st_interested", name: "Interested", position: 3, kind: "open", color: "#8B5CF6" },
  { id: "st_followup", name: "Follow-up", position: 4, kind: "open", color: "#14B8A6" },
  { id: "st_booking", name: "Booking", position: 5, kind: "open", color: "#F97316" },
  { id: "st_converted", name: "Converted", position: 6, kind: "converted", color: "#16A34A" },
  { id: "st_lost", name: "Lost", position: 7, kind: "lost", color: "#6B7280" },
];

const FIELDS: {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  group: string;
  options?: string[];
  defaultValue?: string;
}[] = [
  { id: "cf_whatsapp", key: "whatsapp_number", label: "WhatsApp number", type: "phone", group: "Enquiry details" },
  { id: "cf_plan", key: "plan_type", label: "Plan type", type: "dropdown", group: "Enquiry details", options: ["GST", "Annual", "6 months", "Monthly"] },
  { id: "cf_req_city", key: "required_city", label: "Required city", type: "dropdown", group: "Enquiry details", options: ["New Delhi", "Mumbai", "Bengaluru", "Hyderabad", "Pune", "Dehradun", "Chennai"] },
  { id: "cf_req_state", key: "required_state", label: "Required state", type: "dropdown", group: "Enquiry details", options: ["Delhi", "Maharashtra", "Karnataka", "Telangana", "Tamil Nadu", "Uttarakhand", "Gujarat"] },
  { id: "cf_entity", key: "entity_type", label: "Entity type", type: "dropdown", group: "Enquiry details", options: ["Proprietorship", "Pvt Ltd", "LLP", "Partnership", "Individual"] },
  { id: "cf_nature", key: "nature_of_business", label: "Nature of business", type: "text", group: "Enquiry details" },
  { id: "cf_requirement", key: "requirement", label: "Requirement", type: "dropdown", group: "Enquiry details", options: ["Immediate", "Later"] },
  { id: "cf_company", key: "company_name", label: "Company name", type: "text", group: "Enquiry details" },
  { id: "cf_gst", key: "gst_registered", label: "GST registered", type: "checkbox", group: "Enquiry details" },
  { id: "cf_booking", key: "expected_booking_date", label: "Expected booking date", type: "date", group: "Follow-up tracking" },
  { id: "cf_visit", key: "visit_date", label: "Visit date", type: "date", group: "Follow-up tracking" },
  { id: "cf_lastcall", key: "last_call", label: "Last call", type: "datetime", group: "Follow-up tracking" },
  { id: "cf_callcount", key: "call_count", label: "Call count", type: "number", group: "Follow-up tracking", defaultValue: "0" },
  { id: "cf_sim", key: "sim", label: "SIM", type: "text", group: "Follow-up tracking" },
  { id: "cf_lost", key: "lost_reason", label: "Lost reason", type: "dropdown", group: "Follow-up tracking", options: ["Budget", "Competitor", "Not ready", "Duplicate", "No response"] },
  { id: "cf_msg", key: "message_followup", label: "Message follow-up", type: "textarea", group: "Follow-up tracking" },
  { id: "cf_budget", key: "budget", label: "Budget (INR)", type: "number", group: "Follow-up tracking" },
  { id: "cf_pref", key: "preferred_location", label: "Preferred location", type: "dropdown", group: "Follow-up tracking", options: ["Delhi", "Mumbai", "Bengaluru", "Hyderabad", "Pune"] },
  { id: "cf_movein", key: "move_in_date", label: "Move-in date", type: "date", group: "Follow-up tracking" },
  { id: "cf_intent", key: "intent_notes", label: "Intent notes", type: "textarea", group: "Follow-up tracking" },
];

const TEMPLATES = [
  { id: "et_new", kind: "stage" as TemplateKind, stageId: "st_new", subject: "Welcome to {{company_name}}, {{lead_name}}", body: "Hi {{lead_name}},\n\nThank you for your interest. {{salesperson_name}} ({{salesperson_phone}}) will be in touch shortly.\n\n— {{company_name}}", delayDays: 0, isActive: true },
  { id: "et_active", kind: "stage" as TemplateKind, stageId: "st_active", subject: "Next steps for your virtual office", body: "Hi {{lead_name}},\n\nJust checking in from {{company_name}}. Happy to help you shortlist an address in your city.\n\n{{salesperson_name}}", delayDays: 2, isActive: true },
  { id: "et_interested", kind: "stage" as TemplateKind, stageId: "st_interested", subject: "Shall we send a quotation?", body: "Hi {{lead_name}},\n\nYou are currently in {{stage}}. I can send a quotation for the spaces we discussed.\n\n{{salesperson_name}}", delayDays: 2, isActive: true },
  { id: "et_followup", kind: "stage" as TemplateKind, stageId: "st_followup", subject: "Following up, {{lead_name}}", body: "Hi {{lead_name}},\n\nWanted to follow up on your virtual office enquiry. Reply to this email or call {{salesperson_phone}}.\n\n{{salesperson_name}}", delayDays: 3, isActive: true },
  { id: "et_booking", kind: "stage" as TemplateKind, stageId: "st_booking", subject: "Ready when you are", body: "Hi {{lead_name}},\n\nYour booking is in progress. Let us know if you need the quotation reissued.\n\n{{company_name}}", delayDays: 1, isActive: true },
  { id: "et_converted", kind: "stage" as TemplateKind, stageId: "st_converted", subject: "Welcome aboard", body: "Hi {{lead_name}},\n\nGreat to have you with {{company_name}}. Your salesperson {{salesperson_name}} remains your point of contact.", delayDays: 0, isActive: true },
  { id: "et_lost", kind: "stage" as TemplateKind, stageId: "st_lost", subject: "We'll be here", body: "Hi {{lead_name}},\n\nWe have closed this enquiry for now. You can always reach {{salesperson_name}} if plans change.", delayDays: 0, isActive: false },
  { id: "et_quote", kind: "quotation" as TemplateKind, stageId: null, subject: "Your virtual office quotation", body: "Hi {{lead_name}},\n\nPlease find your quotation. Prices are in INR as listed on our website, including 18% GST.\n\n{{salesperson_name}}\n{{salesperson_phone}}", delayDays: 0, isActive: true },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@vospaces.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  const salesEmail = process.env.SALES_EMAIL ?? "priya.sharma@vospaces.com";
  const salesPassword = process.env.SALES_PASSWORD ?? "ChangeMe123!";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      id: "u_admin",
      name: "Admin",
      email: adminEmail,
      passwordHash: hashSync(adminPassword, 12),
      role: "admin",
      isActive: true,
      allocationPercent: 0,
      inRotation: false,
      phone: "",
      initials: "A",
      permissions: {
        create: {
          viewAllLeads: true,
          reassignLeads: true,
          export: true,
          createFields: true,
          sendQuotations: true,
        },
      },
    },
  });

  const sales = await prisma.user.upsert({
    where: { email: salesEmail },
    update: {},
    create: {
      id: "u_priya",
      name: "Priya Sharma",
      email: salesEmail,
      passwordHash: hashSync(salesPassword, 12),
      role: "salesperson",
      isActive: true,
      allocationPercent: 100,
      inRotation: true,
      phone: "",
      initials: initials("Priya Sharma"),
      permissions: {
        create: {
          viewAllLeads: false,
          reassignLeads: false,
          export: false,
          createFields: false,
          sendQuotations: true,
        },
      },
      assignmentCounter: { create: { assignedCount: 0 } },
    },
  });

  for (const stage of STAGES) {
    await prisma.leadStage.upsert({
      where: { id: stage.id },
      update: { name: stage.name, position: stage.position, kind: stage.kind, color: stage.color },
      create: stage,
    });
  }

  for (const field of FIELDS) {
    await prisma.customField.upsert({
      where: { key: field.key },
      update: {},
      create: {
        id: field.id,
        key: field.key,
        label: field.label,
        type: field.type,
        options: field.options ?? [],
        group: field.group,
        defaultValue: field.defaultValue ?? "",
        createdById: admin.id,
      },
    });
  }

  for (const tpl of TEMPLATES) {
    await prisma.emailTemplate.upsert({
      where: { id: tpl.id },
      update: {},
      create: tpl,
    });
  }

  for (const source of [LeadSource.Website, LeadSource.MetaAds, LeadSource.GoogleAds, LeadSource.Manual]) {
    await prisma.assignmentRule.upsert({
      where: { source },
      update: {},
      create: { source, userId: null },
    });
  }

  await prisma.setting.upsert({
    where: { key: "app" },
    update: {},
    create: {
      key: "app",
      value: {
        companyName: "VS CRM",
        catalogApiUrl: "https://vospaces.com/adminPannel/catalog-api/crm-listings-api.php",
        catalogApiKey: "vs-crm-catalog-change-me",
        smtp: {
          host: "",
          port: "587",
          username: "",
          password: "",
          fromName: "VOspaces",
          fromEmail: "",
        },
      },
    },
  });

  console.log(`Seeded admin ${admin.email} and salesperson ${sales.email}`);
  console.log("Default password: ChangeMe123! (change it in Settings)");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
