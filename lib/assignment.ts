import { LeadSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export function chooseByPercent(
  pool: { userId: string; percent: number; assignedCount: number }[],
) {
  if (pool.length === 0) return null;
  const total = pool.reduce((sum, u) => sum + u.percent, 0);
  if (total <= 0) return null;
  const cycle = pool.reduce((sum, u) => sum + u.assignedCount, 0);
  const targetIndex = cycle % total;
  let cursor = 0;
  for (const user of pool) {
    cursor += user.percent;
    if (targetIndex < cursor) return user.userId;
  }
  return pool[pool.length - 1]?.userId ?? null;
}

export function validateShares(shares: { source: string; userId: string; percent: number }[]) {
  const bySource = new Map<string, { userId: string; percent: number }[]>();
  for (const share of shares) {
    const percent = Number(share.percent);
    if (!share.userId) throw new Error("Pick a salesperson for each row");
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
      throw new Error("Each share must be a whole number from 1 to 100");
    }
    const list = bySource.get(share.source) ?? [];
    if (list.some((row) => row.userId === share.userId)) {
      throw new Error("The same person cannot appear twice on one source");
    }
    list.push({ userId: share.userId, percent });
    bySource.set(share.source, list);
  }
  for (const [source, list] of bySource) {
    const total = list.reduce((sum, row) => sum + row.percent, 0);
    if (total !== 100) throw new Error(`${source} percentages must total 100 (currently ${total})`);
  }
}

export async function pickAssignee(source: LeadSource, tx: Prisma.TransactionClient = prisma) {
  const shares = await tx.assignmentShare.findMany({
    where: { source, percent: { gt: 0 }, user: { isActive: true } },
    orderBy: { userId: "asc" },
  });
  const counters = shares.length
    ? await tx.assignmentCounter.findMany({
        where: { source, userId: { in: shares.map((s) => s.userId) } },
      })
    : [];
  const countByUser = new Map(counters.map((c) => [c.userId, c.assignedCount]));
  const chosen = chooseByPercent(
    shares.map((s) => ({
      userId: s.userId,
      percent: s.percent,
      assignedCount: countByUser.get(s.userId) ?? 0,
    })),
  );
  if (chosen) return chosen;

  const admin = await tx.user.findFirst({ where: { role: "admin", isActive: true }, orderBy: { createdAt: "asc" } });
  if (!admin) throw new Error("No active user to assign this lead");
  return admin.id;
}

export async function bumpAssignmentCount(
  userId: string,
  source: LeadSource,
  tx: Prisma.TransactionClient = prisma,
) {
  await tx.assignmentCounter.upsert({
    where: { source_userId: { source, userId } },
    update: { assignedCount: { increment: 1 } },
    create: { source, userId, assignedCount: 1 },
  });
}

export async function resetAssignmentCounts(tx: Prisma.TransactionClient = prisma) {
  await tx.assignmentCounter.updateMany({ data: { assignedCount: 0 } });
}
