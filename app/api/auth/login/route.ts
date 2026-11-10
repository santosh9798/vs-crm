import { compareSync } from "bcryptjs";
import { NextResponse } from "next/server";
import { applySessionCookie, signSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive || !compareSync(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  const token = await signSession({ sub: user.id, email: user.email, role: user.role });
  const res = NextResponse.json({ ok: true, name: user.name, role: user.role });
  return applySessionCookie(res, token);
}
