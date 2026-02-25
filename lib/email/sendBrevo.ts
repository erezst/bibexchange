type BrevoEmail = {
  to: { email: string; name?: string }[];
  sender: { email: string; name?: string };
  subject: string;
  htmlContent: string;
  textContent: string;
};

export async function sendViaBrevo(payload: BrevoEmail) {
  const apiKey = process.env.BREVO_API_KEY!;
  if (!apiKey) throw new Error("Missing BREVO_API_KEY");

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo error ${res.status}: ${body}`);
  }
}
