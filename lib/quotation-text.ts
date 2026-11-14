import { BANK, BRAND_PROMISES, CA_SERVICES, VO_USES, WHY_CHOOSE_US } from "@/lib/quotation-copy";
import { voPlanLabel, type VoPlanKind } from "@/lib/catalog";
import { formatInrNumber, withGst } from "@/lib/format";
import type { CatalogSpace } from "@/lib/types";

export function quotationPlainText({
  leadName,
  stateName,
  spaces,
  planKind,
  caIds,
  includeCa,
}: {
  leadName?: string;
  stateName: string;
  spaces: CatalogSpace[];
  planKind: VoPlanKind;
  caIds: string[];
  includeCa?: boolean;
}) {
  const greeting = leadName ? `Dear ${leadName},` : "Dear Sir,";
  const showCa = includeCa !== false;
  const cas = showCa ? CA_SERVICES.filter((s) => caIds.includes(s.id)) : [];
  const caRows = (cas.length ? cas : showCa ? [...CA_SERVICES] : []).map(
    (s) => `${s.name}\t${formatInrNumber(s.price)}\t${formatInrNumber(withGst(s.price))}\nService Description: ${s.description}`,
  );
  const options = spaces.map((space, i) => {
    const price = space.plans[0]?.price ?? 0;
    return `${i + 1}\t${space.location || space.name}\t${space.city || ""}\t${formatInrNumber(price)}\t${formatInrNumber(withGst(price))}\t${space.listingUrl || ""}`;
  });

  return [
    greeting,
    "",
    "We are delighted to introduce VOspaces, your trusted partner for Virtual Office Solutions across India. We take pride in helping businesses establish a professional presence while optimizing costs.",
    "",
    "Why Choose Us?",
    ...WHY_CHOOSE_US.map((i) => `✅ ${i}`),
    "",
    "Our Brand Promises",
    ...BRAND_PROMISES.map((i) => `${i.title}: ${i.body}`),
    "",
    `Options & Pricing for Virtual Office${stateName ? ` (${stateName})` : ""}`,
    `${voPlanLabel(planKind)} · 11-month pricing. Total payable includes 18% GST.`,
    "Option\tLocation\tCity\t11-month Pricing (INR)\tTotal Payable (with 18% GST)\tVirtual Office Link",
    ...options,
    ...(caRows.length
      ? [
          "",
          "Optional Service - CA (one-time cost)",
          "We have our in-house specialized CA team to assist with your registration service.",
          ...caRows,
        ]
      : []),
    "",
    "Virtual Office Address can be used for the following purposes:",
    "Business Registration Plan",
    ...VO_USES,
    "",
    "Booking Process",
    "As a next step if you want to proceed with the booking, we would request you to process the payment to confirm virtual office booking. The payment can be made through the below given modes.",
    "Mode 1: Book from the website directly - Select the virtual office link from the above options based on your preferred location.",
    `Mode 2: Payment Link for Virtual Office - ${BANK.paymentLink} (Please enter the total payable amount and make the payment). The payable amount is mentioned above`,
    "Mode 3: Bank Transfer",
    `A/c Name: ${BANK.name}`,
    `A/c No: ${BANK.account}`,
    `A/c Type: ${BANK.type}`,
    `IFSC: ${BANK.ifsc}`,
    "Mode 4: Scan and Pay",
  ].join("\n");
}
