import { NextRequest } from "next/server";
import { verifyAction } from "@/lib/actionLinks";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { finalizeMatch } from "@/lib/match/finalize";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const payload = verifyAction(token);

  if (!payload || payload.action !== "buyer_received" || payload.role !== "buyer") {
    return new Response("Invalid or expired link", { status: 400 });
  }

  const sb = supabaseAdmin();

  const { data: match, error } = await sb
    .from("matches")
    .select("id,status")
    .eq("id", payload.match_id)
    .single();

  if (error) return new Response("Match not found", { status: 404 });

  if (match.status === "completed") {
    return Response.redirect(new URL("/action/done?status=ok", req.url));
  }

  const allowed = ["intro_sent", "stale", "seller_confirmed_transfer", "buyer_confirmed_receipt"];
  if (!allowed.includes(match.status)) {
    return Response.redirect(new URL("/action/done?status=already", req.url));
  }

  // Your rule: buyer confirmation can complete immediately.
  await sb
    .from("matches")
    .update({
      status: "completed",
      buyer_confirmed_at: new Date().toISOString(),
    })
    .eq("id", match.id);

  await finalizeMatch(sb, match.id);

  return Response.redirect(new URL("/action/done?status=ok", req.url));
}
