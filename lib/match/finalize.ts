import { SupabaseClient } from "@supabase/supabase-js";

export async function finalizeMatch(sb: SupabaseClient, matchId: number) {
  // Get the queue references
  const { data: m, error } = await sb
    .from("matches")
    .select("id, buyer_queue_id, seller_id, status")
    .eq("id", matchId)
    .single();

  if (error || !m) throw error ?? new Error("Match not found");

  // Only finalize if completed
  if (m.status !== "completed") return;

  // Update queues: mark confirmed + clear match_id
  await sb.from("buyer_queue").update({ status: "confirmed", match_id: null }).eq("id", m.buyer_queue_id);
  await sb.from("sellers").update({ status: "confirmed", match_id: null }).eq("id", m.seller_id);
}
