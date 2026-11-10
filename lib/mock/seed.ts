import type {
  Activity,
  AppNotification,
  AppSettings,
  AssignmentShare,
  CatalogCity,
  CatalogSpace,
  CatalogState,
  CustomField,
  EmailJob,
  EmailTemplate,
  IncomingEvent,
  Lead,
  LeadSource,
  Note,
  Quotation,
  Stage,
  TimelineItem,
  User,
} from "@/lib/types";

export const ADMIN_ID = "u_admin";
export const PRIYA_ID = "u_priya";
export const AMIT_ID = "u_amit";
export const KAVITA_ID = "u_kavita";

const offPerms = {
  view_all_leads: false,
  reassign_leads: false,
  export: false,
  create_fields: false,
  send_quotations: false,
};

export const users: User[] = [
  {
    id: ADMIN_ID,
    name: "Admin",
    email: "admin@vscrm.local",
    role: "admin",
    isActive: true,
    allocationPercent: 0,
    inRotation: false,
    permissions: {
      view_all_leads: true,
      reassign_leads: true,
      export: true,
      create_fields: true,
      send_quotations: true,
    },
    phone: "+91 98100 00001",
    initials: "A",
  },
  {
    id: PRIYA_ID,
    name: "Priya Sharma",
    email: "priya.sharma@vscrm.local",
    role: "salesperson",
    isActive: true,
    allocationPercent: 40,
    inRotation: true,
    permissions: { ...offPerms, send_quotations: true, export: true },
    phone: "+91 98100 11001",
    initials: "PS",
  },
  {
    id: AMIT_ID,
    name: "Amit Verma",
    email: "amit.verma@vscrm.local",
    role: "salesperson",
    isActive: true,
    allocationPercent: 30,
    inRotation: true,
    permissions: { ...offPerms },
    phone: "+91 98100 11002",
    initials: "AV",
  },
  {
    id: KAVITA_ID,
    name: "Kavita Rao",
    email: "kavita.rao@vscrm.local",
    role: "salesperson",
    isActive: true,
    allocationPercent: 30,
    inRotation: true,
    permissions: { ...offPerms },
    phone: "+91 98100 11003",
    initials: "KR",
  },
];

export const stages: Stage[] = [
  { id: "st_new", name: "New", position: 1, isActive: true, kind: "open", color: "#4C7DFF" },
  { id: "st_active", name: "Active", position: 2, isActive: true, kind: "open", color: "#F5A524" },
  { id: "st_interested", name: "Interested", position: 3, isActive: true, kind: "open", color: "#8B5CF6" },
  { id: "st_followup", name: "Follow-up", position: 4, isActive: true, kind: "open", color: "#14B8A6" },
  { id: "st_booking", name: "Booking", position: 5, isActive: true, kind: "open", color: "#F97316" },
  { id: "st_converted", name: "Converted", position: 6, isActive: true, kind: "converted", color: "#16A34A" },
  { id: "st_lost", name: "Lost", position: 7, isActive: true, kind: "lost", color: "#6B7280" },
];

function cf(field: Omit<CustomField, "createdBy" | "isActive" | "required" | "options" | "defaultValue"> & Partial<CustomField>): CustomField {
  return {
    options: [],
    required: false,
    isActive: true,
    createdBy: ADMIN_ID,
    defaultValue: "",
    ...field,
  };
}

