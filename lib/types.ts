export type Role = "admin" | "salesperson";

export type Permissions = {
  view_all_leads: boolean;
  reassign_leads: boolean;
  export: boolean;
  create_fields: boolean;
  send_quotations: boolean;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  allocationPercent: number;
  inRotation: boolean;
  permissions: Permissions;
  phone: string;
  initials: string;
};

export type StageKind = "open" | "converted" | "lost";

export type Stage = {
  id: string;
  name: string;
  position: number;
  isActive: boolean;
  kind: StageKind;
  color: string;
};

export type LeadSource = "Website" | "Meta Ads" | "Google Ads" | "Manual";

export type Lead = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  state: string;
  city: string;
  source: LeadSource;
  stageId: string;
  assignedTo: string;
  createdBy: string;
  createdByType: "user" | "integration";
  duplicateOfId: string | null;
  followupsDisabled: boolean;
  unsubscribed: boolean;
  createdAt: string;
  message: string;
  original: {
    raw: Record<string, string>;
    campaign?: string;
    adSet?: string;
    formName?: string;
    pageUrl?: string;
  };
  customValues: Record<string, string | number | boolean | null>;
};

export type Note = {
  id: string;
  leadId: string;
  body: string;
  authorId: string;
  createdAt: string;
};

export type ActivityType = "call" | "meeting" | "follow-up" | "email" | "task";
export type ActivityStatus = "pending" | "completed";

export type Activity = {
  id: string;
  leadId: string;
  type: ActivityType;
  description: string;
  dueAt: string;
  assignedTo: string;
  status: ActivityStatus;
  completedAt: string | null;
};

export type EmailJobStatus = "scheduled" | "sent" | "failed" | "cancelled";

export type EmailJob = {
  id: string;
  leadId: string;
  templateId: string;
  to: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailJobStatus;
  attempts: number;
  response: string;
};

export type QuotationStatus = "draft" | "sent" | "failed";

export type QuotationItem = {
  id: string;
  spaceId: string;
  name: string;
  details: string;
  planName: string;
  duration: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  city?: string;
  location?: string;
  listingUrl?: string;
  kind?: "space" | "ca";
};

export type QuoteOptions = {
  stateName: string;
  planKind: "gst" | "br" | "ma";
  includeCa: boolean;
};

export type Quotation = {
  id: string;
  leadId: string;
  createdBy: string;
  recipient: string;
  totalAmount: number;
  status: QuotationStatus;
  sentAt: string | null;
  createdAt: string;
  items: QuotationItem[];
  options?: QuoteOptions;
  optionsJson?: string;
};

export type NotificationType =
  | "assignment"
  | "duplicate"
  | "activity_due"
  | "activity_overdue"
  | "stage_changed"
  | "email_sent"
  | "email_failed"
  | "quotation_sent"
  | "quotation_failed"
  | "integration_failure"
  | "reassignment";

export type AppNotification = {
  id: string;
  userId: string;
  type: NotificationType;
  leadId?: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

export type FieldType =
  | "text"
  | "number"
  | "email"
  | "phone"
  | "dropdown"
  | "date"
  | "datetime"
  | "checkbox"
  | "textarea";

export type CustomField = {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  options: string[];
  required: boolean;
  isActive: boolean;
  createdBy: string;
  group: string;
  defaultValue: string;
};

export type EmailTemplate = {
  id: string;
  kind: "stage" | "quotation";
  stageId: string | null;
  subject: string;
  body: string;
  delayDays: number;
  isActive: boolean;
};

export type AssignmentShare = {
  source: LeadSource;
  userId: string;
  percent: number;
};

export type IncomingEvent = {
  id: string;
  source: LeadSource;
  externalId: string;
  status: "received" | "processed" | "failed";
  lastError: string | null;
  receivedAt: string;
  lastSyncAt: string | null;
};

export type SmtpSettings = {
  host: string;
  port: string;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
};

export type MetaSettings = {
  verifyToken: string;
  appSecret: string;
  pageAccessToken: string;
  pageId: string;
};

export type AppSettings = {
  companyName: string;
  catalogApiUrl: string;
  catalogApiKey: string;
  smtp: SmtpSettings;
  meta: MetaSettings;
};

export type CatalogPlan = {
  id: string;
  name: string;
  duration: string;
  price: number;
};

export type CatalogSpace = {
  id: string;
  sku: string;
  name: string;
  category: string;
  address: string;
  cityId: string;
  description: string;
  location?: string;
  city?: string;
  state?: string;
  listingUrl?: string;
  plans: CatalogPlan[];
};

export type CatalogCity = { id: string; name: string; stateId: string };
export type CatalogState = { id: string; name: string };

export type TimelineItem = {
  id: string;
  leadId: string;
  at: string;
  title: string;
  detail: string;
  kind:
    | "created"
    | "assignment"
    | "stage"
    | "note"
    | "activity"
    | "email"
    | "quotation";
};
