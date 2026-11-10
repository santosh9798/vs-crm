import { NextResponse } from "next/server";
import { runAction } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { loadAppState } from "@/lib/bootstrap";

export const maxDuration = 30;

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { type?: string; payload?: Record<string, unknown> };
  if (!body.type) return NextResponse.json({ error: "Missing action type" }, { status: 400 });
  try {
    const result = await runAction(user, body.type, body.payload ?? {});
    const state = await loadAppState(user);
    return NextResponse.json({ ...result, state });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action failed";
    const status = message === "Not allowed" || message === "Admin only" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
