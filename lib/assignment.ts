import { LeadSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function pickAssignee(source: LeadSource, tx: Prisma.TransactionClient = prisma) {
  const rule = await tx.assignmentRule.findUnique({ where: { source } });
  if (rule?.userId) {
    const named = await tx.user.findUnique({ where: { id: rule.userId } });
    if (named?.isActive) return named.id;
  }

  const pool = await tx.user.findMany({
    where: { role: "salesperson", isActive: true, inRotation: true, allocationPercent: { gt: 0 } },
    include: { assignmentCounter: true },
    orderBy: { id: "asc" },
  });

  if (pool.length === 0) {
    const admin = await tx.user.findFirst({ where: { role: "admin", isActive: true }, orderBy: { createdAt: "asc" } });
    if (!admin) throw new Error("No active user to assign this lead");
    return admin.id;
  }

  const total = pool.reduce((sum, u) => sum + u.allocationPercent, 0) || 100;
  const cycle = pool.reduce((sum, u) => sum + (u.assignmentCounter?.assignedCount ?? 0), 0);
  const targetIndex = cycle % total;
  let cursor = 0;
  let chosen = pool[0];
  for (const user of pool) {
    cursor += user.allocationPercent;
    if (targetIndex < cursor) {
      chosen = user;
      break;
    }
  }
  return chosen.id;
}

export async function bumpAssignmentCount(userId: string, tx: Prisma.TransactionClient = prisma) {
  await tx.assignmentCounter.upsert({
    where: { userId },
    update: { assignedCount: { increment: 1 } },
    create: { userId, assignedCount: 1 },
  });
}

export async function resetAssignmentCounts(tx: Prisma.TransactionClient = prisma) {
  await tx.assignmentCounter.updateMany({ data: { assignedCount: 0 } });
}
