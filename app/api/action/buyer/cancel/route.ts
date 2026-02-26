import { NextRequest } from "next/server";
import { verifyAction } from "@/lib/actionLinks";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { pauseBuyer } from "@/lib/match/helpers";
import { renderEmail } from "@/lib/email/render";
import { getSellerEmail } from "@/lib/users";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const payload = verifyAction(token);

  if (!payload || payload.action !== "buyer_cancel" || payload.role !== "buyer") {
    return new Response("Invalid or expired link", { status: 400 });
  }

  const sb = supabaseAdmin();

  const { data: match, error } = await sb
    .from("matches")
    .select("id,status,event_id,buyer_queue_id,seller_id")
    .eq("id", payload.match_id)
    .maybeSingle();

  if (error || !match) return new Response("Match not found", { status: 404 });

  // Idempotent
  if (match.status === "buyer_cancelled_pre_transfer") {
    return Response.redirect(new URL("/action/done?status=already", req.url));
  }
  if (match.status === "completed") {
    return Response.redirect(new URL("/action/done?status=already", req.url));
  }

  // Only allowed before seller transferred
  if (match.status !== "active_intro") {
    return Response.redirect(new URL("/action/done?status=invalid", req.url));
  }

  // Close the match as buyer_cancelled_pre_transfer
  const { error: upErr } = await sb
    .from("matches")
    .update({
      status: "buyer_cancelled_pre_transfer",
      buyer_cancelled_at: new Date().toISOString(),
    })
    .eq("id", match.id)
    .eq("status", "active_intro");

  if (upErr) return new Response("Failed to update match", { status: 500 });

  // Buyer goes to paused (keeps place), seller is released back to waiting for immediate rematch
  await pauseBuyer(sb, match.buyer_queue_id);
  await sb
    .from("sellers")
    .update({ status: "waiting", match_id: null })
    .eq("id", match.seller_id);

  // Notify seller (best-effort)
  const sellerEmail = await getSellerEmail(sb, match.seller_id);
  if (sellerEmail) {
    const { data: ev } = await sb
      .from("events")
      .select("name,distance_label")
      .eq("id", match.event_id)
      .maybeSingle();

    const eventName = `${ev?.name ?? "Event"} - ${ev?.distance_label ?? ""}`.trim();

    const { subject, html, text } = renderEmail({
      type: "notify_buyer_cancelled",
      matchId: match.id,
      toRole: "seller",
      eventName,
    });

    await sb.from("email_outbox").insert({
      email_type: "notify_buyer_cancelled",
      match_id: match.id,
      to_email: sellerEmail,
      to_name: null,
      subject,
      html,
      text,
    });
  }

  return Response.redirect(new URL("/action/done?status=ok", req.url));
}
