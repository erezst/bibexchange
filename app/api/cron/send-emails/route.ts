import { NextRequest } from "next/server";
import { requireCron } from "@/lib/cronAuth";
import { sendOutboxBatch } from "@/lib/email/outbox";

export async function POST(req: NextRequest) {
  const denied = requireCron(req);
  if (denied) return denied;

  const result = await sendOutboxBatch(30);
  return Response.json({ ok: true, ...result });
}