export const customFields: CustomField[] = [
  cf({ id: "cf_whatsapp", key: "whatsapp_number", label: "WhatsApp number", type: "phone", group: "Enquiry details" }),
  cf({
    id: "cf_plan",
    key: "plan_type",
    label: "Plan type",
    type: "dropdown",
    group: "Enquiry details",
    options: ["GST", "Annual", "6 months", "Monthly"],
  }),
  cf({
    id: "cf_req_city",
    key: "required_city",
    label: "Required city",
    type: "dropdown",
    group: "Enquiry details",
    options: ["New Delhi", "Mumbai", "Bengaluru", "Hyderabad", "Pune", "Dehradun", "Chennai"],
  }),
  cf({
    id: "cf_req_state",
    key: "required_state",
    label: "Required state",
    type: "dropdown",
    group: "Enquiry details",
    options: ["Delhi", "Maharashtra", "Karnataka", "Telangana", "Tamil Nadu", "Uttarakhand", "Gujarat"],
  }),
  cf({
    id: "cf_entity",
    key: "entity_type",
    label: "Entity type",
    type: "dropdown",
    group: "Enquiry details",
    options: ["Proprietorship", "Pvt Ltd", "LLP", "Partnership", "Individual"],
  }),
  cf({ id: "cf_nature", key: "nature_of_business", label: "Nature of business", type: "text", group: "Enquiry details" }),
  cf({
    id: "cf_requirement",
    key: "requirement",
    label: "Requirement",
    type: "dropdown",
    group: "Enquiry details",
    options: ["Immediate", "Later"],
  }),
  cf({ id: "cf_company", key: "company_name", label: "Company name", type: "text", group: "Enquiry details" }),
  cf({ id: "cf_gst", key: "gst_registered", label: "GST registered", type: "checkbox", group: "Enquiry details" }),
  cf({
    id: "cf_booking",
    key: "expected_booking_date",
    label: "Expected booking date",
    type: "date",
    group: "Follow-up tracking",
  }),
  cf({ id: "cf_visit", key: "visit_date", label: "Visit date", type: "date", group: "Follow-up tracking" }),
  cf({ id: "cf_lastcall", key: "last_call", label: "Last call", type: "datetime", group: "Follow-up tracking" }),
  cf({ id: "cf_callcount", key: "call_count", label: "Call count", type: "number", group: "Follow-up tracking", defaultValue: "0" }),
  cf({ id: "cf_sim", key: "sim", label: "SIM", type: "text", group: "Follow-up tracking" }),
  cf({
    id: "cf_lost",
    key: "lost_reason",
    label: "Lost reason",
    type: "dropdown",
    group: "Follow-up tracking",
    options: ["Budget", "Competitor", "Not ready", "Duplicate", "No response"],
  }),
  cf({ id: "cf_msg", key: "message_followup", label: "Message follow-up", type: "textarea", group: "Follow-up tracking" }),
  cf({ id: "cf_budget", key: "budget", label: "Budget (INR)", type: "number", group: "Follow-up tracking" }),
  cf({
    id: "cf_pref",
    key: "preferred_location",
    label: "Preferred location",
    type: "dropdown",
    group: "Follow-up tracking",
    options: ["Delhi", "Mumbai", "Bengaluru", "Hyderabad", "Pune"],
  }),
  cf({ id: "cf_movein", key: "move_in_date", label: "Move-in date", type: "date", group: "Follow-up tracking" }),
  cf({ id: "cf_intent", key: "intent_notes", label: "Intent notes", type: "textarea", group: "Follow-up tracking" }),
];

type LeadSeed = {
  name: string;
  city: string;
  state: string;
  source: LeadSource;
  stageId: string;
  assignedTo: string;
  day: string;
  duplicate?: boolean;
  unsubscribed?: boolean;
  followupsOff?: boolean;
};

