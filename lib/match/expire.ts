import { SupabaseClient } from "@supabase/supabase-js";
import { clearMatchFromQueues } from "@/lib/match/helpers";

export async function expirePendingMatches(sb: SupabaseClient) {
  const nowIso = new Date().toISOString();

  // seller stage
  const { data: sellerExpired, error: seErr } = await sb
    .from("matches")
    .select("id,buyer_queue_id,seller_id")
    .eq("status", "proposed_to_seller")
    .not("seller_expires_at", "is", null)
    .lte("seller_expires_at", nowIso);

  if (seErr) throw seErr;

  let sellerCount = 0;
  for (const m of sellerExpired ?? []) {
    const { error: upErr } = await sb
      .from("matches")
      .update({ status: "seller_expired" })
      .eq("id", m.id)
      .eq("status", "proposed_to_seller");

    if (!upErr) {
      await clearMatchFromQueues(sb, m.buyer_queue_id, m.seller_id, "waiting", "waiting");
      sellerCount += 1;
    }
  }

  // buyer stage
  const { data: buyerExpired, error: beErr } = await sb
    .from("matches")
    .select("id,buyer_queue_id,seller_id")
    .eq("status", "waiting_buyer")
    .not("buyer_expires_at", "is", null)
    .lte("buyer_expires_at", nowIso);

  if (beErr) throw beErr;

  let buyerCount = 0;
  for (const m of buyerExpired ?? []) {
    const { error: upErr } = await sb
      .from("matches")
      .update({ status: "buyer_expired" })
      .eq("id", m.id)
      .eq("status", "waiting_buyer");

    if (!upErr) {
      await clearMatchFromQueues(sb, m.buyer_queue_id, m.seller_id, "waiting", "waiting");
      buyerCount += 1;
    }
  }

  return { sellerExpired: sellerCount, buyerExpired: buyerCount, nowIso };
}