"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { catalogCities, catalogSpaces, catalogStates } from "@/lib/mock/seed";
import { useDemo } from "@/lib/demo-store";
import { formatInrExact } from "@/lib/format";
import { Button, Card, Field, Input, PageHeader, Select } from "@/components/ui";
import type { QuotationItem } from "@/lib/types";

function Wizard() {
  const params = useSearchParams();
  const router = useRouter();
  const { visibleLeads, currentUser, addQuotation, toast, state } = useDemo();
  const [leadId, setLeadId] = useState(params.get("leadId") ?? visibleLeads[0]?.id ?? "");
  const [stateId, setStateId] = useState("");
  const [cityId, setCityId] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [planId, setPlanId] = useState("");
  const [qty, setQty] = useState(1);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [preview, setPreview] = useState(false);

  const cities = catalogCities.filter((c) => c.stateId === stateId);
  const spaces = catalogSpaces.filter((s) => s.cityId === cityId);
  const space = catalogSpaces.find((s) => s.id === spaceId);
  const plan = space?.plans.find((p) => p.id === planId);
  const lead = visibleLeads.find((l) => l.id === leadId) ?? state.leads.find((l) => l.id === leadId);
  const total = items.reduce((s, i) => s + i.lineTotal, 0);

  const addLine = () => {
    if (!space || !plan) return;
    setItems((rows) => [
      ...rows,
      {
        id: `qi_${rows.length + 1}`,
        spaceId: space.id,
        name: space.name,
        details: space.description,
        planName: plan.name,
        duration: plan.duration,
        quantity: qty,
        unitPrice: plan.price,
        lineTotal: plan.price * qty,
      },
    ]);
    setPlanId("");
  };

  const send = (as: "draft" | "sent") => {
    if (!lead || !currentUser) return;
    addQuotation({
      leadId: lead.id,
      createdBy: currentUser.id,
      recipient: lead.email,
      totalAmount: total,
      status: as,
      sentAt: as === "sent" ? new Date().toISOString() : null,
      items,
    });
    toast(as === "sent" ? "Branded PDF emailed to the lead (preview)" : "Draft saved");
    router.push("/quotations");
  };

  const company = state.settings.companyName;

  return (
    <div className="max-w-4xl">
      <PageHeader title="Generate quotation" subtitle="State → City → Space → Plan. Prices come from the website catalog (mock)." />
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <Field label="Lead">
            <Select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              {visibleLeads.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </Field>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="State">
              <Select value={stateId} onChange={(e) => { setStateId(e.target.value); setCityId(""); setSpaceId(""); setPlanId(""); }}>
                <option value="">Select</option>
                {catalogStates.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="City">
              <Select value={cityId} onChange={(e) => { setCityId(e.target.value); setSpaceId(""); setPlanId(""); }} disabled={!stateId}>
                <option value="">Select</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Space">
              <Select value={spaceId} onChange={(e) => { setSpaceId(e.target.value); setPlanId(""); }} disabled={!cityId}>
                <option value="">Select</option>
                {spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Plan">
              <Select value={planId} onChange={(e) => setPlanId(e.target.value)} disabled={!spaceId}>
                <option value="">Select</option>
                {space?.plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} · {formatInrExact(p.price)}</option>
                ))}
              </Select>
            </Field>
          </div>
          {space && plan ? (
            <div className="mt-3 rounded-xl bg-[var(--canvas)] p-3 text-sm">
              <p className="font-medium">{space.name}</p>
              <p className="text-[var(--muted)]">{space.address}</p>
              <p className="mt-1">{plan.name} · {plan.duration} · {formatInrExact(plan.price)}</p>
              <div className="mt-2 flex items-center gap-2">
                <Field label="Qty">
                  <Input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value) || 1)} className="w-24" />
                </Field>
                <Button className="mt-5" size="sm" onClick={addLine}>Add to quotation</Button>
              </div>
            </div>
          ) : null}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Line items</h2>
          {items.length === 0 ? <p className="text-sm text-[var(--muted)]">Add at least one space.</p> : null}
          {items.map((i, idx) => (
            <div key={i.id} className="mb-2 flex items-start justify-between gap-2 border-b border-[var(--line)] pb-2 text-sm">
              <div>
                <p className="font-medium">{i.name}</p>
                <p className="text-[var(--muted)]">{i.planName} × {i.quantity}</p>
              </div>
              <div className="text-right">
                <p>{formatInrExact(i.lineTotal)}</p>
                <button className="text-xs text-[var(--danger)]" onClick={() => setItems((rows) => rows.filter((_, n) => n !== idx))}>Remove</button>
              </div>
            </div>
          ))}
          <p className="mt-3 text-lg font-semibold">Total {formatInrExact(total)}</p>
          <p className="text-xs text-[var(--muted)]">No GST, no discounts. Snapshot is frozen when sent.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" disabled={items.length === 0} onClick={() => setPreview(true)}>Preview</Button>
            <Button variant="secondary" disabled={items.length === 0} onClick={() => send("draft")}>Save draft</Button>
            <Button disabled={items.length === 0} onClick={() => send("sent")}>Send PDF</Button>
          </div>
        </Card>
      </div>

      {preview && lead ? (
        <Card className="mt-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Quotation preview</h2>
            <button className="text-sm text-[var(--muted)]" onClick={() => setPreview(false)}>Hide</button>
          </div>
          <div className="rounded-xl border border-[var(--line)] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-[var(--muted)]">{company}</p>
                <h3 className="text-xl font-semibold">Virtual office quotation</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--sidebar)] font-bold text-white">VS</div>
            </div>
            <div className="mt-6 grid gap-1 text-sm">
              <p><span className="text-[var(--muted)]">Prepared for</span> {lead.name}</p>
              <p><span className="text-[var(--muted)]">Email</span> {lead.email}</p>
              <p><span className="text-[var(--muted)]">Mobile</span> {lead.mobile}</p>
              <p><span className="text-[var(--muted)]">City</span> {lead.city}</p>
            </div>
            <table className="mt-6 w-full text-sm">
              <thead className="text-left text-[var(--muted)]">
                <tr>
                  <th className="pb-2">Space</th>
                  <th className="pb-2">Plan</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-t border-[var(--line)]">
                    <td className="py-2">{i.name}<div className="text-xs text-[var(--muted)]">{i.details}</div></td>
                    <td>{i.planName} ({i.duration})</td>
                    <td>{i.quantity}</td>
                    <td>{formatInrExact(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-right text-lg font-semibold">Grand total {formatInrExact(total)}</p>
            <p className="mt-2 text-xs text-[var(--muted)]">All prices INR as listed on the website. This preview is a placeholder until the client quotation PDF is provided.</p>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

export default function NewQuotationPage() {
  return (
    <Suspense>
      <Wizard />
    </Suspense>
  );
}
