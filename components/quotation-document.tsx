"use client";

import { BANK, BRAND_PROMISES, CA_SERVICES, VO_USES, WHY_CHOOSE_US } from "@/lib/quotation-copy";
import { formatInrNumber, withGst } from "@/lib/format";
import { voPlanLabel, type VoPlanKind } from "@/lib/catalog";
import type { CatalogSpace } from "@/lib/types";

export function QuotationDocument({
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
  const cas = showCa
    ? CA_SERVICES.filter((s) => caIds.includes(s.id))
    : [];
  const caRows = cas.length ? cas : showCa ? [...CA_SERVICES] : [];

  return (
    <article className="quotation-doc mx-auto max-w-4xl bg-white px-6 py-8 text-[15px] leading-relaxed text-[#1a1f1c] sm:px-10">
      <p>{greeting}</p>
      <p className="mt-4">
        We are delighted to introduce <strong>VOspaces</strong>, your trusted partner for Virtual Office Solutions across India.
        We take pride in helping businesses establish a professional presence while optimizing costs.
      </p>

      <h2 className="mt-8 text-base font-semibold">Why Choose Us?</h2>
      <ul className="mt-2 space-y-1">
        {WHY_CHOOSE_US.map((item) => (
          <li key={item}>✅ {item}</li>
        ))}
      </ul>

      <h2 className="mt-8 text-base font-semibold">Our Brand Promises</h2>
      <ul className="mt-2 space-y-2">
        {BRAND_PROMISES.map((item) => (
          <li key={item.title}>
            <strong>{item.title}:</strong> {item.body}
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-base font-semibold">
        Options &amp; Pricing for Virtual Office{stateName ? ` (${stateName})` : ""}
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {voPlanLabel(planKind)} · 11-month pricing. Total payable includes 18% GST. Each row is an option — the client picks one location.
      </p>
      {spaces.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">Select one or more locations to fill this table.</p>
      ) : (
        <div className="mt-3 overflow-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#14323f] text-left text-white">
                <th className="px-2 py-2 font-medium">Option</th>
                <th className="px-2 py-2 font-medium">Location</th>
                <th className="px-2 py-2 font-medium">City</th>
                <th className="px-2 py-2 font-medium">11-month Pricing (INR)</th>
                <th className="px-2 py-2 font-medium">Total Payable (with 18% GST)</th>
                <th className="px-2 py-2 font-medium">Virtual Office Link</th>
              </tr>
            </thead>
            <tbody>
              {spaces.map((space, i) => {
                const price = space.plans[0]?.price ?? 0;
                return (
                  <tr key={space.id} className="border-b border-[var(--line)]">
                    <td className="px-2 py-2">{i + 1}</td>
                    <td className="px-2 py-2">{space.location || space.name}</td>
                    <td className="px-2 py-2">{space.city || "—"}</td>
                    <td className="px-2 py-2">{formatInrNumber(price)}</td>
                    <td className="px-2 py-2 font-medium">{formatInrNumber(withGst(price))}</td>
                    <td className="px-2 py-2">
                      {space.listingUrl ? (
                        <a className="break-all text-[var(--accent)] underline" href={space.listingUrl} target="_blank" rel="noreferrer">
                          {space.listingUrl}
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {caRows.length > 0 ? (
        <>
          <h2 className="mt-8 text-base font-semibold">Optional Service - CA (one-time cost)</h2>
          <p className="mt-1">We have our in-house specialized CA team to assist with your registration service.</p>
          <div className="mt-3 overflow-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="bg-[#14323f] text-left text-white">
                  <th className="px-2 py-2 font-medium">Service (one-time)</th>
                  <th className="px-2 py-2 font-medium">CA one-time cost</th>
                  <th className="px-2 py-2 font-medium">Total Payable (with 18% GST)</th>
                </tr>
              </thead>
              <tbody>
                {caRows.map((s) => (
                  <tr key={s.id} className="border-b border-[var(--line)] align-top">
                    <td className="px-2 py-2">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-[var(--muted)]">Service Description: {s.description}</div>
                    </td>
                    <td className="px-2 py-2">{formatInrNumber(s.price)}</td>
                    <td className="px-2 py-2 font-medium">{formatInrNumber(withGst(s.price))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <h2 className="mt-8 text-base font-semibold">Virtual Office Address can be used for the following purposes:</h2>
      <p className="mt-2 font-medium">Business Registration Plan</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {VO_USES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2 className="mt-8 text-base font-semibold">Booking Process</h2>
      <p className="mt-2">
        As a next step if you want to proceed with the booking, we would request you to process the payment to confirm virtual office booking.
        The payment can be made through the below given modes.
      </p>
      <p className="mt-3">
        <strong>Mode 1:</strong> Book from the website directly — Select the virtual office link from the above options based on your preferred location.
      </p>
      <p className="mt-2">
        <strong>Mode 2:</strong> Payment Link for Virtual Office —{" "}
        <a className="text-[var(--accent)] underline" href={BANK.paymentLink} target="_blank" rel="noreferrer">{BANK.paymentLink}</a>
        {" "}(Please enter the total payable amount and make the payment). The payable amount is mentioned above.
      </p>
      <p className="mt-2"><strong>Mode 3:</strong> Bank Transfer</p>
      <div className="mt-1 ml-4 text-sm">
        <p>A/c Name: {BANK.name}</p>
        <p>A/c No: {BANK.account}</p>
        <p>A/c Type: {BANK.type}</p>
        <p>IFSC: {BANK.ifsc}</p>
      </div>
      <p className="mt-2"><strong>Mode 4:</strong> Scan and Pay</p>
    </article>
  );
}

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
