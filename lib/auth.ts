import { cookies } from "next/headers";
import type { Permissions, Role, User } from "@/lib/types";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, readSessionToken } from "@/lib/session";

export {
  SESSION_COOKIE,
  applySessionCookie,
  clearSessionCookie,
  readSessionToken,
  signSession,
} from "@/lib/session";

export async function getSessionFromCookies() {
  const jar = await cookies();
  return readSessionToken(jar.get(SESSION_COOKIE)?.value);
}

export function toUserDto(row: {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  allocationPercent: number;
  inRotation: boolean;
  phone: string;
  initials: string;
  permissions: {
    viewAllLeads: boolean;
    reassignLeads: boolean;
    export: boolean;
    createFields: boolean;
    sendQuotations: boolean;
  } | null;
}): User {
  const perms: Permissions = row.permissions
    ? {
        view_all_leads: row.permissions.viewAllLeads,
        reassign_leads: row.permissions.reassignLeads,
        export: row.permissions.export,
        create_fields: row.permissions.createFields,
        send_quotations: row.permissions.sendQuotations,
      }
    : {
        view_all_leads: row.role === "admin",
        reassign_leads: row.role === "admin",
        export: row.role === "admin",
        create_fields: row.role === "admin",
        send_quotations: row.role === "admin",
      };
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
    allocationPercent: row.allocationPercent,
    inRotation: row.inRotation,
    permissions: perms,
    phone: row.phone,
    initials: row.initials,
  };
}

export async function requireUser() {
  const session = await getSessionFromCookies();
  if (!session) return null;
  const row = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { permissions: true },
  });
  if (!row || !row.isActive) return null;
  return toUserDto(row);
}

export function isAdmin(user: User) {
  return user.role === "admin";
}

export function can(user: User, key: keyof Permissions) {
  if (user.role === "admin") return true;
  return user.permissions[key];
}

export function canViewAllLeads(user: User) {
  return isAdmin(user) || user.permissions.view_all_leads;
}