const PEOPLE: LeadSeed[] = [
  { name: "Asha Verma", city: "New Delhi", state: "Delhi", source: "Website", stageId: "st_converted", assignedTo: PRIYA_ID, day: "2026-10-24" },
  { name: "Rohan Mehta", city: "Mumbai", state: "Maharashtra", source: "Website", stageId: "st_converted", assignedTo: PRIYA_ID, day: "2026-10-26" },
  { name: "Neha Kapoor", city: "Bengaluru", state: "Karnataka", source: "Website", stageId: "st_converted", assignedTo: KAVITA_ID, day: "2026-10-28" },
  { name: "Vikram Singh", city: "New Delhi", state: "Delhi", source: "Meta Ads", stageId: "st_converted", assignedTo: PRIYA_ID, day: "2026-10-30" },
  { name: "Ananya Iyer", city: "Bengaluru", state: "Karnataka", source: "Meta Ads", stageId: "st_converted", assignedTo: KAVITA_ID, day: "2026-11-01" },
  { name: "Karan Malhotra", city: "Mumbai", state: "Maharashtra", source: "Google Ads", stageId: "st_converted", assignedTo: AMIT_ID, day: "2026-11-02" },
  { name: "Divya Nair", city: "Pune", state: "Maharashtra", source: "Website", stageId: "st_lost", assignedTo: AMIT_ID, day: "2026-10-23" },
  { name: "Arjun Patel", city: "Ahmedabad", state: "Gujarat", source: "Meta Ads", stageId: "st_lost", assignedTo: AMIT_ID, day: "2026-10-25" },
  { name: "Sneha Reddy", city: "Hyderabad", state: "Telangana", source: "Google Ads", stageId: "st_lost", assignedTo: PRIYA_ID, day: "2026-10-27" },
  { name: "Manish Gupta", city: "New Delhi", state: "Delhi", source: "Website", stageId: "st_lost", assignedTo: KAVITA_ID, day: "2026-10-29" },
  { name: "Pooja Shah", city: "Mumbai", state: "Maharashtra", source: "Website", stageId: "st_new", assignedTo: PRIYA_ID, day: "2026-11-05" },
  { name: "Rahul Joshi", city: "Pune", state: "Maharashtra", source: "Website", stageId: "st_new", assignedTo: AMIT_ID, day: "2026-11-05" },
  { name: "Isha Kulkarni", city: "Bengaluru", state: "Karnataka", source: "Meta Ads", stageId: "st_new", assignedTo: KAVITA_ID, day: "2026-11-04" },
  { name: "Nikhil Rao", city: "Hyderabad", state: "Telangana", source: "Google Ads", stageId: "st_new", assignedTo: PRIYA_ID, day: "2026-11-04" },
  { name: "Meera Desai", city: "Surat", state: "Gujarat", source: "Manual", stageId: "st_new", assignedTo: AMIT_ID, day: "2026-11-03" },
  { name: "Siddharth Jain", city: "Jaipur", state: "Rajasthan", source: "Website", stageId: "st_new", assignedTo: KAVITA_ID, day: "2026-11-03" },
  { name: "Kavya Menon", city: "Kochi", state: "Kerala", source: "Meta Ads", stageId: "st_new", assignedTo: PRIYA_ID, day: "2026-11-02", duplicate: true },
  { name: "Aditya Bansal", city: "Noida", state: "Uttar Pradesh", source: "Google Ads", stageId: "st_new", assignedTo: KAVITA_ID, day: "2026-10-31" },
  { name: "Riya Chawla", city: "New Delhi", state: "Delhi", source: "Website", stageId: "st_active", assignedTo: PRIYA_ID, day: "2026-11-01" },
  { name: "Harsh Aggarwal", city: "Gurgaon", state: "Haryana", source: "Website", stageId: "st_active", assignedTo: AMIT_ID, day: "2026-10-30" },
  { name: "Tanvi Pillai", city: "Chennai", state: "Tamil Nadu", source: "Meta Ads", stageId: "st_active", assignedTo: KAVITA_ID, day: "2026-10-28" },
  { name: "Yash Tiwari", city: "Lucknow", state: "Uttar Pradesh", source: "Google Ads", stageId: "st_active", assignedTo: PRIYA_ID, day: "2026-10-26" },
  { name: "Nandini Bose", city: "Kolkata", state: "West Bengal", source: "Website", stageId: "st_active", assignedTo: AMIT_ID, day: "2026-10-24" },
  { name: "Kunal Saxena", city: "Indore", state: "Madhya Pradesh", source: "Manual", stageId: "st_active", assignedTo: KAVITA_ID, day: "2026-10-23" },
  { name: "Shreya Ghosh", city: "Kolkata", state: "West Bengal", source: "Website", stageId: "st_interested", assignedTo: PRIYA_ID, day: "2026-11-04" },
  { name: "Varun Khanna", city: "Chandigarh", state: "Chandigarh", source: "Website", stageId: "st_interested", assignedTo: AMIT_ID, day: "2026-11-02" },
  { name: "Aditi Rao", city: "Bengaluru", state: "Karnataka", source: "Meta Ads", stageId: "st_interested", assignedTo: KAVITA_ID, day: "2026-10-31" },
  { name: "Mohit Bhatia", city: "New Delhi", state: "Delhi", source: "Google Ads", stageId: "st_interested", assignedTo: PRIYA_ID, day: "2026-10-29", unsubscribed: true },
  { name: "Palak Sinha", city: "Patna", state: "Bihar", source: "Website", stageId: "st_interested", assignedTo: AMIT_ID, day: "2026-10-27" },
  { name: "Rakesh Nair", city: "Thiruvananthapuram", state: "Kerala", source: "Meta Ads", stageId: "st_interested", assignedTo: KAVITA_ID, day: "2026-10-25" },
  { name: "Juhi Prasad", city: "Ranchi", state: "Jharkhand", source: "Website", stageId: "st_interested", assignedTo: PRIYA_ID, day: "2026-10-23" },
  { name: "Gaurav Kulkarni", city: "Pune", state: "Maharashtra", source: "Google Ads", stageId: "st_interested", assignedTo: KAVITA_ID, day: "2026-11-05" },
  { name: "Sana Qureshi", city: "Hyderabad", state: "Telangana", source: "Website", stageId: "st_interested", assignedTo: AMIT_ID, day: "2026-10-24", duplicate: true },
  { name: "Deepak Reddy", city: "Hyderabad", state: "Telangana", source: "Website", stageId: "st_followup", assignedTo: PRIYA_ID, day: "2026-11-03" },
  { name: "Trisha Iyer", city: "Chennai", state: "Tamil Nadu", source: "Meta Ads", stageId: "st_followup", assignedTo: AMIT_ID, day: "2026-11-01" },
  { name: "Amitabh Sen", city: "Kolkata", state: "West Bengal", source: "Google Ads", stageId: "st_followup", assignedTo: KAVITA_ID, day: "2026-10-30" },
  { name: "Leela Krishnan", city: "Coimbatore", state: "Tamil Nadu", source: "Website", stageId: "st_followup", assignedTo: PRIYA_ID, day: "2026-10-28", followupsOff: true },
  { name: "Farhan Ali", city: "Mumbai", state: "Maharashtra", source: "Meta Ads", stageId: "st_followup", assignedTo: KAVITA_ID, day: "2026-10-26" },
  { name: "Bhavna Shah", city: "Ahmedabad", state: "Gujarat", source: "Manual", stageId: "st_followup", assignedTo: AMIT_ID, day: "2026-10-23", duplicate: true },
  { name: "Chetan More", city: "Nagpur", state: "Maharashtra", source: "Website", stageId: "st_booking", assignedTo: PRIYA_ID, day: "2026-11-02" },
  { name: "Diya Kapoor", city: "New Delhi", state: "Delhi", source: "Meta Ads", stageId: "st_booking", assignedTo: KAVITA_ID, day: "2026-10-29" },
  { name: "Eshan Vyas", city: "Vadodara", state: "Gujarat", source: "Google Ads", stageId: "st_booking", assignedTo: AMIT_ID, day: "2026-10-25" },
];

