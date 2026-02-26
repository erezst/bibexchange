import { NextRequest } from "next/server";
import { verifyAction } from "@/lib/actionLinks";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { renderEmail } from "@/lib/email/render";
import {
  getBuyerEmail,
  getSellerEmail,
  getBuyerUserIdByQueueId,
  getSellerUserIdById,
} from "@/lib/users";

const COOLDOWN_HOURS = 72;

function addHoursIso(hours: number) {
  const now = new Date();
  return new Date(now.getTime() + hours * 3600 * 1000).toISOString();
}

async function bumpProfileField(sb: any, userId: string, field: string) {
  // Best-effort read/modify/write. If the column doesn't exist yet, ignore.
  const { data } = await sb.from("profiles").select(field).eq("id", userId).maybeSingle();
  const current = (data as any)?.[field];
  if (typeof current !== "number") return;
  await sb.from("profiles").update({ [field]: current + 1 }).eq("id", userId);
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const payload = verifyAction(token);

  if (!payload || payload.action !== "buyer_not_received" || payload.role !== "buyer") {
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
  if (match.status === "disputed_not_received") {
    return Response.redirect(new URL("/action/done?status=already", req.url));
  }
  if (match.status === "completed") {
    return Response.redirect(new URL("/action/done?status=invalid", req.url));
  }

  // Only allowed after seller marked transferred
  if (match.status !== "seller_transferred") {
    return Response.redirect(new URL("/action/done?status=invalid", req.url));
  }

  const nowIso = new Date().toISOString();
  const cooldownUntil = addHoursIso(COOLDOWN_HOURS);

  // Close match as dispute
  const { error: upErr } = await sb
    .from("matches")
    .update({
      status: "disputed_not_received",
      disputed_at: nowIso,
    })
    .eq("id", match.id)
    .eq("status", "seller_transferred");

  if (upErr) return new Response("Failed to update match", { status: 500 });

  // Buyer returns to waiting with position preserved, but gets cooldown + penalty
  await sb
    .from("buyer_queue")
    .update({
      status: "waiting",
      match_id: null,
      cooldown_until: cooldownUntil,
    })
    .eq("id", match.buyer_queue_id);

  // Seller returns to waiting but gets cooldown + penalty
  await sb
    .from("sellers")
    .update({
      status: "waiting",
      match_id: null,
      cooldown_until: cooldownUntil,
    })
    .eq("id", match.seller_id);

  // Penalty counters (best-effort, won’t fail if columns not present yet)
  const buyerUserId = await getBuyerUserIdByQueueId(sb, match.buyer_queue_id);
  const sellerUserId = await getSellerUserIdById(sb, match.seller_id);

  if (buyerUserId) {
    await bumpProfileField(sb, buyerUserId, "buyer_disputes_count");
    await bumpProfileField(sb, buyerUserId, "buyer_penalty_count");
  }
  if (sellerUserId) {
    await bumpProfileField(sb, sellerUserId, "seller_disputes_count");
    await bumpProfileField(sb, sellerUserId, "seller_penalty_count");
  }

  // Notify both (best-effort)
  const { data: ev } = await sb
    .from("events")
    .select("name,distance_label")
    .eq("id", match.event_id)
    .maybeSingle();

  const eventName = `${ev?.name ?? "Event"} - ${ev?.distance_label ?? ""}`.trim();

  const buyerEmail = await getBuyerEmail(sb, match.buyer_queue_id);
  const sellerEmail = await getSellerEmail(sb, match.seller_id);

  if (buyerEmail) {
    const { subject, html, text } = renderEmail({
      type: "notify_disputed_not_received",
      matchId: match.id,
      toRole: "buyer",
      eventName,
      counterpartyEmail: sellerEmail ?? undefined,
    });

    await sb.from("email_outbox").insert({
      email_type: "notify_disputed_not_received",
      match_id: match.id,
      to_email: buyerEmail,
      to_name: null,
      subject,
      html,
      text,
    });
  }

  if (sellerEmail) {
    const { subject, html, text } = renderEmail({
      type: "notify_disputed_not_received",
      matchId: match.id,
      toRole: "seller",
      eventName,
      counterpartyEmail: buyerEmail ?? undefined,
    });

    await sb.from("email_outbox").insert({
      email_type: "notify_disputed_not_received",
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
