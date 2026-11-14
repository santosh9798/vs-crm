import type { VoPlanKind } from "@/lib/catalog";
import type { CatalogSpace, Quotation, QuotationItem } from "@/lib/types";

export type QuoteOptions = {
  stateName: string;
  planKind: VoPlanKind;
  includeCa: boolean;
};

export function parseQuoteOptions(raw: string | null | undefined, fallback?: Partial<QuoteOptions>): QuoteOptions {
  let parsed: Partial<QuoteOptions> = {};
  if (raw?.startsWith("{")) {
    try {
      parsed = JSON.parse(raw) as Partial<QuoteOptions>;
    } catch {
      parsed = {};
    }
  }
  const planKind: VoPlanKind =
    parsed.planKind === "br" || parsed.planKind === "ma" || parsed.planKind === "gst"
      ? parsed.planKind
      : fallback?.planKind === "br" || fallback?.planKind === "ma" || fallback?.planKind === "gst"
        ? fallback.planKind
        : "gst";
  return {
    stateName: parsed.stateName || fallback?.stateName || "",
    planKind,
    includeCa: parsed.includeCa ?? fallback?.includeCa ?? true,
  };
}

export function encodeQuoteOptions(options: QuoteOptions) {
  return JSON.stringify(options);
}

export function planKindFromLabel(label: string): VoPlanKind {
  if (/mailing/i.test(label)) return "ma";
  if (/business/i.test(label)) return "br";
  return "gst";
}

export function spacesFromItems(items: QuotationItem[]): CatalogSpace[] {
  return items
    .filter((item) => item.kind !== "ca")
    .map((item) => ({
      id: item.spaceId || item.id,
      sku: item.spaceId || item.id,
      name: item.name,
      category: "virtual-office",
      address: item.details,
      cityId: item.city || "",
      description: item.details,
      location: item.location || item.name,
      city: item.city,
      listingUrl: item.listingUrl,
      plans: [
        {
          id: "plan",
          name: item.planName,
          duration: item.duration,
          price: item.unitPrice,
        },
      ],
    }));
}

export function caIdsFromItems(items: QuotationItem[]): string[] {
  return items.filter((item) => item.kind === "ca").map((item) => item.spaceId || item.id);
}

export function documentPropsFromQuotation(quote: Quotation, leadName?: string) {
  const inferredPlan = quote.items.find((item) => item.kind !== "ca")?.planName ?? "";
  const options = parseQuoteOptions(quote.optionsJson, {
    planKind: planKindFromLabel(inferredPlan),
    includeCa: quote.items.some((item) => item.kind === "ca"),
  });
  return {
    leadName,
    stateName: options.stateName,
    spaces: spacesFromItems(quote.items),
    planKind: options.planKind,
    caIds: caIdsFromItems(quote.items),
    includeCa: options.includeCa,
  };
}
