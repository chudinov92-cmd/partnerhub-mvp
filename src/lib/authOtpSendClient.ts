import {
  formatOtpRetryAfter,
  otpSendLimitMessage,
  parseOtpSendReason,
  type OtpSendKind,
  type OtpSendLimitResult,
  type OtpSendReason,
} from "@/lib/authOtpRateLimit";

export class OtpSendLimitedError extends Error {
  readonly reason: OtpSendReason;
  readonly retryAfterSeconds: number;

  constructor(reason: OtpSendReason, retryAfterSeconds: number, message: string) {
    super(message);
    this.name = "OtpSendLimitedError";
    this.reason = reason;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function isOtpSendLimitedError(err: unknown): err is OtpSendLimitedError {
  return err instanceof OtpSendLimitedError;
}

type ApiBody = {
  allowed?: unknown;
  reason?: unknown;
  retry_after_seconds?: unknown;
  message?: unknown;
  error?: unknown;
};

function resultFromBody(body: ApiBody, status: number): OtpSendLimitResult {
  const retryAfterSeconds =
    typeof body.retry_after_seconds === "number"
      ? Math.max(0, Math.ceil(body.retry_after_seconds))
      : 0;
  const reason = parseOtpSendReason(body.reason);
  const allowed = body.allowed === true && status < 400;
  return {
    allowed,
    reason: allowed ? "ok" : reason === "ok" ? "email_cooldown" : reason,
    retryAfterSeconds,
    emailSends24h: 0,
    ipSends24h: 0,
  };
}

async function parseResponse(res: Response): Promise<{
  result: OtpSendLimitResult;
  message: string | null;
  errorText: string | null;
}> {
  let body: ApiBody = {};
  try {
    body = (await res.json()) as ApiBody;
  } catch {
    body = {};
  }
  const result = resultFromBody(body, res.status);
  const message =
    typeof body.message === "string" && body.message.trim()
      ? body.message.trim()
      : result.retryAfterSeconds > 0
        ? otpSendLimitMessage(result.reason, result.retryAfterSeconds)
        : null;
  const errorText =
    typeof body.error === "string" && body.error.trim() ? body.error.trim() : null;
  return { result, message, errorText };
}

export async function fetchOtpSendStatus(email: string): Promise<{
  result: OtpSendLimitResult;
  message: string | null;
}> {
  const res = await fetch(
    `/api/v1/auth/otp-send?email=${encodeURIComponent(email.trim())}`,
    { method: "GET", cache: "no-store" },
  );
  const parsed = await parseResponse(res);
  return { result: parsed.result, message: parsed.message };
}

export async function requestOtpSend(
  email: string,
  kind: OtpSendKind,
): Promise<OtpSendLimitResult> {
  const res = await fetch("/api/v1/auth/otp-send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), kind }),
  });
  const parsed = await parseResponse(res);
  if (res.status === 429) {
    throw new OtpSendLimitedError(
      parsed.result.reason,
      parsed.result.retryAfterSeconds,
      parsed.message ??
        otpSendLimitMessage(parsed.result.reason, parsed.result.retryAfterSeconds),
    );
  }
  if (!res.ok) {
    throw new Error(parsed.errorText || "Не удалось отправить код.");
  }
  return parsed.result;
}

export { formatOtpRetryAfter, otpSendLimitMessage };
