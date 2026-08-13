import nodemailer from "nodemailer";

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const fromEmail =
    process.env.SMTP_ADMIN_EMAIL?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    user;
  const fromName = process.env.SMTP_SENDER_NAME?.trim() || "Zeip";

  if (!host || !user || !pass || !fromEmail) {
    return null;
  }

  return { host, port, user, pass, fromEmail, fromName };
}

export async function sendTransactionalEmail(
  params: SendEmailParams,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cfg = getSmtpConfig();
  if (!cfg) {
    return { ok: false, error: "SMTP is not configured" };
  }

  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });

  try {
    await transport.sendMail({
      from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    return { ok: false, error: message };
  }
}

export function verifyInternalEmailSecret(req: Request): boolean {
  const secret = req.headers.get("x-internal-secret");
  const expected =
    process.env.INTERNAL_EMAIL_SECRET?.trim() ||
    process.env.INTERNAL_PUSH_SECRET?.trim();
  return Boolean(expected && secret === expected);
}
