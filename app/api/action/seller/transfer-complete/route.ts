import { NextRequest } from "next/server";
import { verifyAction } from "@/lib/actionLinks";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { finalizeMatch } from "@/lib/match/finalize";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const payload = verifyAction(token);

  if (!payload || payload.action !== "seller_transfer_complete" || payload.role !== "seller") {
    return new Response("Invalid or expired link", { status: 400 });
  }

  const sb = supabaseAdmin();

  const { data: match, error } = await sb
    .from("matches")
    .select("id,status")
    .eq("id", payload.match_id)
    .single();

  if (error) return new Response("Match not found", { status: 404 });

  // If already completed, ok
  if (match.status === "completed") {
    return Response.redirect(new URL("/action/done?status=ok", req.url));
  }

  // Allowed from intro_sent / stale / buyer_confirmed_receipt
  const allowed = ["intro_sent", "stale", "buyer_confirmed_receipt", "seller_confirmed_transfer"];
  if (!allowed.includes(match.status)) {
    return Response.redirect(new URL("/action/done?status=already", req.url));
  }

  // If buyer already confirmed receipt, you can choose to complete here, or just record seller_confirmed.
  // We'll complete if buyer already confirmed receipt.
  const nextStatus = match.status === "buyer_confirmed_receipt" ? "completed" : "seller_confirmed_transfer";

  await sb
    .from("matches")
    .update({
      status: nextStatus,
      seller_confirmed_at: new Date().toISOString(),
    })
    .eq("id", match.id);

  if (nextStatus === "completed") {
    await finalizeMatch(sb, match.id);
  }

  return Response.redirect(new URL("/action/done?status=ok", req.url));
}
