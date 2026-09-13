export const OTP_SEND_COOLDOWN_SECONDS = 60;
export const OTP_SEND_EMAIL_MAX_24H = 4;
export const OTP_SEND_IP_MAX_24H = 8;
export const OTP_SEND_WINDOW_MS = 24 * 60 * 60 * 1000;

export const OTP_SEND_REASONS = [
  "ok",
  "email_cooldown",
  "email_daily",
  "ip_daily",
  "invalid_email",
] as const;

export type OtpSendReason = (typeof OTP_SEND_REASONS)[number];

export type OtpSendKind = "signup" | "signup_resend" | "recovery" | "record";

export type OtpSendLimitResult = {
  allowed: boolean;
  reason: OtpSendReason;
  retryAfterSeconds: number;
  emailSends24h: number;
  ipSends24h: number;
  id?: string;
};

export function normalizeOtpEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isPlausibleOtpEmail(email: string): boolean {
  const normalized = normalizeOtpEmail(email);
  const at = normalized.indexOf("@");
  return at > 0 && at < normalized.length - 1;
}

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** «0:59», «1:00», «1 ч 00 мин», «12 ч 05 мин». */
export function formatOtpRetryAfter(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  if (total < 3600) {
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${pad2(secs)}`;
  }
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  return `${hours} ч ${pad2(mins)} мин`;
}

export function otpSendLimitMessage(
  reason: OtpSendReason | string,
  retryAfterSeconds: number,
): string {
  const wait = formatOtpRetryAfter(retryAfterSeconds);
  if (reason === "email_daily") {
    return `На этот email уже отправлено ${OTP_SEND_EMAIL_MAX_24H} кода за 24 часа. Повторно можно через ${wait}.`;
  }
  if (reason === "ip_daily") {
    return `С вашего адреса слишком много запросов кода (лимит ${OTP_SEND_IP_MAX_24H} за 24 часа). Попробуйте через ${wait}.`;
  }
  if (reason === "invalid_email") {
    return "Укажите корректный email.";
  }
  return `Повторно запросить код можно через ${wait}.`;
}

export function evaluateOtpSendLimits(input: {
  nowMs: number;
  emailSendsAtMs: number[];
  ipSendsAtMs: number[];
  applyIp: boolean;
}): OtpSendLimitResult {
  const windowStart = input.nowMs - OTP_SEND_WINDOW_MS;
  const emailSends = input.emailSendsAtMs
    .filter((ts) => ts >= windowStart)
    .sort((a, b) => a - b);
  const ipSends = input.applyIp
    ? input.ipSendsAtMs.filter((ts) => ts >= windowStart).sort((a, b) => a - b)
    : [];

  const emailCount = emailSends.length;
  const ipCount = ipSends.length;

  if (emailCount >= OTP_SEND_EMAIL_MAX_24H) {
    const oldest = emailSends[0] ?? input.nowMs;
    return {
      allowed: false,
      reason: "email_daily",
      retryAfterSeconds: retrySeconds(oldest + OTP_SEND_WINDOW_MS, input.nowMs),
      emailSends24h: emailCount,
      ipSends24h: ipCount,
    };
  }

  const lastEmail = emailSends[emailSends.length - 1];
  if (
    lastEmail !== undefined &&
    input.nowMs - lastEmail < OTP_SEND_COOLDOWN_SECONDS * 1000
  ) {
    return {
      allowed: false,
      reason: "email_cooldown",
      retryAfterSeconds: retrySeconds(
        lastEmail + OTP_SEND_COOLDOWN_SECONDS * 1000,
        input.nowMs,
      ),
      emailSends24h: emailCount,
      ipSends24h: ipCount,
    };
  }

  if (input.applyIp && ipCount >= OTP_SEND_IP_MAX_24H) {
    const oldest = ipSends[0] ?? input.nowMs;
    return {
      allowed: false,
      reason: "ip_daily",
      retryAfterSeconds: retrySeconds(oldest + OTP_SEND_WINDOW_MS, input.nowMs),
      emailSends24h: emailCount,
      ipSends24h: ipCount,
    };
  }

  return {
    allowed: true,
    reason: "ok",
    retryAfterSeconds: 0,
    emailSends24h: emailCount,
    ipSends24h: ipCount,
  };
}

export function nextRetryAfterAfterSuccessfulSend(emailSendsInWindowIncludingNew: number): number {
  if (emailSendsInWindowIncludingNew >= OTP_SEND_EMAIL_MAX_24H) {
    return OTP_SEND_WINDOW_MS / 1000;
  }
  return OTP_SEND_COOLDOWN_SECONDS;
}

function retrySeconds(untilMs: number, nowMs: number): number {
  return Math.max(1, Math.ceil((untilMs - nowMs) / 1000));
}

export function parseOtpSendReason(value: unknown): OtpSendReason {
  if (typeof value === "string" && (OTP_SEND_REASONS as readonly string[]).includes(value)) {
    return value as OtpSendReason;
  }
  return "ok";
}
