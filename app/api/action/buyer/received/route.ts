import { NextRequest } from "next/server";
import { verifyAction } from "@/lib/actionLinks";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { finalizeMatchSuccess } from "@/lib/match/helpers";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const payload = verifyAction(token);

  if (!payload || payload.action !== "buyer_received" || payload.role !== "buyer") {
    return new Response("Invalid or expired link", { status: 400 });
  }

  const sb = supabaseAdmin();

  const { data: match, error } = await sb
    .from("matches")
    .select("id,status,buyer_queue_id,seller_id")
    .eq("id", payload.match_id)
    .maybeSingle();

  if (error || !match) return new Response("Match not found", { status: 404 });

  // Idempotent
  if (match.status === "completed") {
    return Response.redirect(new URL("/action/done?status=already", req.url));
  }

  // Allowed from active_intro or seller_transferred
  if (match.status !== "active_intro" && match.status !== "seller_transferred") {
    return Response.redirect(new URL("/action/done?status=already", req.url));
  }

  const nowIso = new Date().toISOString();

  // Mark completed
  const { error: upErr } = await sb
    .from("matches")
    .update({
      status: "completed",
      buyer_confirmed_at: nowIso,
    })
    .eq("id", match.id)
    .in("status", ["active_intro", "seller_transferred"]);

  if (upErr) {
    return new Response("Failed to update match", { status: 500 });
  }

  // Finalize queue rows
  await finalizeMatchSuccess(sb, match.buyer_queue_id, match.seller_id);

  return Response.redirect(new URL("/action/done?status=ok", req.url));
}
