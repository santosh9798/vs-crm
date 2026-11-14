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
  const storedSecret = decryptSecret(stored.appSecret || "").trim();
  const storedToken = decryptSecret(stored.pageAccessToken || "").trim();
  return {
    verifyToken: (stored.verifyToken || process.env.META_VERIFY_TOKEN || "").trim(),
    appSecret: (storedSecret || process.env.META_APP_SECRET || "").trim(),
    pageAccessToken: (storedToken || process.env.META_PAGE_ACCESS_TOKEN || "").trim(),
    pageId: (stored.pageId || process.env.META_PAGE_ID || "").trim(),
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

async function graphGet<T>(path: string, token: string, params: Record<string, string> = {}) {
  const url = new URL(`${GRAPH}/${path.replace(/^\//, "")}`);
  url.searchParams.set("access_token", token);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok || json.error) {
    throw new Error(clarifyMetaError(json.error?.message || `Graph API ${res.status}`));
  }
  return json;
}

export async function resolvePageAccessToken(token: string, pageId = "") {
  if (pageId) {
    try {
      const page = await graphGet<{ access_token?: string }>(pageId, token, { fields: "access_token" });
      if (page.access_token) return page.access_token;
    } catch {
      // token may already be a Page token, or /me/accounts will work instead
    }
  }
  try {
    const accounts = await graphGet<{ data?: { id?: string; access_token?: string }[] }>("me/accounts", token, {
      fields: "id,access_token",
    });
    const pages = accounts.data ?? [];
    const match = pageId ? pages.find((page) => page.id === pageId) : pages[0];
    if (match?.access_token) return match.access_token;
  } catch {
    // use the saved token as-is
  }
  return token;
}

export async function fetchGraphLead(leadgenId: string, pageAccessToken: string): Promise<GraphLead> {
  return graphGet<GraphLead>(leadgenId, pageAccessToken, {
    fields: "id,created_time,ad_id,ad_name,form_id,campaign_name,field_data",
  });
}

function clarifyMetaError(message: string) {
  if (/session has expired|access token.*expir/i.test(message)) {
    return `${message} Graph API Explorer / user tokens expire in a few hours. Paste a never-expiring System User Page token in Integrations, then Reprocess.`;
  }
  return message;
}

export async function inspectStoredPageToken() {
  const meta = await loadMetaConfig();
  if (!meta.pageAccessToken) throw new Error("Meta page access token is not set");
  const token = meta.pageAccessToken;

  const meUrl = new URL(`${GRAPH}/me`);
  meUrl.searchParams.set("fields", "id,name");
  meUrl.searchParams.set("access_token", token);
  const meRes = await fetch(meUrl, { cache: "no-store" });
  const me = (await meRes.json()) as { id?: string; name?: string; error?: { message?: string } };
  if (!meRes.ok || me.error) {
    throw new Error(clarifyMetaError(me.error?.message || `Graph API ${meRes.status}`));
  }

  let expiresAt: string | null = null;
  let neverExpires = false;
  try {
    const debugUrl = new URL(`${GRAPH}/debug_token`);
    debugUrl.searchParams.set("input_token", token);
    debugUrl.searchParams.set("access_token", token);
    const debugRes = await fetch(debugUrl, { cache: "no-store" });
    const debug = (await debugRes.json()) as {
      data?: { expires_at?: number; is_valid?: boolean; type?: string };
    };
    const exp = Number(debug.data?.expires_at ?? 0);
    if (exp === 0) neverExpires = true;
    else if (exp > 0) expiresAt = new Date(exp * 1000).toISOString();
  } catch {
    // debug_token is optional; /me already proved the token works
  }

  return {
    id: me.id ?? "",
    name: me.name ?? "",
    expiresAt,
    neverExpires,
  };
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
      const pageId = meta.pageId || String(raw.graph?.pageId ?? raw.page_id ?? "");
      const pageToken = await resolvePageAccessToken(meta.pageAccessToken, pageId);
      const graph = await fetchGraphLead(leadgenId, pageToken);
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
