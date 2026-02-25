import { NextRequest } from "next/server";
import { verifyAction } from "@/lib/actionLinks";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { renderEmail } from "@/lib/email/render";
import { getBuyerEmail } from "@/lib/users";

const BUYER_WINDOW_HOURS = 24;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const payload = verifyAction(token);

  if (!payload || payload.action !== "seller_accept" || payload.role !== "seller") {
    return new Response("Invalid or expired link", { status: 400 });
  }

  const sb = supabaseAdmin();

  // Load match + buyer user id
  const { data: match, error } = await sb
    .from("matches")
    .select("id,status,buyer_queue_id,seller_id,event_id")
    .eq("id", payload.match_id)
    .single();
  if (error) return new Response("Match not found", { status: 404 });

  // Idempotent: if already progressed, show OK
  if (match.status !== "proposed_to_seller") {
    return Response.redirect(new URL("/action/done?status=ok", req.url));
  }

  const { data: event, error: eventErr } = await sb
    .from("events")
    .select("name,distance_label")
    .eq("id", match.event_id)
    .single();
  if (eventErr || !event) return new Response("Event not found", { status: 404 });
  const eventName = `${event.name} - ${event.distance_label}`;

  // Move to WAITING_BUYER + set buyer_expires_at
  const buyerExpires = new Date(Date.now() + BUYER_WINDOW_HOURS * 3600 * 1000);

  const { error: upErr } = await sb
    .from("matches")
    .update({
      status: "waiting_buyer",
      buyer_expires_at: buyerExpires.toISOString(),
    })
    .eq("id", match.id)
    .eq("status", "proposed_to_seller");

  if (upErr) return new Response("Failed to update match", { status: 500 });

  const buyerEmail = await getBuyerEmail(sb, match.buyer_queue_id);
  if (!buyerEmail) return new Response("Buyer email not found", { status: 500 });

  const { subject, html, text } = renderEmail({
    type: "buyer_confirmation",
    matchId: match.id,
    toRole: "buyer",
    expiresAtIso: buyerExpires.toISOString(),
    eventName: eventName,
  });

  await sb.from("email_outbox").insert({
    email_type: "buyer_confirmation",
    match_id: match.id,
    to_email: buyerEmail,
    to_name: null,
    subject,
    html,
    text,
  });

  return Response.redirect(new URL("/action/done?status=ok", req.url));
}
