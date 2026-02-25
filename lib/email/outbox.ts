import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendViaBrevo } from "@/lib/email/sendBrevo";

const SENDER_EMAIL = "noreply@bibexchange.xyz"; // set up in Brevo (or use a verified sender)
const SENDER_NAME = "BIB Exchange";

export async function sendOutboxBatch(limit = 20) {
  const sb = supabaseAdmin();

  // Pull a batch ready to send
  const { data: rows, error } = await sb
    .from("email_outbox")
    .select("*")
    .eq("status", "queued")
    .lte("send_after", new Date().toISOString())
    .order("id", { ascending: true })
    .limit(limit);

  if (error) throw error;
  if (!rows || rows.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const r of rows) {
    // best-effort claim row
    const { data: claimed, error: claimErr } = await sb
      .from("email_outbox")
      .update({ status: "sending", attempts: (r.attempts ?? 0) + 1 })
      .eq("id", r.id)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();

    if (claimErr) continue;
    if (!claimed) continue;

    try {
      await sendViaBrevo({
        to: [{ email: r.to_email, name: r.to_name ?? undefined }],
        sender: { email: SENDER_EMAIL, name: SENDER_NAME },
        subject: r.subject,
        htmlContent: r.html,
        textContent: r.text,
      });

      await sb.from("email_outbox").update({ status: "sent", last_error: null }).eq("id", r.id);
      sent += 1;
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      // retry later with simple backoff (10m * attempts)
      const attempts = (r.attempts ?? 0) + 1;
      const sendAfter = new Date(Date.now() + Math.min(6, attempts) * 10 * 60 * 1000).toISOString();

      await sb
        .from("email_outbox")
        .update({ status: "failed", last_error: msg, send_after: sendAfter })
        .eq("id", r.id);

      // optionally flip back to queued for retries:
      await sb.from("email_outbox").update({ status: "queued" }).eq("id", r.id);

      failed += 1;
    }
  }

  return { sent, failed };
}
