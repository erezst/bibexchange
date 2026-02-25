import { SupabaseClient } from "@supabase/supabase-js";

export async function clearMatchFromQueues(
  sb: SupabaseClient,
  buyerQueueId: number,
  sellerId: number,
  buyerStatus: string,
  sellerStatus: string
) {
  await sb.from("buyer_queue").update({ match_id: null, status: buyerStatus }).eq("id", buyerQueueId);
  await sb.from("sellers").update({ match_id: null, status: sellerStatus }).eq("id", sellerId);
}
