import { createHmac, timingSafeEqual } from "crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processWebsiteEvent, validateWebsitePayload, type WebsitePayload } from "@/lib/ingest";

const MAX_SKEW_SECONDS = 300;

function verify(raw: string, timestamp: string, signature: string, secret: string) {
  if (!timestamp || !signature || !secret) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex");
  const given = signature.replace(/^sha256=/i, "").trim();
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(given, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const secret = process.env.WEBSITE_WEBHOOK_SECRET ?? "";
  const raw = await request.text();
  const timestamp = request.headers.get("x-timestamp") ?? "";
  const signature = request.headers.get("x-signature") ?? "";
  if (!verify(raw, timestamp, signature, secret)) {
    return NextResponse.json({ status: "error", message: "Invalid signature" }, { status: 401 });
  }

  let body: WebsitePayload;
  try {
    body = JSON.parse(raw) as WebsitePayload;
  } catch {
    return NextResponse.json({ status: "error", message: "Invalid JSON" }, { status: 400 });
  }

  const invalid = validateWebsitePayload(body);
  if (invalid) {
    return NextResponse.json({ status: "error", message: invalid }, { status: 400 });
  }

  const externalId = String(body.submission_id).trim();
  const existing = await prisma.incomingEvent.findUnique({
    where: { source_externalId: { source: "Website", externalId } },
  });

  if (existing) {
    if (existing.status !== "processed") {
      try {
        await processWebsiteEvent(existing.id);
      } catch {
        /* event marked failed */
      }
    }
    return NextResponse.json({ status: "received", event_id: existing.id }, { status: 202 });
  }

  const event = await prisma.incomingEvent.create({
    data: {
      source: "Website",
      externalId,
      rawPayload: JSON.parse(raw) as Prisma.InputJsonValue,
      status: "received",
    },
  });

  try {
    await processWebsiteEvent(event.id);
  } catch {
    /* saved as failed for Reprocess */
  }

  return NextResponse.json({ status: "received", event_id: event.id }, { status: 202 });
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/webhooks/website",
    headers: {
      "X-Timestamp": "unix seconds",
      "X-Signature": "sha256=<HMAC-SHA256 of timestamp + '.' + raw body>",
    },
    body: {
      submission_id: "web-000123",
      submitted_at: "2026-11-05T10:15:00+05:30",
      name: "Asha Verma",
      mobile: "+91 98765 43210",
      email: "asha@example.com",
      state: "Delhi",
      city: "New Delhi",
      message: "Need a virtual office address",
      page_url: "https://vospaces.com/...",
      utm: { source: "google", campaign: "delhi-vo" },
    },
  });
}
