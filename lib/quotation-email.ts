import { BANK, BRAND_PROMISES, CA_SERVICES, VO_USES, WHY_CHOOSE_US } from "@/lib/quotation-copy";
import { voPlanLabel } from "@/lib/catalog";
import { formatInrNumber, withGst } from "@/lib/format";
import { quotationPlainText } from "@/lib/quotation-text";
import { spacesFromItems, type QuoteOptions } from "@/lib/quotation-view";
import type { QuotationItem } from "@/lib/types";

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fill(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? "");
}

function introHtml(body: string) {
  return body
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 12px">${esc(block).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export function buildQuotationEmail({
  templateSubject,
  templateBody,
  vars,
  leadName,
  items,
  options,
}: {
  templateSubject: string;
  templateBody: string;
  vars: Record<string, string>;
  leadName: string;
  items: QuotationItem[];
  options: QuoteOptions;
}) {
  const spaces = spacesFromItems(items);
  const caIds = items.filter((item) => item.kind === "ca").map((item) => item.spaceId || item.id);
  const showCa = options.includeCa !== false;
  const cas = showCa ? CA_SERVICES.filter((s) => caIds.includes(s.id)) : [];
  const caRows = cas.length ? cas : showCa ? [...CA_SERVICES] : [];
  const greeting = leadName ? `Dear ${leadName},` : "Dear Sir,";

  const optionRows = spaces
    .map((space, i) => {
      const price = space.plans[0]?.price ?? 0;
      const url = space.listingUrl
        ? `<a href="${esc(space.listingUrl)}" style="color:#0f6b5c">${esc(space.listingUrl)}</a>`
        : "—";
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${i + 1}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${esc(space.location || space.name)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${esc(space.city || "—")}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${formatInrNumber(price)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb"><strong>${formatInrNumber(withGst(price))}</strong></td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;word-break:break-all">${url}</td>
      </tr>`;
    })
    .join("");

  const caTable = caRows.length
    ? `<h2 style="margin:28px 0 8px;font-size:16px">Optional Service - CA (one-time cost)</h2>
      <p style="margin:0 0 12px">We have our in-house specialized CA team to assist with your registration service.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#14323f;color:#fff;text-align:left">
            <th style="padding:8px">Service (one-time)</th>
            <th style="padding:8px">CA one-time cost</th>
            <th style="padding:8px">Total Payable (with 18% GST)</th>
          </tr>
        </thead>
        <tbody>
          ${caRows
            .map(
              (s) => `<tr>
                <td style="padding:8px;border-bottom:1px solid #e5e7eb;vertical-align:top">
                  <div><strong>${esc(s.name)}</strong></div>
                  <div style="font-size:12px;color:#6b7280">Service Description: ${esc(s.description)}</div>
                </td>
                <td style="padding:8px;border-bottom:1px solid #e5e7eb">${formatInrNumber(s.price)}</td>
                <td style="padding:8px;border-bottom:1px solid #e5e7eb"><strong>${formatInrNumber(withGst(s.price))}</strong></td>
              </tr>`,
            )
            .join("")}
        </tbody>
      </table>`
    : "";

  const filledBody = fill(templateBody, vars);
  const html = `<div style="font-family:Georgia,serif;font-size:15px;color:#1a1f1c;line-height:1.6;max-width:720px">
    ${introHtml(filledBody)}
    <p>${esc(greeting)}</p>
    <p>We are delighted to introduce <strong>VOspaces</strong>, your trusted partner for Virtual Office Solutions across India. We take pride in helping businesses establish a professional presence while optimizing costs.</p>
    <h2 style="margin:28px 0 8px;font-size:16px">Why Choose Us?</h2>
    <ul>${WHY_CHOOSE_US.map((item) => `<li>✅ ${esc(item)}</li>`).join("")}</ul>
    <h2 style="margin:28px 0 8px;font-size:16px">Our Brand Promises</h2>
    <ul>${BRAND_PROMISES.map((item) => `<li><strong>${esc(item.title)}:</strong> ${esc(item.body)}</li>`).join("")}</ul>
    <h2 style="margin:28px 0 8px;font-size:16px">Options &amp; Pricing for Virtual Office${options.stateName ? ` (${esc(options.stateName)})` : ""}</h2>
    <p style="color:#6b7280;font-size:13px">${esc(voPlanLabel(options.planKind))} · 11-month pricing. Total payable includes 18% GST. Each row is an option — the client picks one location.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="background:#14323f;color:#fff;text-align:left">
          <th style="padding:8px">Option</th>
          <th style="padding:8px">Location</th>
          <th style="padding:8px">City</th>
          <th style="padding:8px">11-month Pricing (INR)</th>
          <th style="padding:8px">Total Payable (with 18% GST)</th>
          <th style="padding:8px">Virtual Office Link</th>
        </tr>
      </thead>
      <tbody>${optionRows}</tbody>
    </table>
    ${caTable}
    <h2 style="margin:28px 0 8px;font-size:16px">Virtual Office Address can be used for the following purposes:</h2>
    <p><strong>Business Registration Plan</strong></p>
    <ul>${VO_USES.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
    <h2 style="margin:28px 0 8px;font-size:16px">Booking Process</h2>
    <p>As a next step if you want to proceed with the booking, we would request you to process the payment to confirm virtual office booking. The payment can be made through the below given modes.</p>
    <p><strong>Mode 1:</strong> Book from the website directly — Select the virtual office link from the above options based on your preferred location.</p>
    <p><strong>Mode 2:</strong> Payment Link for Virtual Office — <a href="${BANK.paymentLink}" style="color:#0f6b5c">${BANK.paymentLink}</a> (Please enter the total payable amount and make the payment). The payable amount is mentioned above.</p>
    <p><strong>Mode 3:</strong> Bank Transfer</p>
    <p>A/c Name: ${BANK.name}<br/>A/c No: ${BANK.account}<br/>A/c Type: ${BANK.type}<br/>IFSC: ${BANK.ifsc}</p>
    <p><strong>Mode 4:</strong> Scan and Pay</p>
  </div>`;

  const text = `${fill(templateBody, vars)}\n\n${quotationPlainText({
    leadName,
    stateName: options.stateName,
    spaces,
    planKind: options.planKind,
    caIds,
    includeCa: options.includeCa,
  })}`;

  return {
    subject: fill(templateSubject, vars),
    html,
    text,
  };
}
