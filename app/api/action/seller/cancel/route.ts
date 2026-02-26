import { NextRequest } from "next/server";
import { verifyAction } from "@/lib/actionLinks";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cancelSellerListing, clearMatchFromQueues } from "@/lib/match/helpers";
import { renderEmail } from "@/lib/email/render";
import { getBuyerEmail } from "@/lib/users";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const payload = verifyAction(token);

  if (!payload || payload.action !== "seller_cancel" || payload.role !== "seller") {
    return new Response("Invalid or expired link", { status: 400 });
  }

  const sb = supabaseAdmin();

  const { data: match, error } = await sb
    .from("matches")
    .select("id,status,event_id,buyer_queue_id,seller_id")
    .eq("id", payload.match_id)
    .maybeSingle();

  if (error || !match) return new Response("Match not found", { status: 404 });

  // If already completed or already cancelled/stale, treat as already
  if (match.status === "completed" || match.status === "seller_cancelled" || match.status === "stale_unconfirmed") {
    return Response.redirect(new URL("/action/done?status=already", req.url));
  }

  // Only allowed during active_intro (before seller transferred)
  if (match.status !== "active_intro") {
    return Response.redirect(new URL("/action/done?status=invalid", req.url));
  }

  // Mark match seller_cancelled (idempotent)
  const { error: upErr } = await sb
    .from("matches")
    .update({
      status: "seller_cancelled",
      seller_cancelled_at: new Date().toISOString(),
    })
    .eq("id", match.id)
    .eq("status", "active_intro");

  if (upErr) return new Response("Failed to update match", { status: 500 });

  // Seller listing becomes cancelled; buyer returns to waiting (position preserved)
  await cancelSellerListing(sb, match.seller_id);
  await sb
    .from("buyer_queue")
    .update({ status: "waiting", match_id: null })
    .eq("id", match.buyer_queue_id);

  // Notify buyer (best-effort)
  const buyerEmail = await getBuyerEmail(sb, match.buyer_queue_id);
  if (buyerEmail) {
    const { data: ev } = await sb
      .from("events")
      .select("name,distance_label")
      .eq("id", match.event_id)
      .maybeSingle();

    const eventName = `${ev?.name ?? "Event"} - ${ev?.distance_label ?? ""}`.trim();

    const { subject, html, text } = renderEmail({
      type: "notify_seller_cancelled",
      matchId: match.id,
      toRole: "buyer",
      eventName,
    });

    await sb.from("email_outbox").insert({
      email_type: "notify_seller_cancelled",
      match_id: match.id,
      to_email: buyerEmail,
      to_name: null,
      subject,
      html,
      text,
    });
  }

  return Response.redirect(new URL("/action/done?status=ok", req.url));
}