const ORIGINALS: Record<LeadSource, (name: string, city: string) => Lead["original"]> = {
  Website: (name, city) => ({
    raw: {
      name,
      city,
      page_url: `https://example.com/virtual-office-${city.toLowerCase().replace(/\s+/g, "-")}`,
      message: "Need a virtual office address for GST and company registration.",
    },
    pageUrl: `https://example.com/virtual-office-${city.toLowerCase().replace(/\s+/g, "-")}`,
  }),
  "Meta Ads": (name, city) => ({
    raw: { name, city, platform: "Meta" },
    campaign: "Delhi VO Q4",
    adSet: "GST founders 25-44",
    formName: "Virtual office lead form",
  }),
  "Google Ads": (name, city) => ({
    raw: { name, city, platform: "Google" },
    campaign: "virtual-office-india",
    adSet: "Search – GST + registered office",
    formName: "Google lead form",
  }),
  Manual: (name, city) => ({
    raw: { name, city, entered_by: "CRM form" },
  }),
};

function phoneFor(i: number) {
  const n = 9876500000 + i * 17;
  const s = String(n);
  return `+91 ${s.slice(0, 5)} ${s.slice(5)}`;
}

function emailFor(name: string, i: number) {
  const local = name.toLowerCase().replace(/[^a-z]+/g, ".");
  return `${local}${i % 3 === 0 ? ".work" : ""}@example.com`;
}

export function buildLeads(): Lead[] {
  const duplicateMap: Record<string, string> = {
    "Kavya Menon": "Asha Verma",
    "Sana Qureshi": "Rohan Mehta",
    "Bhavna Shah": "Divya Nair",
  };

  const idByName = Object.fromEntries(PEOPLE.map((p, i) => [p.name, `ld_${String(i + 1).padStart(3, "0")}`]));

  return PEOPLE.map((p, i) => {
    const id = idByName[p.name];
    const originalOf = p.duplicate ? duplicateMap[p.name] : undefined;
    const createdByType = p.source === "Manual" ? "user" : "integration";
    const createdBy = p.source === "Manual" ? ADMIN_ID : p.source;
    return {
      id,
      name: p.name,
      mobile: phoneFor(i),
      email: emailFor(p.name, i),
      state: p.state,
      city: p.city,
      source: p.source,
      stageId: p.stageId,
      assignedTo: p.assignedTo,
      createdBy,
      createdByType: createdByType as Lead["createdByType"],
      duplicateOfId: originalOf ? idByName[originalOf] : null,
      followupsDisabled: Boolean(p.followupsOff),
      unsubscribed: Boolean(p.unsubscribed),
      createdAt: `${p.day}T10:${String((i * 7) % 60).padStart(2, "0")}:00+05:30`,
      message: "Need a virtual office address",
      original: ORIGINALS[p.source](p.name, p.city),
      customValues: {
        whatsapp_number: phoneFor(i),
        plan_type: ["GST", "Annual", "6 months", "Monthly"][i % 4],
        required_city: p.city,
        required_state: p.state,
        entity_type: ["Proprietorship", "Pvt Ltd", "LLP", "Partnership", "Individual"][i % 5],
        nature_of_business: i % 3 === 0 ? "D2C brand" : i % 3 === 1 ? "CA practice" : "IT services",
        requirement: i % 2 === 0 ? "Immediate" : "Later",
        company_name: i % 4 === 0 ? `${p.name.split(" ")[1]} Ventures` : i % 3 === 0 ? `${p.name.split(" ")[0]} Labs` : null,
        gst_registered: i % 3 === 0,
        expected_booking_date: i % 3 === 0 ? "2026-12-01" : null,
        visit_date: i % 5 === 0 ? "2026-11-12" : null,
        last_call: i % 4 === 0 ? `${p.day}T15:00` : null,
        call_count: i % 7,
        sim: i % 4 === 0 ? String(2 + (i % 3)) : null,
        lost_reason: p.stageId === "st_lost" ? ["Budget", "No response", "Competitor"][i % 3] : null,
        message_followup: i % 6 === 0 ? "Asked to share GST quotation on WhatsApp." : null,
        budget: [8000, 12000, 15000, 20000, 25000][i % 5],
        preferred_location: ["Delhi", "Mumbai", "Bengaluru", "Hyderabad", "Pune"][i % 5],
        move_in_date: i % 2 === 0 ? "2026-12-01" : "2027-01-15",
        intent_notes: i % 5 === 0 ? "Asked about mail handling and GST certificate turnaround." : null,
      },
    };
  });
}

