// POST /order  {part, name, email, message}
// Sends the "Request samples" form to the owner through SES. The visitor's
// address goes in Reply-To, so a plain reply answers them.
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const ses = new SESv2Client({});
const MAIL = process.env.MAIL;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const reply = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body)
});

const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f]/g, "").trim().slice(0, max);

export async function handler(event) {
  let data;
  try {
    data = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString() : event.body || "{}");
  } catch {
    return reply(400, { error: "Body must be JSON." });
  }

  // Bots fill every field; people never see this one.
  if (data.website) return reply(200, { ok: true });

  const part = clean(data.part, 60) || "ANISH-K2026";
  const name = clean(data.name, 100);
  const email = clean(data.email, 200);
  const message = clean(data.message, 4000);

  if (!name || !message) return reply(400, { error: "Name and message are required." });
  if (email && !EMAIL_RE.test(email)) return reply(400, { error: "That email address does not look right." });

  const ip = event.requestContext?.http?.sourceIp || "unknown";
  const text = [
    `Part: ${part}`,
    `From: ${name}${email ? ` <${email}>` : ""}`,
    `IP: ${ip}`,
    "",
    message
  ].join("\n");

  await ses.send(new SendEmailCommand({
    FromEmailAddress: `ANISH-K2026 datasheet <${MAIL}>`,
    Destination: { ToAddresses: [MAIL] },
    ReplyToAddresses: email ? [email] : undefined,
    Content: {
      Simple: {
        Subject: { Data: `Sample request: ${part} from ${name}`.slice(0, 200) },
        Body: { Text: { Data: text } }
      }
    }
  }));

  return reply(200, { ok: true });
}
