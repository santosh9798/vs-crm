import { after, NextRequest, NextResponse } from "next/server";
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

async function ingestMetaPost(raw: string, signature: string) {
  const meta = await loadMetaConfig();
  if (!verifyMetaSignature(raw, signature, meta.appSecret)) return;

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return;
  }

  const pings = leadgenFromPayload(body);
  for (const ping of pings) {
    if (meta.pageId && ping.pageId && ping.pageId !== meta.pageId) continue;
    const existing = await prisma.incomingEvent.findUnique({
      where: { source_externalId: { source: "MetaAds", externalId: ping.leadgenId } },
    });
    if (existing) {
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
    try {
      await processMetaEvent(event.id);
    } catch {
      /* saved as failed for Reprocess */
    }
  }
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  after(() => ingestMetaPost(raw, signature));
  return NextResponse.json({ status: "received" }, { status: 200 });
}
