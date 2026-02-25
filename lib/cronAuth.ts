import { NextRequest } from "next/server";

export function requireCron(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return new Response("CRON_SECRET not set", { status: 500 });

  const got = req.headers.get("x-cron-secret");
  if (got !== expected) return new Response("Unauthorized", { status: 401 });

  return null;
}
