import { NextRequest } from "next/server";
import { requireCron } from "@/lib/cronAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { expirePendingMatches } from "@/lib/match/expire";
import { runMatchmakerOncePerEvent } from "@/lib/match/matchmaker";
import { sendOutboxBatch } from "@/lib/email/outbox";

export async function POST(req: NextRequest) {
  const denied = requireCron(req);
  if (denied) return denied;

  const sb = supabaseAdmin();

  // 1) Expire old pending matches
  const expired = await expirePendingMatches(sb);

  // 2) Create new matches (enqueues proposal emails)
  const matchmaker = await runMatchmakerOncePerEvent();

  // 3) Send email outbox (drain a bit)
  const MAX_BATCHES = 10;
  const BATCH_SIZE = 50;

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < MAX_BATCHES; i++) {
    const r = await sendOutboxBatch(BATCH_SIZE);
    sent += r.sent;
    failed += r.failed;
    if (r.sent === 0 && r.failed === 0) break;
  }

  return Response.json({
    ok: true,
    expired,
    matchmaker,
    email: { sent, failed },
  });
}