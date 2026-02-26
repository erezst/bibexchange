import { SupabaseClient } from "@supabase/supabase-js";
import { clearMatchFromQueues } from "@/lib/match/helpers";
import { renderEmail } from "@/lib/email/render";
import { getBuyerEmail, getSellerEmail } from "@/lib/users";

const COOLDOWN_HOURS = 72;

function addHours(isoNow: string, hours: number) {
  const d = new Date(isoNow);
  return new Date(d.getTime() + hours * 3600 * 1000).toISOString();
}

export async function expirePendingMatches(sb: SupabaseClient) {
  const nowIso = new Date().toISOString();

  let staleCount = 0;
  let autoCompletedCount = 0;

  // 1) active_intro expired -> stale_unconfirmed
  {
    const { data: stale, error } = await sb
      .from("matches")
      .select("id,event_id,buyer_queue_id,seller_id")
      .eq("status", "active_intro")
      .not("intro_deadline_at", "is", null)
      .lte("intro_deadline_at", nowIso);

    if (error) throw error;

    for (const m of stale ?? []) {
      // Move match to stale only if still active_intro
      const { error: upErr } = await sb
        .from("matches")
        .update({ status: "stale_unconfirmed" })
        .eq("id", m.id)
        .eq("status", "active_intro");

      if (upErr) continue;

      // Buyer -> paused (+ cooldown)
      await sb
        .from("buyer_queue")
        .update({
          status: "paused",
          match_id: null,
          cooldown_until: addHours(nowIso, COOLDOWN_HOURS),
        })
        .eq("id", m.buyer_queue_id)
        .eq("match_id", m.id);

      // Seller -> waiting (+ cooldown) or optionally add a paused state for sellers later
      await sb
        .from("sellers")
        .update({
          status: "waiting",
          match_id: null,
          cooldown_until: addHours(nowIso, COOLDOWN_HOURS),
        })
        .eq("id", m.seller_id)
        .eq("match_id", m.id);

      // notify both (best-effort)
      const { data: ev } = await sb
        .from("events")
        .select("name,distance_label")
        .eq("id", m.event_id)
        .maybeSingle();

      const eventName = `${ev?.name ?? "Event"} - ${ev?.distance_label ?? ""}`.trim();

      const buyerEmail = await getBuyerEmail(sb, m.buyer_queue_id);
      const sellerEmail = await getSellerEmail(sb, m.seller_id);

      if (buyerEmail) {
        const { subject, html, text } = renderEmail({
          type: "notify_stale_unconfirmed",
          matchId: m.id,
          toRole: "buyer",
          eventName,
        });
        await sb.from("email_outbox").insert({
          email_type: "notify_stale_unconfirmed",
          match_id: m.id,
          to_email: buyerEmail,
          to_name: null,
          subject,
          html,
          text,
        });
      }

      if (sellerEmail) {
        const { subject, html, text } = renderEmail({
          type: "notify_stale_unconfirmed",
          matchId: m.id,
          toRole: "seller",
          eventName,
        });
        await sb.from("email_outbox").insert({
          email_type: "notify_stale_unconfirmed",
          match_id: m.id,
          to_email: sellerEmail,
          to_name: null,
          subject,
          html,
          text,
        });
      }

      staleCount += 1;
    }
  }

  // 2) seller_transferred expired -> auto-complete (assume buyer confirmed)
  {
    const { data: overdue, error } = await sb
      .from("matches")
      .select("id,event_id,buyer_queue_id,seller_id")
      .eq("status", "seller_transferred")
      .not("buyer_confirm_deadline_at", "is", null)
      .lte("buyer_confirm_deadline_at", nowIso);

    if (error) throw error;

    for (const m of overdue ?? []) {
      const { error: upErr } = await sb
        .from("matches")
        .update({
          status: "completed",
          buyer_confirmed_at: nowIso,
        })
        .eq("id", m.id)
        .eq("status", "seller_transferred");

      if (upErr) continue;

      // finalize queues
      await clearMatchFromQueues(sb, m.buyer_queue_id, m.seller_id, "confirmed", "confirmed");

      // notify both (best-effort)
      const { data: ev } = await sb
        .from("events")
        .select("name,distance_label")
        .eq("id", m.event_id)
        .maybeSingle();

      const eventName = `${ev?.name ?? "Event"} - ${ev?.distance_label ?? ""}`.trim();

      const buyerEmail = await getBuyerEmail(sb, m.buyer_queue_id);
      const sellerEmail = await getSellerEmail(sb, m.seller_id);

      if (buyerEmail) {
        const { subject, html, text } = renderEmail({
          type: "notify_auto_completed",
          matchId: m.id,
          toRole: "buyer",
          eventName,
        });
        await sb.from("email_outbox").insert({
          email_type: "notify_auto_completed",
          match_id: m.id,
          to_email: buyerEmail,
          to_name: null,
          subject,
          html,
          text,
        });
      }

      if (sellerEmail) {
        const { subject, html, text } = renderEmail({
          type: "notify_auto_completed",
          matchId: m.id,
          toRole: "seller",
          eventName,
        });
        await sb.from("email_outbox").insert({
          email_type: "notify_auto_completed",
          match_id: m.id,
          to_email: sellerEmail,
          to_name: null,
          subject,
          html,
          text,
        });
      }

      autoCompletedCount += 1;
    }
  }

  return { staleUnconfirmed: staleCount, autoCompleted: autoCompletedCount, nowIso };
}
