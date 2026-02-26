import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { renderEmail } from "@/lib/email/render";
import { getBuyerEmail, getSellerEmail } from "@/lib/users";

const INTRO_WINDOW_HOURS = 24;

// Safety caps so one tick doesn't run too long
const MAX_MATCHES_PER_EVENT_PER_TICK = 50;

// How many queue rows to scan each time to find a cooldown-eligible entry
const CANDIDATE_SCAN = 20;

type BuyerCandidate = {
  id: number;
  user_id: string;
  event_id: number;
  joined_at: string;
  cooldown_until: string | null;
};

type SellerCandidate = {
  id: number;
  user_id: string;
  event_id: number;
  created_at: string;
  cooldown_until: string | null;
};

function isCooldownOk(cooldownUntil: string | null, now: Date) {
  if (!cooldownUntil) return true;

  const d = new Date(cooldownUntil);
  if (Number.isNaN(d.getTime())) return true; // if bad data, don't block the system

  return d.getTime() <= now.getTime();
}

export async function runMatchmakerOncePerEvent() {
  const sb = supabaseAdmin();

  const { data: events, error: evErr } = await sb
    .from("events")
    .select("id,name,distance_label")
    .eq("is_open", true);

  if (evErr) throw evErr;

  let created = 0;

  for (const ev of events ?? []) {
    let madeForEvent = 0;

    while (madeForEvent < MAX_MATCHES_PER_EVENT_PER_TICK) {
      const now = new Date();

      // Scan buyers
      const { data: buyerCandidates, error: bListErr } = await sb
        .from("buyer_queue")
        .select("id,user_id,event_id,joined_at,cooldown_until")
        .eq("event_id", ev.id)
        .eq("status", "waiting")
        .is("match_id", null)
        .order("joined_at", { ascending: true })
        .limit(CANDIDATE_SCAN);

      if (bListErr) throw bListErr;

      const buyer = (buyerCandidates ?? []).find((b: any) =>
        isCooldownOk(
          (b as BuyerCandidate).cooldown_until ?? null,
          now
        )
      ) as BuyerCandidate | undefined;

      // Scan sellers
      const { data: sellerCandidates, error: sListErr } = await sb
        .from("sellers")
        .select("id,user_id,event_id,created_at,cooldown_until")
        .eq("event_id", ev.id)
        .eq("status", "waiting")
        .is("match_id", null)
        .order("created_at", { ascending: true })
        .limit(CANDIDATE_SCAN);

      if (sListErr) throw sListErr;

      const seller = (sellerCandidates ?? []).find((s: any) =>
        isCooldownOk(
          (s as SellerCandidate).cooldown_until ?? null,
          now
        )
      ) as SellerCandidate | undefined;

      if (!buyer || !seller) break;

      const introDeadline = new Date(
        now.getTime() + INTRO_WINDOW_HOURS * 3600 * 1000
      );

      // 1) Create match in active_intro
      const { data: match, error: mErr } = await sb
        .from("matches")
        .insert({
          event_id: ev.id,
          buyer_queue_id: buyer.id,
          seller_id: seller.id,
          matched_at: now.toISOString(),
          status: "active_intro",
          intro_deadline_at: introDeadline.toISOString(),
          seller_confirmed_at: null,
          buyer_confirmed_at: null,
          buyer_confirm_deadline_at: null,
        })
        .select("id")
        .single();

      if (mErr) throw mErr;

      // 2) Attach match_id to queue entries + mark matched
      const { error: bErr } = await sb
        .from("buyer_queue")
        .update({ match_id: match.id, status: "matched" })
        .eq("id", buyer.id)
        .eq("status", "waiting")
        .is("match_id", null);

      const { error: sErr } = await sb
        .from("sellers")
        .update({ match_id: match.id, status: "matched" })
        .eq("id", seller.id)
        .eq("status", "waiting")
        .is("match_id", null);

      if (bErr || sErr) {
        await sb.from("matches").update({ status: "failed" }).eq("id", match.id);

        // best-effort rollback
        await sb
          .from("buyer_queue")
          .update({ match_id: null, status: "waiting" })
          .eq("id", buyer.id);

        await sb
          .from("sellers")
          .update({ match_id: null, status: "waiting" })
          .eq("id", seller.id);

        break;
      }

      // 3) Fetch emails
      const buyerEmail = await getBuyerEmail(sb, buyer.id);
      const sellerEmail = await getSellerEmail(sb, seller.id);

      if (!buyerEmail || !sellerEmail) {
        await sb.from("matches").update({ status: "failed" }).eq("id", match.id);

        await sb
          .from("buyer_queue")
          .update({ match_id: null, status: "waiting" })
          .eq("id", buyer.id);

        await sb
          .from("sellers")
          .update({ match_id: null, status: "waiting" })
          .eq("id", seller.id);

        break;
      }

      const eventName = `${ev.name} - ${ev.distance_label}`;

      // 4) Enqueue intro email to seller
      {
        const { subject, html, text } = renderEmail({
          type: "intro_seller",
          matchId: match.id,
          toRole: "seller",
          expiresAtIso: introDeadline.toISOString(),
          eventName,
          counterpartyEmail: buyerEmail,
        });

        const { error: eoErr } = await sb.from("email_outbox").insert({
          email_type: "intro_seller",
          match_id: match.id,
          to_email: sellerEmail,
          to_name: null,
          subject,
          html,
          text,
        });

        if (eoErr) {
          await sb
            .from("matches")
            .update({ status: "failed" })
            .eq("id", match.id);

          await sb
            .from("buyer_queue")
            .update({ match_id: null, status: "waiting" })
            .eq("id", buyer.id);

          await sb
            .from("sellers")
            .update({ match_id: null, status: "waiting" })
            .eq("id", seller.id);

          break;
        }
      }

      // 5) Enqueue intro email to buyer
      {
        const { subject, html, text } = renderEmail({
          type: "intro_buyer",
          matchId: match.id,
          toRole: "buyer",
          expiresAtIso: introDeadline.toISOString(),
          eventName,
          counterpartyEmail: sellerEmail,
        });

        const { error: eoErr } = await sb.from("email_outbox").insert({
          email_type: "intro_buyer",
          match_id: match.id,
          to_email: buyerEmail,
          to_name: null,
          subject,
          html,
          text,
        });

        if (eoErr) {
          await sb
            .from("matches")
            .update({ status: "failed" })
            .eq("id", match.id);

          await sb
            .from("buyer_queue")
            .update({ match_id: null, status: "waiting" })
            .eq("id", buyer.id);

          await sb
            .from("sellers")
            .update({ match_id: null, status: "waiting" })
            .eq("id", seller.id);

          break;
        }
      }

      created += 1;
      madeForEvent += 1;
    }
  }

  return { created };
}
