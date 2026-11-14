import { BANK, BRAND_PROMISES, CA_SERVICES, VO_USES, WHY_CHOOSE_US } from "@/lib/quotation-copy";
import { voPlanLabel } from "@/lib/catalog";
import { formatInrNumber, withGst } from "@/lib/format";
import { quotationPlainText } from "@/lib/quotation-text";
import { spacesFromItems, type QuoteOptions } from "@/lib/quotation-view";
import type { QuotationItem } from "@/lib/types";

const FONT = "Arial,Helvetica,sans-serif";
const NAVY = "#14323f";
const GREEN = "#1f7a5c";
const INK = "#15231f";
const MUTED = "#5c6b66";
const LINE = "#e4ece8";
const SOFT = "#f3f8f5";
const PAGE = "#e8eeeb";
const LOGO = "https://vospaces.com/images/logo.png";

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
  const inner = body
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 8px;font-family:${FONT};font-size:14px;line-height:1.6;color:${INK}">${esc(block).replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
    <tr>
      <td style="background:${SOFT};border-left:4px solid ${GREEN};border-radius:10px;padding:16px 18px">${inner}</td>
    </tr>
  </table>`;
}

function heading(text: string) {
  return `<h2 style="margin:32px 0 12px;font-family:${FONT};font-size:18px;line-height:1.3;color:${NAVY};font-weight:700">${esc(text)}</h2>`;
}

function para(text: string) {
  return `<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.7;color:${INK}">${text}</p>`;
}

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:10px 0 0">
    <tr>
      <td style="background:${GREEN};border-radius:8px">
        <a href="${esc(href)}" style="display:inline-block;padding:10px 16px;font-family:${FONT};font-size:13px;font-weight:700;color:#ffffff;text-decoration:none">${esc(label)}</a>
      </td>
    </tr>
  </table>`;
}

function whyRow(item: string) {
  const idx = item.indexOf(": ");
  const title = idx === -1 ? item : item.slice(0, idx);
  const body = idx === -1 ? "" : item.slice(idx + 2);
  return `<tr>
    <td valign="top" width="28" style="padding:0 0 14px">
      <div style="width:22px;height:22px;border-radius:11px;background:${SOFT};color:${GREEN};font-family:${FONT};font-size:13px;font-weight:700;line-height:22px;text-align:center">✓</div>
    </td>
    <td valign="top" style="padding:0 0 14px 8px;font-family:${FONT};font-size:14px;line-height:1.55;color:${INK}">
      <strong>${esc(title)}</strong>${body ? `<span style="color:${MUTED}"> — ${esc(body)}</span>` : ""}
    </td>
  </tr>`;
}

function promiseCell(title: string, body: string) {
  return `<td valign="top" width="50%" style="padding:6px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SOFT};border-radius:12px">
      <tr>
        <td style="padding:16px 16px 18px">
          <p style="margin:0 0 6px;font-family:${FONT};font-size:14px;font-weight:700;color:${NAVY}">${esc(title)}</p>
          <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.55;color:${MUTED}">${esc(body)}</p>
        </td>
      </tr>
    </table>
  </td>`;
}

function spaceCard(space: { location?: string; name: string; city?: string; listingUrl?: string; plans: { price: number }[] }, index: number) {
  const price = space.plans[0]?.price ?? 0;
  const payable = withGst(price);
  const link = space.listingUrl
    ? button(space.listingUrl, "View listing →")
    : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;border:1px solid ${LINE};border-radius:14px">
    <tr>
      <td style="padding:18px 18px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="top">
              <p style="margin:0 0 4px;font-family:${FONT};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${MUTED}">Option ${index + 1}</p>
              <p style="margin:0;font-family:${FONT};font-size:16px;font-weight:700;color:${NAVY}">${esc(space.location || space.name)}</p>
              <p style="margin:4px 0 0;font-family:${FONT};font-size:13px;color:${MUTED}">${esc(space.city || "—")}</p>
            </td>
            <td valign="top" align="right" style="white-space:nowrap;padding-left:12px">
              <p style="margin:0;font-family:${FONT};font-size:11px;color:${MUTED}">Total payable</p>
              <p style="margin:2px 0 0;font-family:${FONT};font-size:20px;font-weight:700;color:${GREEN}">₹${formatInrNumber(payable)}</p>
              <p style="margin:2px 0 0;font-family:${FONT};font-size:12px;color:${MUTED}">₹${formatInrNumber(price)} + 18% GST</p>
            </td>
          </tr>
        </table>
        ${link}
      </td>
    </tr>
  </table>`;
}

function caCard(name: string, description: string, price: number) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;border:1px solid ${LINE};border-radius:14px">
    <tr>
      <td style="padding:18px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="top">
              <p style="margin:0;font-family:${FONT};font-size:15px;font-weight:700;color:${NAVY}">${esc(name)}</p>
              <p style="margin:8px 0 0;font-family:${FONT};font-size:13px;line-height:1.55;color:${MUTED}">Service Description: ${esc(description)}</p>
            </td>
            <td valign="top" align="right" style="white-space:nowrap;padding-left:16px">
              <p style="margin:0;font-family:${FONT};font-size:11px;color:${MUTED}">One-time</p>
              <p style="margin:2px 0 0;font-family:${FONT};font-size:18px;font-weight:700;color:${GREEN}">₹${formatInrNumber(withGst(price))}</p>
              <p style="margin:2px 0 0;font-family:${FONT};font-size:12px;color:${MUTED}">₹${formatInrNumber(price)} + 18% GST</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

