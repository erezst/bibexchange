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
