import crypto from "crypto";

export type ActionRole = "seller" | "buyer";
export type Action =
  | "seller_accept"
  | "seller_pass"
  | "buyer_confirm"
  | "buyer_pass"
  | "seller_transfer_complete"
  | "buyer_received";

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
  const secret = process.env.ACTION_LINK_SECRET!;
  if (!secret) throw new Error("Missing ACTION_LINK_SECRET");

  const body = Buffer.from(JSON.stringify(payload), "utf8");
  const sig = crypto.createHmac("sha256", secret).update(body).digest();
  return `${b64url(body)}.${b64url(sig)}`;
}

export function verifyAction(token: string): ActionPayload | null {
  const secret = process.env.ACTION_LINK_SECRET!;
  if (!secret) throw new Error("Missing ACTION_LINK_SECRET");

  const [p, s] = token.split(".");
  if (!p || !s) return null;

  const body = unb64url(p);
  const sig = unb64url(s);
  const expected = crypto.createHmac("sha256", secret).update(body).digest();

  if (expected.length !== sig.length || !crypto.timingSafeEqual(expected, sig)) return null;

  const payload = JSON.parse(body.toString("utf8")) as ActionPayload;
  if (payload?.v !== 1) return null;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) return null;

  return payload;
}

export function buildActionUrl(path: string, token: string) {
  const base = process.env.BIBEX_BASE_URL || "http://localhost:3000";
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}