export const leads: Lead[] = buildLeads();

export const notes: Note[] = [
  { id: "nt_1", leadId: "ld_001", body: "Confirmed GST registration is the main need. Annual plan preferred.", authorId: PRIYA_ID, createdAt: "2026-10-25T11:20:00+05:30" },
  { id: "nt_2", leadId: "ld_001", body: "Sent quotation for Connaught Place Annual. Waiting on payment.", authorId: PRIYA_ID, createdAt: "2026-10-26T16:05:00+05:30" },
  { id: "nt_3", leadId: "ld_011", body: "Inbound from website. Wants Delhi address for a new Pvt Ltd.", authorId: PRIYA_ID, createdAt: "2026-11-05T11:10:00+05:30" },
  { id: "nt_4", leadId: "ld_019", body: "Called twice — asked to follow up after Diwali week.", authorId: PRIYA_ID, createdAt: "2026-11-02T14:40:00+05:30" },
  { id: "nt_5", leadId: "ld_007", body: "Budget too low. Marked lost after second call.", authorId: AMIT_ID, createdAt: "2026-10-28T09:15:00+05:30" },
  { id: "nt_6", leadId: "ld_040", body: "Almost ready to book. Needs company name on the quotation.", authorId: PRIYA_ID, createdAt: "2026-11-03T17:30:00+05:30" },
  { id: "nt_7", leadId: "ld_028", body: "Unsubscribed from automated follow-ups. Can still send a quotation if they ask.", authorId: PRIYA_ID, createdAt: "2026-10-30T12:00:00+05:30" },
];

function activitiesForOwner(ownerId: string, completed: number, pending: number, start: number): Activity[] {
  const mine = leads.filter((l) => l.assignedTo === ownerId);
  const items: Activity[] = [];
  for (let i = 0; i < completed; i++) {
    const lead = mine[i % mine.length];
    const day = 10 + (i % 20);
    items.push({
      id: `ac_${ownerId}_${i}`,
      leadId: lead.id,
      type: i % 4 === 0 ? "call" : i % 4 === 1 ? "follow-up" : i % 4 === 2 ? "meeting" : "task",
      description: i % 4 === 0 ? "Intro call completed" : i % 4 === 1 ? "Follow-up on quotation" : i % 4 === 2 ? "Discovery meeting" : "Send brochure",
      dueAt: `2026-10-${String(Math.min(day, 31)).padStart(2, "0")}T11:00:00+05:30`,
      assignedTo: ownerId,
      status: "completed",
      completedAt: `2026-10-${String(Math.min(day, 31)).padStart(2, "0")}T16:00:00+05:30`,
    });
  }
  for (let i = 0; i < pending; i++) {
    const lead = mine[(i + 3) % mine.length];
    const overdue = i === 0;
    items.push({
      id: `ac_${ownerId}_p_${i}`,
      leadId: lead.id,
      type: i % 2 === 0 ? "follow-up" : "call",
      description: overdue ? "Overdue follow-up call" : "Scheduled check-in",
      dueAt: overdue ? "2026-11-04T10:00:00+05:30" : `2026-11-0${6 + (i % 3)}T15:00:00+05:30`,
      assignedTo: ownerId,
      status: "pending",
      completedAt: null,
    });
  }
  return items;
}

export const activities: Activity[] = [
  ...activitiesForOwner(PRIYA_ID, 22, 4, 0),
  ...activitiesForOwner(AMIT_ID, 17, 3, 0),
  ...activitiesForOwner(KAVITA_ID, 19, 5, 0),
];

