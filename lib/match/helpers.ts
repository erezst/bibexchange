import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Clears match_id from both buyer_queue and sellers rows
 * and sets their new statuses.
 *
 * This is used when:
 * - match completed
 * - match expired
 * - buyer cancelled
 * - seller cancelled
 * - dispute closed
 */
export async function clearMatchFromQueues(
  sb: SupabaseClient,
  buyerQueueId: number,
  sellerId: number,
  buyerStatus: string,
  sellerStatus: string
) {
  await sb
    .from("buyer_queue")
    .update({
      match_id: null,
      status: buyerStatus,
    })
    .eq("id", buyerQueueId);

  await sb
    .from("sellers")
    .update({
      match_id: null,
      status: sellerStatus,
    })
    .eq("id", sellerId);
}

/**
 * Pause buyer after cancellation or stale match.
 * Keeps queue position (joined_at unchanged).
 */
export async function pauseBuyer(
  sb: SupabaseClient,
  buyerQueueId: number,
  cooldownUntilIso?: string
) {
  await sb
    .from("buyer_queue")
    .update({
      status: "paused",
      match_id: null,
      ...(cooldownUntilIso ? { cooldown_until: cooldownUntilIso } : {}),
    })
    .eq("id", buyerQueueId);
}

/**
 * Return buyer to waiting (resume).
 * Do not reset cooldown.
 */
export async function resumeBuyer(
  sb: SupabaseClient,
  buyerQueueId: number
) {
  await sb
    .from("buyer_queue")
    .update({
      status: "waiting",
    })
    .eq("id", buyerQueueId);
}

/**
 * Cancel seller listing permanently.
 */
export async function cancelSellerListing(
  sb: SupabaseClient,
  sellerId: number
) {
  await sb
    .from("sellers")
    .update({
      status: "cancelled",
      match_id: null,
    })
    .eq("id", sellerId);
}

/**
 * Finalize successful match.
 */
export async function finalizeMatchSuccess(
  sb: SupabaseClient,
  buyerQueueId: number,
  sellerId: number
) {
  await sb
    .from("buyer_queue")
    .update({
      status: "confirmed",
      match_id: null,
    })
    .eq("id", buyerQueueId);

  await sb
    .from("sellers")
    .update({
      status: "confirmed",
      match_id: null,
    })
    .eq("id", sellerId);
}