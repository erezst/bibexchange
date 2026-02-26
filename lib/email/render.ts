import { buildActionUrl, signAction } from "@/lib/actionLinks";

type RenderArgs = {
  type:
    | "intro_seller"
    | "intro_buyer"
    | "buyer_confirm_reminder"
    | "notify_seller_cancelled"
    | "notify_buyer_cancelled"
    | "notify_stale_unconfirmed"
    | "notify_disputed_not_received"
    | "notify_auto_completed"
    | "completed";
  matchId: number;
  toRole: "seller" | "buyer";
  eventName: string;
  counterpartyEmail?: string;
  expiresAtIso?: string; // relevant deadline (intro deadline, buyer confirm deadline, etc.)
  note?: string; // optional extra message
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
  const { type, matchId, toRole, counterpartyEmail, expiresAtIso, eventName, note } = args;

  // Action links expire after 7 days (independent from match deadlines)
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;

  const safeEvent = escapeHtml(eventName || "Your event");
  const safeCounterparty = escapeHtml(counterpartyEmail ?? "N/A");
  const expiresHuman = formatExpiryUtc(expiresAtIso);

  const subjectMap: Record<RenderArgs["type"], string> = {
    intro_seller: `Bib Exchange — matched (${eventName})`,
    intro_buyer: `Bib Exchange — matched (${eventName})`,
    buyer_confirm_reminder: `Bib Exchange — confirmation required (${eventName})`,
    notify_seller_cancelled: `Bib Exchange — seller cancelled (${eventName})`,
    notify_buyer_cancelled: `Bib Exchange — buyer cancelled (${eventName})`,
    notify_stale_unconfirmed: `Bib Exchange — match expired (${eventName})`,
    notify_disputed_not_received: `Bib Exchange — reported not received (${eventName})`,
    notify_auto_completed: `Bib Exchange — auto-completed (${eventName})`,
    completed: `Bib Exchange — completed (${eventName})`,
  };

  const subject = subjectMap[type];

  const actionLink = (path: string, action: any, roleOverride?: "seller" | "buyer") => {
    const token = signAction({
      v: 1,
      match_id: matchId,
      role: roleOverride ?? toRole,
      action,
      exp,
    });
    return buildActionUrl(path, token);
  };

  const button = (label: string, url: string, variant: "primary" | "secondary" = "primary") => {
    const bg = variant === "primary" ? "#2563EB" : "#FFFFFF";
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
    header: "padding:18px 22px;border-bottom:1px solid #E5E7EB;background:#0B1220;",
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
    warn:
      "margin:12px 0 0;padding:10px 12px;border-radius:12px;background:#FFFBEB;border:1px solid #FDE68A;color:#92400E;font-size:13px;",
  };

  const preheader = (() => {
    if (type === "intro_seller" || type === "intro_buyer") {
      return `You’ve been matched for ${eventName}. Follow the steps to complete the official bib transfer.`;
    }
    if (type === "buyer_confirm_reminder") {
      return `Seller marked transfer complete. Please confirm receipt within 24 hours.`;
    }
    if (type === "notify_seller_cancelled") return `Seller cancelled. You’re back in the queue for ${eventName}.`;
    if (type === "notify_buyer_cancelled") return `Buyer cancelled. You will be matched with the next buyer.`;
    if (type === "notify_stale_unconfirmed") return `Match expired due to no confirmation.`;
    if (type === "notify_disputed_not_received") return `A “not received” report was filed for ${eventName}.`;
    if (type === "notify_auto_completed") return `Match auto-completed after buyer confirmation window elapsed.`;
    return `Update for ${eventName}.`;
  })();

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

  if (type === "intro_seller") {
    const cancelUrl = actionLink("/api/action/seller/cancel", "seller_cancel", "seller");
    const transferredUrl = actionLink("/api/action/seller/transferred", "seller_transferred", "seller");

    html += `
      <h3 style="${styles.h3}">You’re matched — next steps</h3>
      <p style="${styles.pMuted}">
        You’ve been matched for <b>${safeEvent}</b>. Complete the official transfer with the organizer.
      </p>

      <div style="${styles.card}">
        <p style="${styles.label}">Buyer email</p>
        <p style="${styles.value}"><b>${safeCounterparty}</b></p>
      </div>

      <div style="${styles.card}">
        <p style="${styles.label}">Deadline</p>
        <p style="${styles.value}"><b>You have 24 hours to complete and confirm.</b></p>
        ${expiresHuman ? `<p style="${styles.note}">Deadline: <b>${escapeHtml(expiresHuman)}</b>.</p>` : ""}
      </div>

      <div style="${styles.card}">
        <p style="${styles.label}">What to do</p>
        <ol style="margin:0;padding-left:18px;">
          <li style="${styles.li}">Email the buyer to coordinate timing and required details.</li>
          <li style="${styles.li}">Complete the organizer’s official bib transfer process.</li>
          <li style="${styles.li}">After the transfer is completed, click “Transferred”.</li>
        </ol>
      </div>

      ${button("Transferred", transferredUrl, "primary")}
      ${button("Cancel listing", cancelUrl, "secondary")}

      ${
        note
          ? `<div style="${styles.warn}">${escapeHtml(note)}</div>`
          : `<p style="${styles.note}">Cancel listing only if you cannot proceed. If you cancel, your listing will be removed.</p>`
      }
    `;

    text += `You’re matched for ${eventName}.\n`;
    text += `Buyer email: ${counterpartyEmail ?? "N/A"}\n\n`;
    text += `Deadline: 24 hours.\n`;
    if (expiresHuman) text += `Deadline time: ${expiresHuman}\n`;
    text += `\nTransferred: ${transferredUrl}\nCancel listing: ${cancelUrl}\n`;
  }

  if (type === "intro_buyer") {
    const cancelUrl = actionLink("/api/action/buyer/cancel", "buyer_cancel", "buyer");
    const receivedUrl = actionLink("/api/action/buyer/received", "buyer_received", "buyer");

    html += `
      <h3 style="${styles.h3}">You’re matched — next steps</h3>
      <p style="${styles.pMuted}">
        You’ve been matched for <b>${safeEvent}</b>. Complete the official transfer with the organizer.
      </p>

      <div style="${styles.card}">
        <p style="${styles.label}">Seller email</p>
        <p style="${styles.value}"><b>${safeCounterparty}</b></p>
      </div>

      <div style="${styles.card}">
        <p style="${styles.label}">Deadline</p>
        <p style="${styles.value}"><b>You have 24 hours to complete and confirm.</b></p>
        ${expiresHuman ? `<p style="${styles.note}">Deadline: <b>${escapeHtml(expiresHuman)}</b>.</p>` : ""}
      </div>

      <div style="${styles.card}">
        <p style="${styles.label}">What to do</p>
        <ol style="margin:0;padding-left:18px;">
          <li style="${styles.li}">Email the seller to coordinate timing and required details.</li>
          <li style="${styles.li}">Complete the organizer’s official bib transfer process.</li>
          <li style="${styles.li}">When the bib appears in your account/name, click “Received”.</li>
        </ol>
        <p style="${styles.note}">
          You can cancel only before the seller confirms the transfer. If you cancel, you’ll be paused until you resume.
        </p>
      </div>

      ${button("Received", receivedUrl, "primary")}
      ${button("Cancel", cancelUrl, "secondary")}

      ${note ? `<div style="${styles.warn}">${escapeHtml(note)}</div>` : ""}
    `;

    text += `You’re matched for ${eventName}.\n`;
    text += `Seller email: ${counterpartyEmail ?? "N/A"}\n\n`;
    text += `Deadline: 24 hours.\n`;
    if (expiresHuman) text += `Deadline time: ${expiresHuman}\n`;
    text += `\nReceived: ${receivedUrl}\nCancel (before seller transferred): ${cancelUrl}\n`;
  }

  if (type === "buyer_confirm_reminder") {
    const receivedUrl = actionLink("/api/action/buyer/received", "buyer_received", "buyer");
    const notReceivedUrl = actionLink("/api/action/buyer/not-received", "buyer_not_received", "buyer");

    html += `
      <h3 style="${styles.h3}">Confirmation required</h3>
      <p style="${styles.pMuted}">
        The seller marked the transfer as completed for <b>${safeEvent}</b>.
        Please confirm receipt.
      </p>

      <div style="${styles.card}">
        <p style="${styles.label}">Seller email</p>
        <p style="${styles.value}"><b>${safeCounterparty}</b></p>
      </div>

      <div style="${styles.card}">
        <p style="${styles.label}">Confirmation window</p>
        <p style="${styles.value}"><b>Please confirm within 24 hours.</b></p>
        ${expiresHuman ? `<p style="${styles.note}">Deadline: <b>${escapeHtml(expiresHuman)}</b>.</p>` : ""}
        <p style="${styles.note}">If you don’t confirm by the deadline, the exchange will be auto-completed.</p>
      </div>

      ${button("Received", receivedUrl, "primary")}
      ${button("Not received", notReceivedUrl, "secondary")}

      ${note ? `<div style="${styles.warn}">${escapeHtml(note)}</div>` : ""}
    `;

    text += `Seller marked transfer completed for ${eventName}.\n`;
    text += `Seller email: ${counterpartyEmail ?? "N/A"}\n\n`;
    text += `Please confirm within 24 hours.\n`;
    if (expiresHuman) text += `Deadline time: ${expiresHuman}\n`;
    text += `\nReceived: ${receivedUrl}\nNot received: ${notReceivedUrl}\n`;
  }

  if (type === "notify_seller_cancelled") {
    html += `
      <h3 style="${styles.h3}">Seller cancelled</h3>
      <p style="${styles.pMuted}">
        The seller backed out for <b>${safeEvent}</b>. You’re back in the queue.
      </p>
      ${note ? `<div style="${styles.warn}">${escapeHtml(note)}</div>` : ""}
    `;
    text += `Seller cancelled for ${eventName}. You’re back in the queue.\n`;
  }

  if (type === "notify_buyer_cancelled") {
    html += `
      <h3 style="${styles.h3}">Buyer cancelled</h3>
      <p style="${styles.pMuted}">
        The buyer cancelled for <b>${safeEvent}</b>. You’ll be matched with the next buyer.
      </p>
      ${note ? `<div style="${styles.warn}">${escapeHtml(note)}</div>` : ""}
    `;
    text += `Buyer cancelled for ${eventName}. You’ll be matched with the next buyer.\n`;
  }

  if (type === "notify_stale_unconfirmed") {
    html += `
      <h3 style="${styles.h3}">Match expired</h3>
      <p style="${styles.pMuted}">
        This match for <b>${safeEvent}</b> expired because neither side confirmed within the required time.
      </p>
      ${note ? `<div style="${styles.warn}">${escapeHtml(note)}</div>` : ""}
    `;
    text += `Match expired for ${eventName} due to no confirmation.\n`;
  }

  if (type === "notify_disputed_not_received") {
    html += `
      <h3 style="${styles.h3}">Not received reported</h3>
      <p style="${styles.pMuted}">
        A “not received” report was filed for <b>${safeEvent}</b>. This match is now closed.
      </p>
      ${note ? `<div style="${styles.warn}">${escapeHtml(note)}</div>` : ""}
    `;
    text += `A “not received” report was filed for ${eventName}. This match is now closed.\n`;
  }

  if (type === "notify_auto_completed") {
    html += `
      <h3 style="${styles.h3}">Auto-completed</h3>
      <p style="${styles.pMuted}">
        This exchange for <b>${safeEvent}</b> was auto-completed because the buyer did not confirm in time after the seller marked transfer complete.
      </p>
      ${note ? `<div style="${styles.warn}">${escapeHtml(note)}</div>` : ""}
    `;
    text += `Auto-completed: ${eventName}\n`;
  }

  if (type === "completed") {
    html += `
      <h3 style="${styles.h3}">Completed</h3>
      <p style="${styles.pMuted}">
        This exchange for <b>${safeEvent}</b> is now marked completed.
      </p>
      ${note ? `<div style="${styles.warn}">${escapeHtml(note)}</div>` : ""}
    `;
    text += `Completed: ${eventName}\n`;
  }

  html += htmlEnd;

  return { subject, html, text };
}
