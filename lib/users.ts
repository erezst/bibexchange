import { SupabaseClient } from "@supabase/supabase-js";

export async function getUserEmailByUserId(
  sb: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await sb
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data?.email) return null;
  return data.email;
}

export async function getBuyerEmail(
  sb: SupabaseClient,
  buyerQueueId: number
): Promise<string | null> {
  const { data, error } = await sb
    .from("buyer_queue")
    .select("user_id")
    .eq("id", buyerQueueId)
    .maybeSingle();

  if (error || !data?.user_id) return null;
  return getUserEmailByUserId(sb, data.user_id);
}

export async function getSellerEmail(
  sb: SupabaseClient,
  sellerId: number
): Promise<string | null> {
  const { data, error } = await sb
    .from("sellers")
    .select("user_id")
    .eq("id", sellerId)
    .maybeSingle();

  if (error || !data?.user_id) return null;
  return getUserEmailByUserId(sb, data.user_id);
}

export async function getBuyerUserIdByQueueId(
  sb: SupabaseClient,
  buyerQueueId: number
): Promise<string | null> {
  const { data, error } = await sb
    .from("buyer_queue")
    .select("user_id")
    .eq("id", buyerQueueId)
    .maybeSingle();

  if (error || !data?.user_id) return null;
  return data.user_id;
}

export async function getSellerUserIdById(
  sb: SupabaseClient,
  sellerId: number
): Promise<string | null> {
  const { data, error } = await sb
    .from("sellers")
    .select("user_id")
    .eq("id", sellerId)
    .maybeSingle();

  if (error || !data?.user_id) return null;
  return data.user_id;
}

export type ProfileCounterField =
  | "buyer_cancels_count"
  | "buyer_disputes_count"
  | "seller_cancels_count"
  | "seller_disputes_count"
  | "ghost_count";

/**
 * Atomic-ish increment without custom SQL/RPC:
 * uses PostgREST update with an expression via `sb.sql` is not available,
 * so we do a safe read-modify-write. For MVP this is acceptable.
 * If you later want perfect atomicity, we’ll add a tiny Postgres function.
 */
export async function incrementProfileCounter(
  sb: SupabaseClient,
  userId: string,
  field: ProfileCounterField
): Promise<void> {
  const { data, error } = await sb
    .from("profiles")
    .select(field)
    .eq("id", userId)
    .maybeSingle();

  if (error) return;

  const current = ((data as any)?.[field] ?? 0) as number;

  await sb
    .from("profiles")
    .update({ [field]: current + 1 } as any)
    .eq("id", userId);
}
