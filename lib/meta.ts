import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto-secret";
import { processWebsiteEvent, type WebsitePayload } from "@/lib/ingest";

const GRAPH = "https://graph.facebook.com/v21.0";

export type MetaSettings = {
  verifyToken: string;
  appSecret: string;
  pageAccessToken: string;
  pageId: string;
};

type GraphField = { name?: string; values?: string[] };
type GraphLead = {
  id?: string;
  created_time?: string;
  ad_id?: string;
  ad_name?: string;
  campaign_name?: string;
  form_id?: string;
  field_data?: GraphField[];
};

export async function loadMetaConfig(): Promise<MetaSettings> {
  const setting = await prisma.setting.findUnique({ where: { key: "app" } });
  const raw = (setting?.value && typeof setting.value === "object" ? setting.value : {}) as {
    meta?: Partial<MetaSettings>;
  };
  const stored = raw.meta ?? {};
  return {
    verifyToken: (process.env.META_VERIFY_TOKEN || stored.verifyToken || "").trim(),
    appSecret: (process.env.META_APP_SECRET || decryptSecret(stored.appSecret || "")).trim(),
    pageAccessToken: (process.env.META_PAGE_ACCESS_TOKEN || decryptSecret(stored.pageAccessToken || "")).trim(),
    pageId: (process.env.META_PAGE_ID || stored.pageId || "").trim(),
  };
}

export function verifyMetaSignature(raw: string, header: string, appSecret: string) {
  if (!raw || !header || !appSecret) return false;
  const given = header.replace(/^sha256=/i, "").trim();
  const expected = createHmac("sha256", appSecret).update(raw).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(given, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function leadgenFromPayload(body: unknown) {
  const out: { leadgenId: string; pageId: string; formId: string; adId: string; createdTime: string }[] = [];
  const payload = body as {
    entry?: { id?: string; changes?: { field?: string; value?: Record<string, string> }[] }[];
  };
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;
      const value = change.value ?? {};
      const leadgenId = String(value.leadgen_id ?? "").trim();
      if (!leadgenId) continue;
      out.push({
        leadgenId,
        pageId: String(value.page_id ?? entry.id ?? "").trim(),
        formId: String(value.form_id ?? "").trim(),
        adId: String(value.ad_id ?? "").trim(),
        createdTime: String(value.created_time ?? "").trim(),
      });
    }
  }
  return out;
}

function normKey(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function firstValue(fields: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const hit = fields[normKey(alias)];
    if (hit) return hit;
  }
  return "";
}

export function mapGraphLead(lead: GraphLead, ping: { adId: string; formId: string; pageId: string }): WebsitePayload {
  const fields: Record<string, string> = {};
  for (const row of lead.field_data ?? []) {
    const key = normKey(String(row.name ?? ""));
    const value = String(row.values?.[0] ?? "").trim();
    if (key && value) fields[key] = value;
  }
  const first = firstValue(fields, ["first_name", "firstname"]);
  const last = firstValue(fields, ["last_name", "lastname"]);
  const name =
    firstValue(fields, ["full_name", "fullname", "name", "your_name"]) ||
    [first, last].filter(Boolean).join(" ").trim();
  const email = firstValue(fields, ["email", "work_email", "email_address"]);
  const mobile = firstValue(fields, ["phone_number", "phone", "mobile", "mobile_number", "whatsapp"]);
  const city = firstValue(fields, ["city", "required_city", "preferred_city"]);
  const state = firstValue(fields, ["state", "required_state"]);
  const company = firstValue(fields, ["company_name", "company", "business_name"]);
  const known = new Set(
    [
      "full_name",
      "fullname",
      "name",
      "your_name",
      "first_name",
      "firstname",
      "last_name",
      "lastname",
      "email",
      "work_email",
      "email_address",
      "phone_number",
      "phone",
      "mobile",
      "mobile_number",
      "whatsapp",
      "city",
      "required_city",
      "preferred_city",
      "state",
      "required_state",
      "company_name",
      "company",
      "business_name",
    ].map(normKey),
  );
  const extras = Object.entries(fields)
    .filter(([key]) => !known.has(key))
    .map(([key, value]) => `${key}: ${value}`);
  const message = extras.join(" · ");
  return {
    submission_id: String(lead.id ?? "").trim(),
    submitted_at: lead.created_time,
    name: name || "Meta lead",
    mobile,
    email,
    city,
    state,
    company,
    preferred_location: city,
    message,
    page_url: ping.formId ? `https://facebook.com/lead-form/${ping.formId}` : "",
    utm: {
      source: "meta",
      campaign: lead.campaign_name || ping.adId || undefined,
      medium: "paid",
    },
    ad_id: lead.ad_id || ping.adId,
    ad_name: lead.ad_name,
    form_id: lead.form_id || ping.formId,
    page_id: ping.pageId,
    field_data: lead.field_data,
  };
}

export async function fetchGraphLead(leadgenId: string, pageAccessToken: string): Promise<GraphLead> {
  const url = new URL(`${GRAPH}/${encodeURIComponent(leadgenId)}`);
  url.searchParams.set("access_token", pageAccessToken);
  url.searchParams.set("fields", "id,created_time,ad_id,ad_name,form_id,campaign_name,field_data");
  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = (await res.json()) as GraphLead & { error?: { message?: string } };
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `Graph API ${res.status}`);
  }
  return json;
}

export async function processMetaEvent(eventId: string) {
  const event = await prisma.incomingEvent.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Event not found");
  if (event.status === "processed" && event.leadId) return event;

  const raw = (event.rawPayload ?? {}) as WebsitePayload & {
    graph?: { leadgenId?: string; adId?: string; formId?: string; pageId?: string };
  };
  const leadgenId = String(raw.submission_id || raw.graph?.leadgenId || "").trim();
  const hasFields = Array.isArray(raw.field_data) && raw.field_data.length > 0;
  if (!hasFields && leadgenId) {
    try {
      const meta = await loadMetaConfig();
      if (!meta.pageAccessToken) throw new Error("Meta page access token is not set");
      const graph = await fetchGraphLead(leadgenId, meta.pageAccessToken);
      const mapped = mapGraphLead(graph, {
        adId: String(raw.graph?.adId ?? raw.ad_id ?? ""),
        formId: String(raw.graph?.formId ?? raw.form_id ?? ""),
        pageId: String(raw.graph?.pageId ?? raw.page_id ?? ""),
      });
      await prisma.incomingEvent.update({
        where: { id: eventId },
        data: { rawPayload: { ...raw, ...mapped, graph: raw.graph } },
      });
    } catch (err) {
      await prisma.incomingEvent.update({
        where: { id: eventId },
        data: {
          status: "failed",
          lastError: err instanceof Error ? err.message : "Meta processing failed",
          attempts: { increment: 1 },
          lastSyncAt: new Date(),
        },
      });
      throw err;
    }
  }
  return processWebsiteEvent(eventId);
}