export const emailTemplates: EmailTemplate[] = [
  { id: "et_new", kind: "stage", stageId: "st_new", subject: "Welcome to {{company_name}}, {{lead_name}}", body: "Hi {{lead_name}},\n\nThank you for your interest. {{salesperson_name}} ({{salesperson_phone}}) will be in touch shortly.\n\n— {{company_name}}", delayDays: 0, isActive: true },
  { id: "et_active", kind: "stage", stageId: "st_active", subject: "Next steps for your virtual office", body: "Hi {{lead_name}},\n\nJust checking in from {{company_name}}. Happy to help you shortlist an address in your city.\n\n{{salesperson_name}}", delayDays: 2, isActive: true },
  { id: "et_interested", kind: "stage", stageId: "st_interested", subject: "Shall we send a quotation?", body: "Hi {{lead_name}},\n\nYou are currently in {{stage}}. I can send a quotation for the spaces we discussed.\n\n{{salesperson_name}}", delayDays: 2, isActive: true },
  { id: "et_followup", kind: "stage", stageId: "st_followup", subject: "Following up, {{lead_name}}", body: "Hi {{lead_name}},\n\nWanted to follow up on your virtual office enquiry. Reply to this email or call {{salesperson_phone}}.\n\n{{salesperson_name}}", delayDays: 3, isActive: true },
  { id: "et_booking", kind: "stage", stageId: "st_booking", subject: "Ready when you are", body: "Hi {{lead_name}},\n\nYour booking is in progress. Let us know if you need the quotation reissued.\n\n{{company_name}}", delayDays: 1, isActive: true },
  { id: "et_converted", kind: "stage", stageId: "st_converted", subject: "Welcome aboard", body: "Hi {{lead_name}},\n\nGreat to have you with {{company_name}}. Your salesperson {{salesperson_name}} remains your point of contact.", delayDays: 0, isActive: true },
  { id: "et_lost", kind: "stage", stageId: "st_lost", subject: "We'll be here", body: "Hi {{lead_name}},\n\nWe have closed this enquiry for now. You can always reach {{salesperson_name}} if plans change.", delayDays: 0, isActive: false },
  { id: "et_quote", kind: "quotation", stageId: null, subject: "Your virtual office quotation", body: "Hi {{lead_name}},\n\nPlease find your quotation attached. Prices are in INR as listed on our website.\n\n{{salesperson_name}}\n{{salesperson_phone}}", delayDays: 0, isActive: true },
];

export const emailJobs: EmailJob[] = [
  { id: "ej_1", leadId: "ld_011", templateId: "et_new", to: emailFor("Pooja Shah", 10), scheduledAt: "2026-11-05T11:12:00+05:30", sentAt: "2026-11-05T11:12:20+05:30", status: "sent", attempts: 1, response: "250 OK" },
  { id: "ej_2", leadId: "ld_019", templateId: "et_active", to: emailFor("Riya Chawla", 18), scheduledAt: "2026-11-03T10:00:00+05:30", sentAt: "2026-11-03T10:00:08+05:30", status: "sent", attempts: 1, response: "250 OK" },
  { id: "ej_3", leadId: "ld_028", templateId: "et_interested", to: emailFor("Mohit Bhatia", 27), scheduledAt: "2026-10-31T10:00:00+05:30", sentAt: null, status: "cancelled", attempts: 0, response: "Unsubscribed" },
  { id: "ej_4", leadId: "ld_034", templateId: "et_followup", to: emailFor("Deepak Reddy", 33), scheduledAt: "2026-11-06T10:00:00+05:30", sentAt: null, status: "scheduled", attempts: 0, response: "" },
  { id: "ej_5", leadId: "ld_007", templateId: "et_lost", to: emailFor("Divya Nair", 6), scheduledAt: "2026-10-28T12:00:00+05:30", sentAt: null, status: "failed", attempts: 3, response: "Mailbox full" },
];

export const quotations: Quotation[] = [
  {
    id: "qt_1",
    leadId: "ld_001",
    createdBy: PRIYA_ID,
    recipient: emailFor("Asha Verma", 0),
    totalAmount: 11999,
    status: "sent",
    sentAt: "2026-10-26T16:10:00+05:30",
    createdAt: "2026-10-26T16:08:00+05:30",
    items: [{ id: "qi_1", spaceId: "sp_204", name: "Connaught Place Virtual Office", details: "Mail handling + GST address", planName: "Annual", duration: "12 months", quantity: 1, unitPrice: 11999, lineTotal: 11999 }],
  },
  {
    id: "qt_2",
    leadId: "ld_040",
    createdBy: PRIYA_ID,
    recipient: emailFor("Chetan More", 39),
    totalAmount: 23998,
    status: "draft",
    sentAt: null,
    createdAt: "2026-11-03T17:40:00+05:30",
    items: [
      { id: "qi_2", spaceId: "sp_204", name: "Connaught Place Virtual Office", details: "Mail handling + GST address", planName: "Annual", duration: "12 months", quantity: 1, unitPrice: 11999, lineTotal: 11999 },
      { id: "qi_3", spaceId: "sp_318", name: "BKC Virtual Office", details: "Premium business address", planName: "Annual", duration: "12 months", quantity: 1, unitPrice: 11999, lineTotal: 11999 },
    ],
  },
  {
    id: "qt_3",
    leadId: "ld_006",
    createdBy: AMIT_ID,
    recipient: emailFor("Karan Malhotra", 5),
    totalAmount: 6999,
    status: "failed",
    sentAt: null,
    createdAt: "2026-11-02T13:20:00+05:30",
    items: [{ id: "qi_4", spaceId: "sp_318", name: "BKC Virtual Office", details: "Premium business address", planName: "6 months", duration: "6 months", quantity: 1, unitPrice: 6999, lineTotal: 6999 }],
  },
];

