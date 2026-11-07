"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Bell,
  FileText,
  GitBranch,
  Layers,
  LayoutDashboard,
  LogOut,
  Mail,
  Plug,
  Search,
  Settings,
  SlidersHorizontal,
  SquareCheckBig,
  UserCog,
  Users,
} from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { relativeTime } from "@/lib/format";
import { Avatar, Button, cn } from "@/components/ui";

const MAIN = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/activities", label: "Activities", icon: SquareCheckBig },
  { href: "/quotations", label: "Quotations", icon: FileText },
];

const ADMIN = [
  { href: "/admin/custom-fields", label: "Custom fields", icon: SlidersHorizontal },
  { href: "/admin/stages", label: "Stages", icon: Layers },
  { href: "/admin/assignment", label: "Assignment", icon: GitBranch },
  { href: "/admin/email-templates", label: "Email templates", icon: Mail },
  { href: "/admin/integrations", label: "Integrations", icon: Plug },
  { href: "/admin/users", label: "Users", icon: UserCog },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
        active ? "bg-[var(--sidebar-active)] text-white" : "text-[var(--sidebar-text)] hover:bg-white/5 hover:text-white",
      )}
    >
      <Icon size={18} strokeWidth={1.75} />
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { isAdmin, logout } = useDemo();
  const router = useRouter();
  const [q, setQ] = useState("");

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/leads?q=${encodeURIComponent(q)}`);
  };

  return (
    <aside className="flex h-dvh w-[240px] shrink-0 flex-col overflow-hidden bg-[var(--sidebar)] text-white">
      <div className="px-5 pb-3 pt-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold">
            VS
          </span>
          <span className="text-lg font-semibold tracking-tight">CRM</span>
        </div>
      </div>
      <form onSubmit={onSearch} className="px-3 pb-3">
        <div className="flex items-center gap-2 rounded-xl bg-white/8 px-3 py-2 text-[var(--sidebar-muted)]">
          <Search size={16} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search leads…"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--sidebar-muted)]"
          />
        </div>
      </form>
      <nav className="flex-1 space-y-1 overflow-auto px-3 pb-4">
        {MAIN.map((item) => (
          <NavItem key={item.href} {...item} active={pathname === item.href || pathname.startsWith(item.href + "/")} />
        ))}
        {isAdmin ? (
          <>
            <p className="px-3 pb-1 pt-5 text-[10px] font-semibold tracking-[0.16em] text-[var(--sidebar-muted)]">
              ADMIN
            </p>
            {ADMIN.map((item) => (
              <NavItem key={item.href} {...item} active={pathname.startsWith(item.href)} />
            ))}
          </>
        ) : null}
      </nav>
      <button
        onClick={() => {
          logout();
          router.push("/login");
        }}
        className="m-3 flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--sidebar-text)] hover:bg-white/5"
      >
        <LogOut size={18} />
        Sign out
      </button>
    </aside>
  );
}

export function TopBar() {
  const { currentUser, isAdmin, switchPreview, state, markNotificationsRead } = useDemo();
  const [open, setOpen] = useState(false);
  const mine = useMemo(
    () => state.notifications.filter((n) => n.userId === currentUser?.id || (isAdmin && n.userId === "u_admin")),
    [state.notifications, currentUser, isAdmin],
  );
  const unread = mine.filter((n) => !n.readAt);

  if (!currentUser) return null;

  return (
    <header className="flex items-center justify-end gap-3 px-4 py-3 sm:px-6">
      <div className="mr-auto hidden items-center gap-2 rounded-full border border-dashed border-[#c5d5cc] bg-white/70 px-3 py-1 text-[11px] text-[var(--muted)] sm:flex">
        UI preview
        <button
          onClick={() => switchPreview("admin")}
          className={cn("rounded-full px-2 py-0.5", isAdmin ? "bg-[var(--sidebar)] text-white" : "hover:bg-black/5")}
        >
          Admin
        </button>
        <button
          onClick={() => switchPreview("salesperson")}
          className={cn("rounded-full px-2 py-0.5", !isAdmin ? "bg-[var(--sidebar)] text-white" : "hover:bg-black/5")}
        >
          Salesperson
        </button>
      </div>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--ink)] shadow-sm"
        >
          <Bell size={18} />
          {unread.length > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-semibold text-white">
              {unread.length}
            </span>
          ) : null}
        </button>
        {open ? (
          <div className="absolute right-0 z-40 mt-2 w-[340px] overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              <button className="text-xs text-[var(--accent)]" onClick={() => markNotificationsRead()}>
                Mark all read
              </button>
            </div>
            <div className="max-h-80 overflow-auto">
              {mine.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">No notifications</p>
              ) : (
                mine.map((n) => (
                  <div key={n.id} className={cn("border-b border-[var(--line)] px-4 py-3 text-sm", !n.readAt && "bg-[var(--accent-soft)]")}>
                    <p>{n.message}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{relativeTime(n.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 shadow-sm">
        <Avatar initials={currentUser.initials} />
        <div className="hidden leading-tight sm:block">
          <p className="text-sm font-semibold">{currentUser.role === "admin" ? "A Admin" : currentUser.name}</p>
          <p className="text-[11px] text-[var(--muted)]">
            {currentUser.role === "admin" ? "Full access" : "Assigned leads only"}
          </p>
        </div>
      </div>
    </header>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useDemo();
  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[280px] flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className={cn(
            "rounded-xl px-4 py-3 text-left text-sm text-white shadow-lg",
            t.tone === "err" ? "bg-[var(--danger)]" : t.tone === "info" ? "bg-[var(--sidebar)]" : "bg-[var(--accent)]",
          )}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}

export function RequireSession({ children }: { children: React.ReactNode }) {
  const { currentUser, ready } = useDemo();
  const router = useRouter();
  if (!ready) {
    return <div className="min-h-dvh bg-[var(--canvas)]" />;
  }
  if (!currentUser) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="card max-w-sm p-6 text-center">
          <p className="font-medium">Sign in to continue</p>
          <p className="mt-1 text-sm text-[var(--muted)]">This UI preview uses a mock session.</p>
          <Button className="mt-4 w-full" onClick={() => router.push("/login")}>
            Go to login
          </Button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireSession>
      <div className="flex h-dvh overflow-hidden">
        <div className="sticky top-0 hidden h-dvh shrink-0 md:block">
          <Sidebar />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="z-20 shrink-0 bg-[var(--canvas)]">
            <MobileNav />
            <TopBar />
          </div>
          <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10 sm:px-6">
            {children}
          </main>
        </div>
        <Toasts />
      </div>
    </RequireSession>
  );
}

function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { isAdmin, logout, switchPreview } = useDemo();
  const router = useRouter();
  const items = isAdmin ? [...MAIN, ...ADMIN] : MAIN;
  return (
    <div className="relative bg-[var(--sidebar)] text-white md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="font-semibold">VS CRM</span>
        <button onClick={() => setOpen((v) => !v)} className="text-sm">
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open ? (
        <div className="space-y-1 px-3 pb-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "block rounded-xl px-3 py-2 text-sm",
                pathname.startsWith(item.href) ? "bg-[var(--sidebar-active)]" : "text-[var(--sidebar-text)]",
              )}
            >
              {item.label}
            </Link>
          ))}
          <div className="flex gap-2 px-3 pt-2 text-xs">
            <button onClick={() => switchPreview("admin")}>Admin</button>
            <button onClick={() => switchPreview("salesperson")}>Salesperson</button>
          </div>
          <button
            className="px-3 pt-2 text-sm text-[var(--sidebar-text)]"
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