function modeRow(num: string, title: string, body: string) {
  return `<tr>
    <td valign="top" width="36" style="padding:0 0 16px">
      <div style="width:28px;height:28px;border-radius:14px;background:${NAVY};color:#ffffff;font-family:${FONT};font-size:13px;font-weight:700;line-height:28px;text-align:center">${num}</div>
    </td>
    <td valign="top" style="padding:2px 0 16px 10px;font-family:${FONT};font-size:14px;line-height:1.6;color:${INK}">
      <strong>${esc(title)}</strong>
      <div style="margin-top:4px;color:${MUTED}">${body}</div>
    </td>
  </tr>`;
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
  const filledBody = fill(templateBody, vars);
  const stateLabel = options.stateName ? ` (${options.stateName})` : "";

  const why = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${WHY_CHOOSE_US.map(whyRow).join("")}</table>`;

  const promises = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>${promiseCell(BRAND_PROMISES[0].title, BRAND_PROMISES[0].body)}${promiseCell(BRAND_PROMISES[1].title, BRAND_PROMISES[1].body)}</tr>
    <tr>${promiseCell(BRAND_PROMISES[2].title, BRAND_PROMISES[2].body)}${promiseCell(BRAND_PROMISES[3].title, BRAND_PROMISES[3].body)}</tr>
  </table>`;

  const spaceCards = spaces.map((space, i) => spaceCard(space, i)).join("");
  const caBlock = caRows.length
    ? `${heading("Optional Service - CA (one-time cost)")}
      ${para("We have our in-house specialized CA team to assist with your registration service.")}
      ${caRows.map((s) => caCard(s.name, s.description, s.price)).join("")}`
    : "";

  const uses = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${VO_USES.map(
      (item) => `<tr>
        <td valign="top" width="16" style="padding:0 0 8px;color:${GREEN};font-family:${FONT};font-size:14px">▸</td>
        <td style="padding:0 0 8px;font-family:${FONT};font-size:14px;line-height:1.5;color:${INK}">${esc(item)}</td>
      </tr>`,
    ).join("")}
  </table>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(fill(templateSubject, vars))}</title>
</head>
<body style="margin:0;padding:0;background:${PAGE}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">Your virtual office quotation from VOspaces — 11-month pricing including 18% GST.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE}">
    <tr>
      <td align="center" style="padding:28px 12px">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden">
          <tr>
            <td style="height:6px;background:${GREEN};font-size:0;line-height:6px">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 36px 8px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td><img src="${LOGO}" alt="VOspaces" width="148" style="display:block;border:0;height:auto"></td>
                  <td align="right" valign="middle">
                    <span style="display:inline-block;padding:6px 10px;border-radius:999px;background:${SOFT};font-family:${FONT};font-size:11px;letter-spacing:0.6px;text-transform:uppercase;color:${GREEN};font-weight:700">Quotation</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 36px 40px">
              ${introHtml(filledBody)}
              ${para(`<strong>${esc(greeting)}</strong>`)}
              ${para("We are delighted to introduce <strong>VOspaces</strong>, your trusted partner for Virtual Office Solutions across India. We take pride in helping businesses establish a professional presence while optimizing costs.")}
              ${heading("Why Choose Us?")}
              ${why}
              ${heading("Our Brand Promises")}
              ${promises}
              ${heading(`Options & Pricing for Virtual Office${stateLabel}`)}
              ${para(`<span style="color:${MUTED};font-size:13px">${esc(voPlanLabel(options.planKind))} · 11-month pricing. Total payable includes 18% GST. Each row is an option — the client picks one location.</span>`)}
              ${spaceCards || para("Select one or more locations to fill this table.")}
              ${caBlock}
              ${heading("Virtual Office Address can be used for the following purposes:")}
              ${para("<strong>Business Registration Plan</strong>")}
              ${uses}
              ${heading("Booking Process")}
              ${para("As a next step if you want to proceed with the booking, we would request you to process the payment to confirm virtual office booking. The payment can be made through the below given modes.")}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">
                ${modeRow("1", "Mode 1", "Book from the website directly — Select the virtual office link from the above options based on your preferred location.")}
                ${modeRow(
                  "2",
                  "Mode 2",
                  `Payment Link for Virtual Office — <a href="${BANK.paymentLink}" style="color:${GREEN};font-weight:700;text-decoration:none">${BANK.paymentLink}</a> (Please enter the total payable amount and make the payment). The payable amount is mentioned above.${button(BANK.paymentLink, "Pay now")}`,
                )}
                ${modeRow(
                  "3",
                  "Mode 3: Bank Transfer",
                  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;background:${SOFT};border-radius:12px">
                    <tr><td style="padding:14px 16px;font-family:${FONT};font-size:13px;line-height:1.7;color:${INK}">
                      A/c Name: <strong>${BANK.name}</strong><br>
                      A/c No: <strong>${BANK.account}</strong><br>
                      A/c Type: ${BANK.type}<br>
                      IFSC: <strong>${BANK.ifsc}</strong>
                    </td></tr>
                  </table>`,
                )}
                ${modeRow("4", "Mode 4", "Scan and Pay")}
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:${NAVY};padding:22px 36px">
              <p style="margin:0;font-family:${FONT};font-size:13px;color:#c5d4ce">VOspaces · Virtual Office Solutions across India</p>
              <p style="margin:8px 0 0;font-family:${FONT};font-size:12px;color:#8aa39a">If you have questions, reply to this email and your salesperson will help.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

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