export const notifications: AppNotification[] = [
  { id: "nf_1", userId: PRIYA_ID, type: "assignment", leadId: "ld_011", message: "New lead assigned: Pooja Shah", readAt: null, createdAt: "2026-11-05T11:05:00+05:30" },
  { id: "nf_2", userId: PRIYA_ID, type: "duplicate", leadId: "ld_017", message: "Duplicate lead detected for Asha Verma", readAt: null, createdAt: "2026-11-02T10:20:00+05:30" },
  { id: "nf_3", userId: PRIYA_ID, type: "activity_overdue", leadId: "ld_019", message: "Overdue follow-up with Riya Chawla", readAt: null, createdAt: "2026-11-04T10:05:00+05:30" },
  { id: "nf_4", userId: ADMIN_ID, type: "integration_failure", message: "Meta Ads event failed: lead retrieval timed out", readAt: null, createdAt: "2026-11-05T09:12:00+05:30" },
  { id: "nf_5", userId: ADMIN_ID, type: "quotation_failed", leadId: "ld_006", message: "Quotation email failed for Karan Malhotra", readAt: "2026-11-02T14:00:00+05:30", createdAt: "2026-11-02T13:22:00+05:30" },
  { id: "nf_6", userId: AMIT_ID, type: "assignment", leadId: "ld_012", message: "New lead assigned: Rahul Joshi", readAt: null, createdAt: "2026-11-05T11:40:00+05:30" },
  { id: "nf_7", userId: KAVITA_ID, type: "email_failed", leadId: "ld_007", message: "Automated email failed for Divya Nair", readAt: null, createdAt: "2026-10-28T12:10:00+05:30" },
  { id: "nf_8", userId: PRIYA_ID, type: "quotation_sent", leadId: "ld_001", message: "Quotation sent to Asha Verma", readAt: "2026-10-26T16:15:00+05:30", createdAt: "2026-10-26T16:10:00+05:30" },
];

export const assignmentShares: AssignmentShare[] = [
  { source: "Website", userId: PRIYA_ID, percent: 40 },
  { source: "Website", userId: AMIT_ID, percent: 30 },
  { source: "Website", userId: KAVITA_ID, percent: 30 },
  { source: "Meta Ads", userId: PRIYA_ID, percent: 50 },
  { source: "Meta Ads", userId: AMIT_ID, percent: 50 },
  { source: "Google Ads", userId: KAVITA_ID, percent: 100 },
  { source: "Manual", userId: PRIYA_ID, percent: 100 },
];

export const incomingEvents: IncomingEvent[] = [
  { id: "ev_1", source: "Website", externalId: "web-000198", status: "processed", lastError: null, receivedAt: "2026-11-05T11:04:00+05:30", lastSyncAt: "2026-11-05T11:04:02+05:30" },
  { id: "ev_2", source: "Meta Ads", externalId: "meta-88211", status: "failed", lastError: "Lead retrieval timed out (token ok, Graph API 504)", receivedAt: "2026-11-05T09:11:00+05:30", lastSyncAt: "2026-11-05T08:00:00+05:30" },
  { id: "ev_3", source: "Google Ads", externalId: "gads-4412", status: "processed", lastError: null, receivedAt: "2026-11-05T10:22:00+05:30", lastSyncAt: "2026-11-05T10:00:00+05:30" },
  { id: "ev_4", source: "Meta Ads", externalId: "meta-88190", status: "processed", lastError: null, receivedAt: "2026-11-04T18:40:00+05:30", lastSyncAt: "2026-11-05T08:00:00+05:30" },
];

export const settings: AppSettings = {
  companyName: "VS CRM",
  catalogApiUrl: "https://vospaces.com/adminPannel/catalog-api/crm-listings-api.php",
  catalogApiKey: "vs-crm-catalog-change-me",
  smtp: {
    host: "smtp.example.com",
    port: "587",
    username: "hello@example.com",
    password: "••••••••",
    fromName: "VS Virtual Office",
    fromEmail: "hello@example.com",
  },
};

export const catalogStates: CatalogState[] = [
  { id: "stt_dl", name: "Delhi" },
  { id: "stt_mh", name: "Maharashtra" },
  { id: "stt_ka", name: "Karnataka" },
];

