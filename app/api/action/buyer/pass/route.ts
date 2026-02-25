import { NextRequest } from "next/server";
import { verifyAction } from "@/lib/actionLinks";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { clearMatchFromQueues } from "@/lib/match/helpers";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const payload = verifyAction(token);

  if (!payload || payload.action !== "buyer_pass" || payload.role !== "buyer") {
    return new Response("Invalid or expired link", { status: 400 });
  }

  const sb = supabaseAdmin();

  const { data: match, error } = await sb
    .from("matches")
    .select("id,status,buyer_queue_id,seller_id")
    .eq("id", payload.match_id)
    .single();

  if (error) return new Response("Match not found", { status: 404 });

  if (match.status !== "waiting_buyer") {
    return Response.redirect(new URL("/action/done?status=ok", req.url));
  }

  const { error: upErr } = await sb
    .from("matches")
    .update({ status: "buyer_passed" })
    .eq("id", match.id)
    .eq("status", "waiting_buyer");

  if (upErr) return new Response("Failed to update match", { status: 500 });

  await clearMatchFromQueues(sb, match.buyer_queue_id, match.seller_id, "waiting", "waiting");

  return Response.redirect(new URL("/action/done?status=ok", req.url));
}
