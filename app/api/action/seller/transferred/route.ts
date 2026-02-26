import { NextRequest } from "next/server";
import { verifyAction } from "@/lib/actionLinks";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { renderEmail } from "@/lib/email/render";
import { getBuyerEmail, getSellerEmail } from "@/lib/users";

const BUYER_CONFIRM_WINDOW_HOURS = 24;

function addHours(hours: number) {
  const now = new Date();
  return new Date(now.getTime() + hours * 3600 * 1000).toISOString();
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const payload = verifyAction(token);

  if (
    !payload ||
    payload.action !== "seller_transferred" ||
    payload.role !== "seller"
  ) {
    return new Response("Invalid or expired link", { status: 400 });
  }

  const sb = supabaseAdmin();

  const { data: match, error } = await sb
    .from("matches")
    .select(
      "id,status,event_id,buyer_queue_id,seller_id,buyer_confirmed_at"
    )
    .eq("id", payload.match_id)
    .maybeSingle();

  if (error || !match) {
    return new Response("Match not found", { status: 404 });
  }

  // If already completed → idempotent success
  if (match.status === "completed") {
    return Response.redirect(new URL("/action/done?status=already", req.url));
  }

  // Only allowed from active_intro
  if (match.status !== "active_intro") {
    return Response.redirect(new URL("/action/done?status=already", req.url));
  }

  const nowIso = new Date().toISOString();
  const buyerConfirmDeadline = addHours(BUYER_CONFIRM_WINDOW_HOURS);

  // Move match → seller_transferred
  const { error: upErr } = await sb
    .from("matches")
    .update({
      status: "seller_transferred",
      seller_confirmed_at: nowIso,
      buyer_confirm_deadline_at: buyerConfirmDeadline,
    })
    .eq("id", match.id)
    .eq("status", "active_intro");

  if (upErr) {
    return new Response("Failed to update match", { status: 500 });
  }

  // Notify buyer: confirmation required
  const buyerEmail = await getBuyerEmail(sb, match.buyer_queue_id);

  if (buyerEmail) {
    const { data: ev } = await sb
      .from("events")
      .select("name,distance_label")
      .eq("id", match.event_id)
      .maybeSingle();

    const eventName = `${ev?.name ?? "Event"} - ${ev?.distance_label ?? ""}`.trim();

    const sellerEmail = await getSellerEmail(sb, match.seller_id);

    const { subject, html, text } = renderEmail({
      type: "buyer_confirm_reminder",
      matchId: match.id,
      toRole: "buyer",
      eventName,
      counterpartyEmail: sellerEmail ?? undefined,
      expiresAtIso: buyerConfirmDeadline,
    });

    await sb.from("email_outbox").insert({
      email_type: "buyer_confirm_reminder",
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
