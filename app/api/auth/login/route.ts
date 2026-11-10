import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { applySessionCookie, signSession, toUserDto } from "@/lib/auth";
import { loadAppState } from "@/lib/bootstrap";
import { prisma } from "@/lib/db";

export const maxDuration = 30;

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const row = await prisma.user.findUnique({
    where: { email },
    include: { permissions: true },
  });
  if (!row || !row.isActive || !(await compare(password, row.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  const user = toUserDto(row);
  const [token, state] = await Promise.all([
    signSession({ sub: user.id, email: user.email, role: user.role }),
    loadAppState(user),
  ]);
  const res = NextResponse.json({ ok: true, name: user.name, role: user.role, user, state });
  return applySessionCookie(res, token);
}
