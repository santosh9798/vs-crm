"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { loadCatalog, MOCK_CATALOG, voPlanLabel, voPrice, type ResolvedCatalog, type VoPlanKind } from "@/lib/catalog";
import { quotationPlainText, QuotationDocument } from "@/components/quotation-document";
import { CA_SERVICES } from "@/lib/quotation-copy";
import { useDemo } from "@/lib/demo-store";
import { formatInrNumber, withGst } from "@/lib/format";
import { Button, Card, Field, Input, PageHeader, Select, cn } from "@/components/ui";
import type { CatalogSpace, QuotationItem } from "@/lib/types";

const PLAN_KINDS: { id: VoPlanKind; label: string }[] = [
  { id: "gst", label: "GST Registration (11-month)" },
  { id: "br", label: "Business Registration" },
  { id: "ma", label: "Mailing Address" },
];

function pricedSpace(space: CatalogSpace, kind: VoPlanKind): CatalogSpace {
  const price = voPrice(space, kind);
  return {
    ...space,
    plans: [{ id: kind, name: voPlanLabel(kind), duration: "11 months", price }],
  };
}

function Wizard() {
  const params = useSearchParams();
  const router = useRouter();
  const { visibleLeads, currentUser, addQuotation, toast, state } = useDemo();
  const [leadId, setLeadId] = useState(params.get("leadId") ?? visibleLeads[0]?.id ?? "");
  const [stateId, setStateId] = useState("");
  const [cityIds, setCityIds] = useState<string[]>([]);
  const [spaceIds, setSpaceIds] = useState<string[]>([]);
  const [planKind, setPlanKind] = useState<VoPlanKind>("gst");
  const [includeCa, setIncludeCa] = useState(true);
  const [caIds, setCaIds] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [catalog, setCatalog] = useState<ResolvedCatalog>(MOCK_CATALOG);
  const [catalogStatus, setCatalogStatus] = useState<"mock" | "live" | "loading" | "error">(
    state.settings.catalogApiUrl.trim() ? "loading" : "mock",
  );
  const [catalogError, setCatalogError] = useState("");

  useEffect(() => {
    const url = state.settings.catalogApiUrl.trim();
    if (!url) {
      setCatalog(MOCK_CATALOG);
      setCatalogStatus("mock");
      return;
    }
    let cancelled = false;
    setCatalogStatus("loading");
    loadCatalog(url, state.settings.catalogApiKey)
      .then((c) => {
        if (cancelled) return;
        setCatalog(c);
        setCatalogStatus("live");
        setCatalogError("");
        setStateId((current) => (c.states.some((s) => s.id === current) ? current : ""));
        setCityIds([]);
        setSpaceIds([]);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setCatalog(MOCK_CATALOG);
        setCatalogStatus("error");
        setCatalogError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [state.settings.catalogApiUrl, state.settings.catalogApiKey]);

  const lead = visibleLeads.find((l) => l.id === leadId) ?? state.leads.find((l) => l.id === leadId);

  useEffect(() => {
    if (catalogStatus === "loading" || catalog.states.length === 0) return;
    const valid = stateId && catalog.states.some((s) => s.id === stateId);
    if (valid) return;
    const match = catalog.states.find((s) => s.name.toLowerCase() === lead?.state.toLowerCase());
    setStateId(match?.id ?? "");
  }, [catalog.states, catalogStatus, lead, stateId]);

  const cities = catalog.cities.filter((c) => c.stateId === stateId);
  const inState = catalog.spaces.filter((s) => (s.state || s.cityId.split("|")[0]) === stateId);
  const cityFiltered = cityIds.length
    ? inState.filter((s) => cityIds.includes(s.cityId))
    : inState;
  const query = q.trim().toLowerCase();
  const visibleSpaces = cityFiltered
    .map((s) => pricedSpace(s, planKind))
    .filter((s) => s.plans[0].price > 0)
    .filter((s) =>
      !query ||
      (s.location || s.name).toLowerCase().includes(query) ||
      (s.city || "").toLowerCase().includes(query),
    )
    .sort((a, b) => a.plans[0].price - b.plans[0].price);

  const selectedSpaces = inState
    .filter((s) => spaceIds.includes(s.id))
    .map((s) => pricedSpace(s, planKind))
    .filter((s) => s.plans[0].price > 0)
    .sort((a, b) => a.plans[0].price - b.plans[0].price);

  const toggleCity = (id: string) => {
    setCityIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const toggleSpace = (id: string) => {
    setSpaceIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const selectVisible = () => setSpaceIds((ids) => [...new Set([...ids, ...visibleSpaces.map((s) => s.id)])]);
  const clearSpaces = () => setSpaceIds([]);

  const quoteItems: QuotationItem[] = useMemo(() => {
    const spaces: QuotationItem[] = selectedSpaces.map((s) => ({
      id: `qi_${s.id}`,
      spaceId: s.id,
      name: s.location || s.name,
      details: s.city || s.address,
      planName: voPlanLabel(planKind),
      duration: "11 months",
      quantity: 1,
      unitPrice: s.plans[0].price,
      lineTotal: withGst(s.plans[0].price),
      city: s.city,
      location: s.location || s.name,
      listingUrl: s.listingUrl,
      kind: "space",
    }));
    const cas: QuotationItem[] = includeCa
      ? CA_SERVICES.filter((c) => caIds.includes(c.id)).map((c) => ({
          id: c.id,
          spaceId: c.id,
          name: c.name,
          details: c.description,
          planName: "CA (one-time)",
          duration: "one-time",
          quantity: 1,
          unitPrice: c.price,
          lineTotal: withGst(c.price),
          kind: "ca",
        }))
      : [];
    return [...spaces, ...cas];
  }, [selectedSpaces, planKind, caIds, includeCa]);

  const stateName = catalog.states.find((s) => s.id === stateId)?.name ?? stateId;
  const lowest = selectedSpaces[0]?.plans[0].price ?? 0;

  const send = async (as: "draft" | "sent") => {
    if (!lead || !currentUser || selectedSpaces.length === 0) return;
    await addQuotation({
      leadId: lead.id,
      createdBy: currentUser.id,
      recipient: lead.email,
      totalAmount: withGst(lowest),
      status: as,
      sentAt: as === "sent" ? new Date().toISOString() : null,
      items: quoteItems,
    });
    toast(as === "sent" ? "Quotation saved as sent" : "Draft saved");
    router.push("/quotations");
  };

  const copyQuote = async () => {
    const text = quotationPlainText({
      leadName: lead?.name,
      stateName,
      spaces: selectedSpaces,
      planKind,
      caIds,
      includeCa,
    });
    await navigator.clipboard.writeText(text);
    toast("Quotation copied — paste into email or WhatsApp");
  };

  const subtitle =
    catalogStatus === "live"
      ? "Live VOspaces listings. Pick a state and multiple locations — no quantity."
      : catalogStatus === "loading"
        ? "Loading listing prices…"
        : catalogStatus === "error"
          ? `Catalog API failed — sample prices. ${catalogError}`
          : "Sample prices until the catalog API is connected.";

  return (
    <div>
      <PageHeader
        title="Generate quotation"
        subtitle={subtitle}
        actions={
          <>
            <Button variant="outline" size="sm" disabled={selectedSpaces.length === 0} onClick={copyQuote}>Copy text</Button>
            <Button variant="outline" size="sm" disabled={selectedSpaces.length === 0} onClick={() => window.print()}>Print</Button>
            <Button variant="secondary" size="sm" disabled={selectedSpaces.length === 0} onClick={() => send("draft")}>Save draft</Button>
            <Button size="sm" disabled={selectedSpaces.length === 0} onClick={() => send("sent")}>Send to lead</Button>
          </>
        }
      />

      <div className="grid items-start gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="print:hidden">
          <Field label="Lead">
            <Select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              {visibleLeads.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </Field>
          <div className="mt-3">
            <Field label="State">
              <Select
                value={stateId}
                disabled={catalogStatus === "loading"}
                onChange={(e) => {
                  setStateId(e.target.value);
                  setCityIds([]);
                  setSpaceIds([]);
                }}
              >
                <option value="">Select</option>
                {catalog.states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Plan">
              <Select value={planKind} onChange={(e) => setPlanKind(e.target.value as VoPlanKind)}>
                {PLAN_KINDS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </Select>
            </Field>
          </div>

          {stateId ? (
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-medium text-[var(--muted)]">Cities (optional filter)</p>
              <div className="flex flex-wrap gap-1.5">
                {cities.map((c) => {
                  const on = cityIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCity(c.id)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs",
                        on ? "bg-[var(--accent)] text-white" : "bg-[var(--canvas)] text-[var(--ink)]",
                      )}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {stateId ? (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-[var(--muted)]">
                  Locations · {spaceIds.length} selected
                </p>
                <div className="flex gap-2 text-xs">
                  <button type="button" className="text-[var(--accent)]" onClick={selectVisible}>Select all shown</button>
                  <button type="button" className="text-[var(--muted)]" onClick={clearSpaces}>Clear</button>
                </div>
              </div>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search location" className="mb-2 h-8" />
              <div className="max-h-[360px] space-y-1 overflow-auto pr-1">
                {visibleSpaces.map((s) => {
                  const on = spaceIds.includes(s.id);
                  return (
                    <label key={s.id} className={cn("flex cursor-pointer items-start gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-[var(--canvas)]", on && "bg-[var(--accent-soft)]")}>
                      <input type="checkbox" className="mt-1" checked={on} onChange={() => toggleSpace(s.id)} />
                      <span className="flex-1">
                        <span className="block font-medium">{s.location || s.name}</span>
                        <span className="text-xs text-[var(--muted)]">{s.city}</span>
                      </span>
                      <span className="text-right text-xs">
                        <span className="block">{formatInrNumber(s.plans[0].price)}</span>
                        <span className="text-[var(--muted)]">{formatInrNumber(withGst(s.plans[0].price))} incl. GST</span>
                      </span>
                    </label>
                  );
                })}
                {visibleSpaces.length === 0 ? <p className="px-2 py-6 text-center text-sm text-[var(--muted)]">No locations in this filter.</p> : null}
              </div>
            </div>
          ) : null}

          <div className="mt-4">
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={includeCa}
                onChange={() => setIncludeCa((on) => !on)}
              />
              <span>
                Include Optional CA services
                <span className="block text-xs text-[var(--muted)]">Untick to hide this block from the quotation.</span>
              </span>
            </label>
            {includeCa ? (
              <div className="mt-2 ml-6">
                {CA_SERVICES.map((s) => (
                  <label key={s.id} className="mb-1 flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={caIds.includes(s.id)}
                      onChange={() => setCaIds((ids) => ids.includes(s.id) ? ids.filter((x) => x !== s.id) : [...ids, s.id])}
                    />
                    <span>
                      {s.name}
                      <span className="block text-xs text-[var(--muted)]">{formatInrNumber(s.price)} · {formatInrNumber(withGst(s.price))} incl. GST</span>
                    </span>
                  </label>
                ))}
                <p className="mt-1 text-xs text-[var(--muted)]">Leave both unticked to show all CA options, or tick only the ones this quote should offer.</p>
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="overflow-auto p-0 print:border-0 print:shadow-none">
          <QuotationDocument
            leadName={lead?.name}
            stateName={stateName}
            spaces={selectedSpaces}
            planKind={planKind}
            caIds={caIds}
            includeCa={includeCa}
          />
        </Card>
      </div>
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
