import { NextRequest } from "next/server";
import { requireCron } from "@/lib/cronAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { clearMatchFromQueues } from "@/lib/match/helpers";

export async function POST(req: NextRequest) {
  const denied = requireCron(req);
  if (denied) return denied;

  const sb = supabaseAdmin();
  const nowIso = new Date().toISOString();

  // 1) Expire seller stage
  const { data: sellerExpired } = await sb
    .from("matches")
    .select("id,buyer_queue_id,seller_id")
    .eq("status", "proposed_to_seller")
    .lte("seller_expires_at", nowIso);

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

  // 2) Expire buyer stage
  const { data: buyerExpired } = await sb
    .from("matches")
    .select("id,buyer_queue_id,seller_id")
    .eq("status", "waiting_buyer")
    .lte("buyer_expires_at", nowIso);

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

  return Response.json({ ok: true, sellerExpired: sellerCount, buyerExpired: buyerCount });
}
