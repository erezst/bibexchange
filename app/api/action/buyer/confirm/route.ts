import { NextRequest } from "next/server";
import { verifyAction } from "@/lib/actionLinks";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getBuyerEmail, getSellerEmail } from "@/lib/users";
import { renderEmail } from "@/lib/email/render";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const payload = verifyAction(token);

  if (!payload || payload.action !== "buyer_confirm" || payload.role !== "buyer") {
    return new Response("Invalid or expired link", { status: 400 });
  }

  const sb = supabaseAdmin();

  const { data: match, error } = await sb
    .from("matches")
    .select("id,status,buyer_queue_id,seller_id,event_id")
    .eq("id", payload.match_id)
    .single();

  if (error) return new Response("Match not found", { status: 404 });

  // Idempotent: if already intro_sent or completed, ok
  if (match.status === "intro_sent" || match.status === "completed") {
    return Response.redirect(new URL("/action/done?status=ok", req.url));
  }

  // Must be waiting_buyer
  if (match.status !== "waiting_buyer") {
    return Response.redirect(new URL("/action/done?status=already", req.url));
  }

  // Fetch both emails
  const buyerEmail = await getBuyerEmail(sb, match.buyer_queue_id);
  const sellerEmail = await getSellerEmail(sb, match.seller_id);
  if (!buyerEmail || !sellerEmail) return new Response("Emails not found", { status: 500 });

  // Transition match: intro_sent (single CAS update)
  const { error: upErr } = await sb
    .from("matches")
    .update({ status: "intro_sent", intro_sent_at: new Date().toISOString() })
    .eq("id", match.id)
    .eq("status", "waiting_buyer");

  if (upErr) return new Response("Failed to update match", { status: 500 });

  const { data: event, error: eventErr } = await sb
    .from("events")
    .select("name,distance_label")
    .eq("id", match.event_id)
    .single();
  if (eventErr || !event) return new Response("Event not found", { status: 404 });
  const eventName = `${event.name} - ${event.distance_label}`;

  // Enqueue intro email to SELLER (includes buyer email + seller confirm button)
  {
    const { subject, html, text } = renderEmail({
      type: "intro",
      matchId: match.id,
      toRole: "seller",
      counterpartyEmail: buyerEmail,
      eventName: eventName
    });

    await sb.from("email_outbox").insert({
      email_type: "intro",
      match_id: match.id,
      to_email: sellerEmail,
      to_name: null,
      subject,
      html,
      text,
    });
  }

  // Enqueue intro email to BUYER (includes seller email + buyer received button)
  {
    const { subject, html, text } = renderEmail({
      type: "intro",
      matchId: match.id,
      toRole: "buyer",
      counterpartyEmail: sellerEmail,
      eventName: eventName,
    });

    await sb.from("email_outbox").insert({
      email_type: "intro",
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
