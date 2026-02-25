import { buildActionUrl, signAction } from "@/lib/actionLinks";

type RenderArgs = {
  type: "seller_proposal" | "buyer_confirmation" | "intro" | "completed";
  matchId: number;
  toRole: "seller" | "buyer";
  eventName: string;
  counterpartyEmail?: string;
  expiresAtIso?: string;
};

function escapeHtml(s: string) {
  return (s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatExpiryUtc(expiresAtIso?: string) {
  if (!expiresAtIso) return "";
  const d = new Date(expiresAtIso);
  if (Number.isNaN(d.getTime())) return expiresAtIso;

  // e.g. "Thu, 26 Feb 2026, 07:43 UTC"
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(d);
}

export function renderEmail(args: RenderArgs) {
  const { type, matchId, toRole, counterpartyEmail, expiresAtIso, eventName } = args;

  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;

  const safeEvent = escapeHtml(eventName || "Your event");
  const safeCounterparty = escapeHtml(counterpartyEmail ?? "N/A");
  const expiresHuman = formatExpiryUtc(expiresAtIso);

  const subjectMap: Record<RenderArgs["type"], string> = {
    seller_proposal: `Bib Exchange — buyer waiting (${eventName})`,
    buyer_confirmation: `Bib Exchange — seller available (${eventName})`,
    intro: `Bib Exchange — matched (${eventName})`,
    completed: `Bib Exchange — completed (${eventName})`,
  };

  const subject = subjectMap[type];

  const actionLink = (path: string, action: any) => {
    const token = signAction({ v: 1, match_id: matchId, role: toRole, action, exp });
    return buildActionUrl(path, token);
  };

  const button = (label: string, url: string, variant: "primary" | "secondary" = "primary") => {
    // Blue primary CTA (works well in Gmail)
    const bg = variant === "primary" ? "#2563EB" : "#FFFFFF"; // blue-600
    const fg = variant === "primary" ? "#FFFFFF" : "#111111";
    const brd = variant === "primary" ? "#2563EB" : "#E5E7EB";
    return `
      <a href="${url}"
         style="display:inline-block;padding:12px 18px;border-radius:12px;background:${bg};color:${fg};
                border:1px solid ${brd};text-decoration:none;font-weight:800;font-size:14px;line-height:1;
                margin-right:10px;margin-bottom:10px;">
        ${escapeHtml(label)}
      </a>
    `;
  };

  const styles = {
    body: "margin:0;padding:0;background:#F6F7F9;",
    wrap: "width:100%;background:#F6F7F9;padding:24px 0;",
    container:
      "max-width:640px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;overflow:hidden;",
    // Banner header (sticks out)
    header:
      "padding:18px 22px;border-bottom:1px solid #E5E7EB;background:#0B1220;",
    brandRow: "margin:0;",
    brand:
      "margin:0;font-family:Arial,sans-serif;font-size:18px;line-height:1.25;color:#FFFFFF;font-weight:900;letter-spacing:0.2px;",
    tagline:
      "margin:6px 0 0;font-family:Arial,sans-serif;font-size:13px;line-height:1.45;color:#C7D2FE;",
    eventPillWrap: "padding:14px 22px 0;background:#FFFFFF;",
    eventPill:
      "display:inline-block;padding:8px 12px;border-radius:999px;background:#EFF6FF;border:1px solid #DBEAFE;color:#1E3A8A;font-family:Arial,sans-serif;font-size:13px;font-weight:800;",
    content: "padding:18px 22px;font-family:Arial,sans-serif;color:#111;line-height:1.5;",
    h3: "margin:0 0 8px;font-size:18px;font-weight:900;",
    pMuted: "margin:0 0 12px;color:#374151;",
    card:
      "background:#FFFFFF;border:1px solid #E5E7EB;border-radius:14px;padding:14px 14px;margin:14px 0;",
    label: "font-size:12px;color:#6B7280;margin:0 0 6px;",
    value: "font-size:14px;color:#111;margin:0;",
    hr: "height:1px;border:0;background:#E5E7EB;margin:18px 0;",
    footer:
      "padding:16px 22px;border-top:1px solid #E5E7EB;background:#FFFFFF;font-family:Arial,sans-serif;color:#6B7280;font-size:12px;line-height:1.4;",
    li: "margin:6px 0;color:#111;font-size:14px;",
    note: "margin:10px 0 0;color:#4B5563;font-size:13px;",
  };

  const preheader =
    type === "intro"
      ? `You’re matched for ${eventName}. Follow the steps to complete the official bib transfer.`
      : type === "seller_proposal"
        ? `A buyer is waiting for ${eventName}. You have 24 hours to respond.`
        : type === "buyer_confirmation"
          ? `A seller is available for ${eventName}. You have 24 hours to respond.`
          : `Match completed for ${eventName}.`;

  const htmlStart = `
  <div style="${styles.body}">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;">
      ${escapeHtml(preheader)}
    </div>
    <div style="${styles.wrap}">
      <div style="${styles.container}">
        <div style="${styles.header}">
          <p style="${styles.brandRow}">
            <span style="${styles.brand}">BIB Exchange</span>
          </p>
          <p style="${styles.tagline}">Fair, orderly bib transfers — with clear next steps.</p>
        </div>

        <!-- Event pill (banner-like, but not repeated in the header text) -->
        <div style="${styles.eventPillWrap}">
          <span style="${styles.eventPill}">${safeEvent}</span>
        </div>

        <div style="${styles.content}">
  `;

  const htmlEnd = `
        </div>
        <div style="${styles.footer}">
          You’re receiving this because you joined a queue on BIB Exchange for <b>${safeEvent}</b>.<br/>
          If a button doesn’t work, copy/paste the link into your browser.
        </div>
      </div>
    </div>
  </div>
  `;

  let text = `BIB Exchange\n${eventName}\n\n`;
  let html = htmlStart;

  if (type === "seller_proposal") {
    const acceptUrl = actionLink("/api/action/seller/accept", "seller_accept");
    const passUrl = actionLink("/api/action/seller/pass", "seller_pass");

    html += `
      <h3 style="${styles.h3}">A buyer is waiting</h3>
      <p style="${styles.pMuted}">You have the next spot in line for <b>${safeEvent}</b>.</p>

      <div style="${styles.card}">
        <p style="${styles.label}">Response window</p>
        <p style="${styles.value}"><b>You have 24 hours to confirm.</b></p>
        ${expiresHuman ? `<p style="${styles.note}">Expires on <b>${escapeHtml(expiresHuman)}</b>.</p>` : ""}
      </div>

      <p style="margin:0 0 10px;font-weight:900;">What to do now</p>
      <p style="${styles.pMuted}">Accept if you can complete the official transfer soon. Pass if you can’t.</p>

      ${button("Accept", acceptUrl, "primary")}
      ${button("Pass", passUrl, "secondary")}

      <div style="${styles.hr}"></div>
      <p style="${styles.note}">
        If you accept, both sides will receive an intro email with the counterparty contact and next steps.
      </p>
    `;

    text += `A buyer is waiting for ${eventName}.\n`;
    text += `You have 24 hours to confirm.\n`;
    if (expiresHuman) text += `Expires on ${expiresHuman}.\n`;
    text += `\nAccept: ${acceptUrl}\nPass: ${passUrl}\n`;
  }

  if (type === "buyer_confirmation") {
    const confirmUrl = actionLink("/api/action/buyer/confirm", "buyer_confirm");
    const passUrl = actionLink("/api/action/buyer/pass", "buyer_pass");

    html += `
      <h3 style="${styles.h3}">A seller is available</h3>
      <p style="${styles.pMuted}">You’re next in line for <b>${safeEvent}</b>.</p>

      <div style="${styles.card}">
        <p style="${styles.label}">Response window</p>
        <p style="${styles.value}"><b>You have 24 hours to confirm.</b></p>
        ${expiresHuman ? `<p style="${styles.note}">Expires on <b>${escapeHtml(expiresHuman)}</b>.</p>` : ""}
      </div>

      <p style="margin:0 0 10px;font-weight:900;">What to do now</p>
      <p style="${styles.pMuted}">Confirm if you’re ready to coordinate the official transfer. Pass if not.</p>

      ${button("Confirm", confirmUrl, "primary")}
      ${button("Pass", passUrl, "secondary")}

      <div style="${styles.hr}"></div>
      <p style="${styles.note}">
        After you confirm, you’ll receive an intro email with the counterparty contact and next steps.
      </p>
    `;

    text += `A seller is available for ${eventName}.\n`;
    text += `You have 24 hours to confirm.\n`;
    if (expiresHuman) text += `Expires on ${expiresHuman}.\n`;
    text += `\nConfirm: ${confirmUrl}\nPass: ${passUrl}\n`;
  }

  if (type === "intro") {
    const sellerDoneUrl = actionLink("/api/action/seller/transfer-complete", "seller_transfer_complete");
    const buyerDoneUrl = actionLink("/api/action/buyer/received", "buyer_received");

    const doneLabel = toRole === "seller" ? "Transfer completed" : "Received bib";
    const doneUrl = toRole === "seller" ? sellerDoneUrl : buyerDoneUrl;

    html += `
      <h3 style="${styles.h3}">You’re matched — next steps</h3>
      <p style="${styles.pMuted}">
        Buyer and seller both accepted for <b>${safeEvent}</b>. Now complete the official transfer with the race organizer.
      </p>

      <div style="${styles.card}">
        <p style="${styles.label}">Counterparty email</p>
        <p style="${styles.value}"><b>${safeCounterparty}</b></p>
      </div>

      <div style="${styles.card}">
        <p style="${styles.label}">Do this now</p>
        <ol style="margin:0;padding-left:18px;">
          <li style="${styles.li}">Email the counterparty to coordinate timing and required details.</li>
          <li style="${styles.li}">Complete the organizer’s official bib transfer process.</li>
          <li style="${styles.li}">When the transfer is done, click the button below.</li>
        </ol>
        <p style="${styles.note}">
          ${
            toRole === "seller"
              ? "Seller: click only after you have completed the transfer on the organizer side."
              : "Buyer: click only after the bib shows in your name/account."
          }
        </p>
      </div>

      ${button(doneLabel, doneUrl, "primary")}

      <div style="${styles.hr}"></div>
      <p style="${styles.note}">
        Keeping this fair: please proceed promptly, and only click “done” when the official transfer is complete.
      </p>
    `;

    text += `You’re matched for ${eventName}.\n`;
    text += `Counterparty: ${counterpartyEmail ?? "N/A"}\n\n`;
    text += `Next steps:\n`;
    text += `1) Email each other to coordinate\n`;
    text += `2) Complete the official organizer transfer process\n`;
    text += `3) When done, click: ${doneUrl}\n`;
  }

  if (type === "completed") {
    html += `
      <h3 style="${styles.h3}">Match marked completed</h3>
      <p style="${styles.pMuted}">
        Thanks — this exchange for <b>${safeEvent}</b> is now marked completed.
      </p>
      <div style="${styles.hr}"></div>
      <p style="${styles.note}">
        If something went wrong, reply to this email and include the event name above.
      </p>
    `;

    text += `Completed: ${eventName}\n`;
  }

  html += htmlEnd;

  return { subject, html, text };
}