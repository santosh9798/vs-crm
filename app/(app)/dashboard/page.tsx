"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDemo, useStageMap, useUserMap } from "@/lib/demo-store";
import { monthDeltas } from "@/lib/mock/seed";
import { Avatar, Badge, Card, Input, cn } from "@/components/ui";

type Period = "today" | "week" | "month" | "custom";

const TODAY = new Date("2026-11-05T23:59:59+05:30");

function inPeriod(iso: string, period: Period, customFrom: string, customTo: string) {
  const d = new Date(iso);
  if (period === "today") {
    return iso.slice(0, 10) === "2026-11-05";
  }
  if (period === "week") {
    return d >= new Date("2026-11-02T00:00:00+05:30") && d <= TODAY;
  }
  if (period === "custom") {
    const from = customFrom || "2026-10-01";
    const to = customTo || "2026-11-05";
    return iso.slice(0, 10) >= from && iso.slice(0, 10) <= to;
  }
  return true;
}

function Delta({ value }: { value: number }) {
  if (value === 0) return <span className="delta-flat text-xs">No change</span>;
  const up = value > 0;
  return (
    <span className={cn("text-xs font-medium", up ? "delta-up" : "delta-down")}>
      {up ? "+" : ""}
      {value} vs last month
    </span>
  );
}

