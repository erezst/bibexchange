import { NextRequest } from "next/server";
import { requireCron } from "@/lib/cronAuth";
import { runMatchmakerOncePerEvent } from "@/lib/match/matchmaker";

export async function POST(req: NextRequest) {
  const denied = requireCron(req);
  if (denied) return denied;

  const result = await runMatchmakerOncePerEvent();
  return Response.json({ ok: true, ...result });
}
