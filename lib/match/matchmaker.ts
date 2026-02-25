import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { renderEmail } from "@/lib/email/render";
import { getSellerEmail } from "@/lib/users";

const SELLER_WINDOW_HOURS = 24;
const BUYER_WINDOW_HOURS = 24;

export async function runMatchmakerOncePerEvent() {
  const sb = supabaseAdmin();

  const { data: events, error: evErr } = await sb
    .from("events")
    .select("id,name,distance_label")
    .eq("is_open", true);

  if (evErr) throw evErr;

  let created = 0;

  for (const ev of events ?? []) {
    // pick earliest waiting buyer and seller that are not currently matched
    const { data: buyer } = await sb
      .from("buyer_queue")
      .select("id,user_id,event_id")
      .eq("event_id", ev.id)
      .eq("status", "waiting")
      .is("match_id", null)
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: seller } = await sb
      .from("sellers")
      .select("id,user_id,event_id")
      .eq("event_id", ev.id)
      .eq("status", "waiting")
      .is("match_id", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!buyer || !seller) continue;

    const now = new Date();
    const sellerExpires = new Date(now.getTime() + SELLER_WINDOW_HOURS * 3600 * 1000);
    const buyerExpires = new Date(now.getTime() + (SELLER_WINDOW_HOURS + BUYER_WINDOW_HOURS) * 3600 * 1000);

    // Create match
    const { data: match, error: mErr } = await sb
      .from("matches")
      .insert({
        event_id: ev.id,
        buyer_queue_id: buyer.id,
        seller_id: seller.id,
        expires_at: buyerExpires.toISOString(),          // keep legacy field as “overall”
        seller_expires_at: sellerExpires.toISOString(),
        buyer_expires_at: null,                         // set after seller accepts
        status: "proposed_to_seller",
      })
      .select("id")
      .single();

    if (mErr) throw mErr;

    // Attach match_id to queue entries + mark matched
    const { error: bErr } = await sb
      .from("buyer_queue")
      .update({ match_id: match.id, status: "matched" })
      .eq("id", buyer.id)
      .is("match_id", null);

    const { error: sErr } = await sb
      .from("sellers")
      .update({ match_id: match.id, status: "matched" })
      .eq("id", seller.id)
      .is("match_id", null);

    // If one update failed, cancel match to avoid dangling
    if (bErr || sErr) {
      await sb.from("matches").update({ status: "failed" }).eq("id", match.id);
      continue;
    }

    const sellerEmail = await getSellerEmail(sb, seller.id);
    if (!sellerEmail) {
      await sb.from("matches").update({ status: "failed" }).eq("id", match.id);

      // rollback the queue entries so the system can retry later
      await sb.from("buyer_queue").update({ match_id: null, status: "waiting" }).eq("id", buyer.id);
      await sb.from("sellers").update({ match_id: null, status: "waiting" }).eq("id", seller.id);

      continue;
    }

    const { subject, html, text } = renderEmail({
      type: "seller_proposal",
      matchId: match.id,
      toRole: "seller",
      expiresAtIso: sellerExpires.toISOString(),
      eventName: `${ev.name} - ${ev.distance_label}`,
    });

    await sb.from("email_outbox").insert({
      email_type: "seller_proposal",
      match_id: match.id,
      to_email: sellerEmail,
      to_name: null,
      subject,
      html,
      text,
    });

    created += 1;
  }

  return { created };
}