export const catalogCities: CatalogCity[] = [
  { id: "ct_nd", name: "New Delhi", stateId: "stt_dl" },
  { id: "ct_mum", name: "Mumbai", stateId: "stt_mh" },
  { id: "ct_pun", name: "Pune", stateId: "stt_mh" },
  { id: "ct_blr", name: "Bengaluru", stateId: "stt_ka" },
];

export const catalogSpaces: CatalogSpace[] = [
  {
    id: "sp_204",
    sku: "VO-DEL-CP-01",
    name: "Connaught Place Virtual Office",
    category: "Virtual Office",
    address: "Block A, Connaught Place, New Delhi 110001",
    cityId: "ct_nd",
    description: "Prime CP address with GST registration support, mail handling and a meeting-room credit.",
    plans: [
      { id: "pl_12", name: "Annual", duration: "12 months", price: 11999 },
      { id: "pl_6", name: "6 months", duration: "6 months", price: 6999 },
      { id: "pl_1", name: "Monthly", duration: "1 month", price: 1299 },
    ],
  },
  {
    id: "sp_205",
    sku: "VO-DEL-SK-02",
    name: "Saket Virtual Office",
    category: "Virtual Office",
    address: "District Centre, Saket, New Delhi 110017",
    cityId: "ct_nd",
    description: "South Delhi address suited to D2C brands.",
    plans: [
      { id: "pl_12b", name: "Annual", duration: "12 months", price: 9999 },
      { id: "pl_6b", name: "6 months", duration: "6 months", price: 5999 },
    ],
  },
  {
    id: "sp_318",
    sku: "VO-MUM-BKC-01",
    name: "BKC Virtual Office",
    category: "Virtual Office",
    address: "G Block, Bandra Kurla Complex, Mumbai 400051",
    cityId: "ct_mum",
    description: "Premium BKC business address. Prices as returned by the website, INR, tax-inclusive.",
    plans: [
      { id: "pl_12c", name: "Annual", duration: "12 months", price: 14999 },
      { id: "pl_6c", name: "6 months", duration: "6 months", price: 8499 },
    ],
  },
  {
    id: "sp_401",
    sku: "VO-BLR-KOR-01",
    name: "Koramangala Virtual Office",
    category: "Virtual Office",
    address: "80 Feet Road, Koramangala, Bengaluru 560095",
    cityId: "ct_blr",
    description: "Startup-friendly Bengaluru address with courier handling.",
    plans: [
      { id: "pl_12d", name: "Annual", duration: "12 months", price: 10999 },
      { id: "pl_6d", name: "6 months", duration: "6 months", price: 6499 },
    ],
  },
];

export function buildTimeline(allLeads: Lead[], allNotes: Note[], allActivities: Activity[], allJobs: EmailJob[], allQuotes: Quotation[], allUsers: User[], allStages: Stage[]): TimelineItem[] {
  const userName = (id: string) => allUsers.find((u) => u.id === id)?.name ?? id;
  const stageName = (id: string) => allStages.find((s) => s.id === id)?.name ?? id;
  const items: TimelineItem[] = [];

  for (const lead of allLeads) {
    items.push({
      id: `tl_c_${lead.id}`,
      leadId: lead.id,
      at: lead.createdAt,
      title: "Lead created",
      detail: `${lead.source} · assigned to ${userName(lead.assignedTo)}`,
      kind: "created",
    });
  }
  for (const n of allNotes) {
    items.push({
      id: `tl_n_${n.id}`,
      leadId: n.leadId,
      at: n.createdAt,
      title: "Note added",
      detail: `${userName(n.authorId)}: ${n.body}`,
      kind: "note",
    });
  }
  for (const a of allActivities) {
    items.push({
      id: `tl_a_${a.id}`,
      leadId: a.leadId,
      at: a.completedAt ?? a.dueAt,
      title: a.status === "completed" ? `${a.type} completed` : `${a.type} scheduled`,
      detail: a.description,
      kind: "activity",
    });
  }
  for (const j of allJobs) {
    items.push({
      id: `tl_e_${j.id}`,
      leadId: j.leadId,
      at: j.sentAt ?? j.scheduledAt,
      title: `Email ${j.status}`,
      detail: j.to,
      kind: "email",
    });
  }
  for (const q of allQuotes) {
    items.push({
      id: `tl_q_${q.id}`,
      leadId: q.leadId,
      at: q.sentAt ?? q.createdAt,
      title: `Quotation ${q.status}`,
      detail: `₹${q.totalAmount.toLocaleString("en-IN")} to ${q.recipient}`,
      kind: "quotation",
    });
  }
  void stageName;
  return items.sort((a, b) => (a.at < b.at ? 1 : -1));
}

export const monthDeltas = {
  total: 8,
  new: 2,
  active: 0,
  interested: 3,
  booking: -1,
  converted: 2,
  lost: -2,
  duplicates: 1,
};
