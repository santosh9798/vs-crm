import { catalogCities, catalogSpaces, catalogStates } from "@/lib/mock/seed";
import type { CatalogCity, CatalogSpace, CatalogState } from "@/lib/types";

export type CatalogPayload = {
  status: string;
  source?: string;
  states: string[];
  cities: { name: string; state: string }[];
  listings: {
    id: number;
    name: string;
    state: string;
    city: string;
    location: string;
    address: string;
    active: boolean;
    plans: { id: string; name: string; duration: string; price: number }[];
  }[];
};

export type ResolvedCatalog = {
  states: CatalogState[];
  cities: CatalogCity[];
  spaces: CatalogSpace[];
  live: boolean;
  error?: string;
};

export const MOCK_CATALOG: ResolvedCatalog = {
  states: catalogStates,
  cities: catalogCities,
  spaces: catalogSpaces,
  live: false,
};

export function mapListingsPayload(data: CatalogPayload): ResolvedCatalog {
  const states: CatalogState[] = (data.states ?? []).map((name) => ({ id: name, name }));
  const cities: CatalogCity[] = (data.cities ?? []).map((c) => ({
    id: `${c.state}|${c.name}`,
    name: c.name,
    stateId: c.state,
  }));
  const spaces: CatalogSpace[] = (data.listings ?? []).map((l) => ({
    id: String(l.id),
    sku: `VO-${l.id}`,
    name: l.name || l.location,
    category: "Virtual Office",
    address: l.address || [l.location, l.city, l.state].filter(Boolean).join(", "),
    cityId: `${l.state}|${l.city}`,
    description: l.location,
    location: l.location,
    city: l.city,
    state: l.state,
    listingUrl: listingUrl(l.location, l.state, String(l.id)),
    plans: (l.plans ?? []).map((p) => ({
      id: `${l.id}-${p.id}`,
      name: p.name,
      duration: p.duration || "11 months",
      price: Number(p.price) || 0,
    })),
  }));
  return { states, cities, spaces, live: true };
}

export function listingUrl(location: string, state: string, id: string) {
  return `https://vospaces.com/virtual-office-in-${(location || "").replace(/\s+/g, "")}-${(state || "").replace(/\s+/g, "")}/${id}`;
}

export type VoPlanKind = "gst" | "br" | "ma";

export function voPrice(space: CatalogSpace, kind: VoPlanKind = "gst") {
  const match = space.plans.find((p) => p.id === kind || p.id.endsWith(`-${kind}`));
  if (match?.price) return match.price;
  if (kind === "gst") {
    return (
      space.plans.find((p) => /gst/i.test(p.name))?.price ??
      space.plans.find((p) => /annual|11/i.test(p.name))?.price ??
      space.plans[0]?.price ??
      0
    );
  }
  if (kind === "br") {
    return space.plans.find((p) => /business/i.test(p.name))?.price ?? 0;
  }
  return space.plans.find((p) => /mail/i.test(p.name))?.price ?? 0;
}

export function voPlanLabel(kind: VoPlanKind) {
  if (kind === "br") return "Business Registration";
  if (kind === "ma") return "Mailing Address";
  return "GST Registration";
}

export async function loadCatalog(apiUrl: string, apiKey: string): Promise<ResolvedCatalog> {
  const url = apiUrl.trim();
  if (!url) return MOCK_CATALOG;

  const proxy = `/api/catalog?src=${encodeURIComponent(url)}`;
  const res = await fetch(proxy, {
    headers: apiKey ? { "x-api-key": apiKey } : undefined,
    cache: "no-store",
  });
  const data = (await res.json()) as CatalogPayload & { message?: string };
  if (!res.ok || data.status !== "success") {
    throw new Error(data.message || `Catalog API failed (${res.status})`);
  }
  const mapped = mapListingsPayload(data);
  if (mapped.spaces.length === 0) {
    throw new Error("Catalog API returned no listings");
  }
  return mapped;
}
