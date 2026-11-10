import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { leadgenFromPayload, loadMetaConfig, processMetaEvent, verifyMetaSignature } from "@/lib/meta";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode") ?? "";
  const token = request.nextUrl.searchParams.get("hub.verify_token") ?? "";
  const challenge = request.nextUrl.searchParams.get("hub.challenge") ?? "";
  const meta = await loadMetaConfig();
  if (mode === "subscribe" && meta.verifyToken && token === meta.verifyToken) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ status: "error", message: "Verify token mismatch" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const meta = await loadMetaConfig();
  const raw = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  if (!verifyMetaSignature(raw, signature, meta.appSecret)) {
    return NextResponse.json({ status: "error", message: "Invalid signature" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ status: "error", message: "Invalid JSON" }, { status: 400 });
  }

  const pings = leadgenFromPayload(body);
  const eventIds: string[] = [];
  for (const ping of pings) {
    if (meta.pageId && ping.pageId && ping.pageId !== meta.pageId) continue;
    const existing = await prisma.incomingEvent.findUnique({
      where: { source_externalId: { source: "MetaAds", externalId: ping.leadgenId } },
    });
    if (existing) {
      eventIds.push(existing.id);
      if (existing.status !== "processed") {
        try {
          await processMetaEvent(existing.id);
        } catch {
          /* saved as failed */
        }
      }
      continue;
    }
    const event = await prisma.incomingEvent.create({
      data: {
        source: "MetaAds",
        externalId: ping.leadgenId,
        rawPayload: {
          submission_id: ping.leadgenId,
          graph: ping,
        } as Prisma.InputJsonValue,
        status: "received",
      },
    });
    eventIds.push(event.id);
    try {
      await processMetaEvent(event.id);
    } catch {
      /* saved as failed for Reprocess */
    }
  }

  return NextResponse.json({ status: "received", events: eventIds.length }, { status: 200 });
}
