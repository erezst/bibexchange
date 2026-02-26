import crypto from "crypto";

export type ActionRole = "seller" | "buyer";

export type Action =
  | "seller_cancel" // seller cancels listing during active_intro
  | "seller_transferred" // seller confirms transfer
  | "buyer_received" // buyer confirms receipt (completes immediately)
  | "buyer_cancel" // buyer cancels before seller transferred (buyer -> paused)
  | "buyer_not_received" // buyer disputes after seller transferred
  | "buyer_resume"; // buyer resumes from paused -> waiting (keeps position)

export type ActionPayload = {
  v: 1;
  match_id: number;
  role: ActionRole;
  action: Action;
  exp: number; // unix seconds
};

function b64url(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function unb64url(s: string) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

export function signAction(payload: ActionPayload) {
  const secret = process.env.ACTION_LINK_SECRET;
  if (!secret) throw new Error("Missing ACTION_LINK_SECRET");

  const body = Buffer.from(JSON.stringify(payload), "utf8");
  const sig = crypto.createHmac("sha256", secret).update(body).digest();
  return `${b64url(body)}.${b64url(sig)}`;
}

export function verifyAction(token: string): ActionPayload | null {
  const secret = process.env.ACTION_LINK_SECRET;
  if (!secret) throw new Error("Missing ACTION_LINK_SECRET");

  const [p, s] = token.split(".");
  if (!p || !s) return null;

  let body: Buffer;
  let sig: Buffer;

  try {
    body = unb64url(p);
    sig = unb64url(s);
  } catch {
    return null;
  }

  const expected = crypto.createHmac("sha256", secret).update(body).digest();

  if (expected.length !== sig.length || !crypto.timingSafeEqual(expected, sig)) return null;

  let payload: ActionPayload;
  try {
    payload = JSON.parse(body.toString("utf8")) as ActionPayload;
  } catch {
    return null;
  }

  if (payload?.v !== 1) return null;

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp < now) return null;

  // lightweight schema sanity
  if (typeof payload.match_id !== "number") return null;
  if (payload.role !== "buyer" && payload.role !== "seller") return null;

  return payload;
}

export function buildActionUrl(path: string, token: string) {
  const base = process.env.BIBEX_BASE_URL || "http://localhost:3000";
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}