export default function DashboardPage() {
  const { visibleLeads, state, isAdmin } = useDemo();
  const stages = useStageMap();
  const users = useUserMap();
  const [period, setPeriod] = useState<Period>("month");
  const [compare, setCompare] = useState(true);
  const [from, setFrom] = useState("2026-10-23");
  const [to, setTo] = useState("2026-11-05");

  const leads = useMemo(
    () => visibleLeads.filter((l) => inPeriod(l.createdAt, period, from, to)),
    [visibleLeads, period, from, to],
  );

  const kpis = useMemo(() => {
    const count = (id: string) => leads.filter((l) => l.stageId === id).length;
    return {
      total: leads.length,
      new: count("st_new"),
      active: count("st_active"),
      interested: count("st_interested"),
      followup: count("st_followup"),
      booking: count("st_booking"),
      converted: count("st_converted"),
      lost: count("st_lost"),
      duplicates: leads.filter((l) => l.duplicateOfId).length,
    };
  }, [leads]);

  const conversion = leads.length ? (kpis.converted / leads.length) * 100 : 0;

  const daily = useMemo(() => {
    const days: { label: string; value: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(TODAY);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = String(d.getDate());
      days.push({
        label,
        value: visibleLeads.filter((l) => l.createdAt.slice(0, 10) === key).length,
      });
    }
    return days;
  }, [visibleLeads]);

  const pipeline = useMemo(
    () =>
      state.stages
        .filter((s) => s.isActive)
        .sort((a, b) => a.position - b.position)
        .map((s) => ({
          ...s,
          count: leads.filter((l) => l.stageId === s.id).length,
        })),
    [state.stages, leads],
  );
  const maxPipe = Math.max(...pipeline.map((p) => p.count), 1);

  const sources = ["Website", "Meta Ads", "Google Ads", "Manual"] as const;
  const sourceRows = sources.map((source) => {
    const rows = leads.filter((l) => l.source === source);
    const converted = rows.filter((l) => l.stageId === "st_converted").length;
    return {
      source,
      leads: rows.length,
      converted,
      rate: rows.length ? (converted / rows.length) * 100 : 0,
    };
  });

  const salespeople = state.users.filter((u) => u.role === "salesperson" && u.isActive);
  const salesRows = salespeople.map((u) => {
    const assigned = state.leads.filter((l) => l.assignedTo === u.id);
    const handled = assigned.filter((l) => l.stageId !== "st_new").length;
    const followups = state.activities.filter(
      (a) => a.assignedTo === u.id && a.type === "follow-up" && a.status === "completed",
    ).length;
    const pending = state.activities.filter((a) => a.assignedTo === u.id && a.status === "pending").length;
    const converted = assigned.filter((l) => l.stageId === "st_converted").length;
    const lost = assigned.filter((l) => l.stageId === "st_lost").length;
    const share = state.leads.length ? (assigned.length / state.leads.length) * 100 : 0;
    return { u, assigned: assigned.length, handled, followups, pending, converted, lost, share };
  });

  const cards = [
    { key: "total", label: "Total leads", value: kpis.total, delta: monthDeltas.total, href: "/leads" },
    { key: "new", label: "New", value: kpis.new, delta: monthDeltas.new, href: "/leads?stage=st_new" },
    { key: "active", label: "Active", value: kpis.active, delta: monthDeltas.active, href: "/leads?stage=st_active" },
    { key: "interested", label: "Interested", value: kpis.interested, delta: monthDeltas.interested, href: "/leads?stage=st_interested" },
    { key: "booking", label: "Booking", value: kpis.booking, delta: monthDeltas.booking, href: "/leads?stage=st_booking" },
    { key: "converted", label: "Converted", value: kpis.converted, delta: monthDeltas.converted, href: "/leads?stage=st_converted" },
    { key: "lost", label: "Lost", value: kpis.lost, delta: monthDeltas.lost, href: "/leads?stage=st_lost" },
    { key: "duplicates", label: "Duplicates", value: kpis.duplicates, delta: monthDeltas.duplicates, href: "/leads?duplicate=yes" },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {isAdmin ? "Organization-wide view." : "Your numbers only."} Figures use each lead&apos;s latest stage.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["today", "Today"],
              ["week", "This week"],
              ["month", "This month"],
              ["custom", "Custom"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setPeriod(id)}
              className={cn(
                "h-9 rounded-full px-3 text-sm",
                period === id ? "bg-[var(--sidebar)] text-white" : "bg-white text-[var(--ink)]",
              )}
            >
              {label}
            </button>
          ))}
          <label className="ml-1 flex items-center gap-2 text-xs text-[var(--muted)]">
            <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
            Compare with previous period
          </label>
        </div>
      </div>

      {period === "custom" ? (
        <div className="mb-4 flex gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="max-w-44" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="max-w-44" />
        </div>
      ) : null}

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.key} href={c.href} className="card p-4 transition hover:-translate-y-0.5">
            <p className="text-sm text-[var(--muted)]">{c.label}</p>
            <p className="mt-2 text-3xl font-semibold">{c.value}</p>
            {compare && period === "month" ? <div className="mt-2"><Delta value={c.delta} /></div> : null}
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Leads per day</h2>
            <span className="text-xs text-[var(--muted)]">Last 14 days</span>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} barSize={18}>
                <CartesianGrid vertical={false} stroke="#e8eee9" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={24} />
                <Tooltip />
                <Bar dataKey="value" fill="#1f7a5c" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Conversion rate</p>
          <p className="mt-1 text-xs text-[var(--muted)]">This month</p>
          <p className="mt-4 text-5xl font-semibold tracking-tight">{conversion.toFixed(1)}%</p>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Leads created this period that are now Converted, divided by all leads created this period.
          </p>
          <div className="mt-5 rounded-xl bg-[var(--canvas)] px-4 py-3">
            <p className="text-xs text-[var(--muted)]">Converted this period</p>
            <p className="text-2xl font-semibold">{kpis.converted}</p>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Pipeline by stage</h2>
          <div className="space-y-3">
            {pipeline.map((p) => (
              <Link key={p.id} href={`/leads?stage=${p.id}`} className="block">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="font-medium">{p.count}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#eef2ef]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(p.count / maxPipe) * 100}%`, background: p.color }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {isAdmin ? (
          <Card>
            <h2 className="mb-4 font-semibold">Leads by source</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-[var(--muted)]">
                <tr>
                  <th className="pb-2 font-medium">Source</th>
                  <th className="pb-2 font-medium">Leads</th>
                  <th className="pb-2 font-medium">Converted</th>
                  <th className="pb-2 font-medium">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {sourceRows.map((r) => (
                  <tr key={r.source} className="border-t border-[var(--line)]">
                    <td className="py-2.5">{r.source}</td>
                    <td>{r.leads}</td>
                    <td>{r.converted}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[#eef2ef]">
                          <span
                            className="block h-full bg-[var(--accent)]"
                            style={{ width: `${Math.min(r.rate, 100)}%` }}
                          />
                        </span>
                        {r.rate.toFixed(1)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <Card>
            <h2 className="mb-2 font-semibold">Your pipeline</h2>
            <p className="text-sm text-[var(--muted)]">
              {kpis.total} leads assigned to you · {kpis.converted} converted · {kpis.lost} lost
            </p>
          </Card>
        )}
      </div>

      {isAdmin ? (
        <Card className="mt-4 overflow-auto">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Salesperson performance</h2>
            <Link href="/admin/assignment" className="text-sm text-[var(--accent)]">
              Edit allocation
            </Link>
          </div>
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-[var(--muted)]">
              <tr>
                <th className="pb-2 font-medium">Salesperson</th>
                <th className="pb-2 font-medium">Assigned</th>
                <th className="pb-2 font-medium">Handled</th>
                <th className="pb-2 font-medium">Follow-ups done</th>
                <th className="pb-2 font-medium">Pending activities</th>
                <th className="pb-2 font-medium">Converted</th>
                <th className="pb-2 font-medium">Lost</th>
                <th className="pb-2 font-medium">Share of leads / target</th>
              </tr>
            </thead>
            <tbody>
              {salesRows.map((r) => (
                <tr key={r.u.id} className="border-t border-[var(--line)]">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <Avatar initials={r.u.initials} size={28} />
                      {r.u.name}
                    </div>
                  </td>
                  <td>{r.assigned}</td>
                  <td>{r.handled}</td>
                  <td>{r.followups}</td>
                  <td>{r.pending}</td>
                  <td>{r.converted}</td>
                  <td>{r.lost}</td>
                  <td>
                    {r.share.toFixed(1)}% / {r.u.allocationPercent}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
      <p className="mt-3 hidden text-xs text-[var(--muted)]">{Object.keys(stages).length} {Object.keys(users).length}</p>
    </div>
  );
}
