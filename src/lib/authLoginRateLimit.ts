export const LOGIN_EMAIL_MAX_FAILS = 5;
export const LOGIN_IP_MAX_FAILS = 20;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_EMAIL_LOCK_MS = 15 * 60 * 1000;

export const LOGIN_REASONS = [
  "ok",
  "email_lockout",
  "ip_lockout",
  "invalid_email",
  "invalid_credentials",
] as const;

export type LoginReason = (typeof LOGIN_REASONS)[number];

export type LoginLimitResult = {
  allowed: boolean;
  reason: LoginReason;
  retryAfterSeconds: number;
  emailFailsWindow: number;
  ipFailsWindow: number;
  id?: string;
};

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isPlausibleLoginEmail(email: string): boolean {
  const normalized = normalizeLoginEmail(email);
  const at = normalized.indexOf("@");
  return at > 0 && at < normalized.length - 1;
}

export function parseLoginReason(value: unknown): LoginReason {
  if (typeof value === "string" && (LOGIN_REASONS as readonly string[]).includes(value)) {
    return value as LoginReason;
  }
  return "invalid_credentials";
}

export function formatLoginRetryAfter(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  if (total < 3600) {
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  return `${hours} ч ${String(mins).padStart(2, "0")} мин`;
}

export function loginLimitMessage(
  reason: LoginReason | string,
  retryAfterSeconds: number,
): string {
  const wait = formatLoginRetryAfter(retryAfterSeconds);
  if (reason === "email_lockout" || reason === "ip_lockout") {
    return `Слишком много попыток входа. Попробуйте через ${wait}.`;
  }
  if (reason === "invalid_email") {
    return "Укажите корректный email.";
  }
  return "Неверный логин или пароль";
}

/** Зеркало SQL try_auth_login для unit-тестов. */
export function evaluateLoginLimits(input: {
  nowMs: number;
  emailFailsAtMs: number[];
  ipFailsAtMs: number[];
  applyIp: boolean;
}): LoginLimitResult {
  const windowStart = input.nowMs - LOGIN_WINDOW_MS;
  const emailFails = input.emailFailsAtMs
    .filter((ts) => ts >= windowStart)
    .sort((a, b) => a - b);
  const ipFails = input.ipFailsAtMs
    .filter((ts) => ts >= windowStart)
    .sort((a, b) => a - b);

  if (emailFails.length >= LOGIN_EMAIL_MAX_FAILS) {
    const oldest = emailFails[0]!;
    const retryMs = oldest + LOGIN_EMAIL_LOCK_MS - input.nowMs;
    return {
      allowed: false,
      reason: "email_lockout",
      retryAfterSeconds: Math.max(0, Math.ceil(retryMs / 1000)),
      emailFailsWindow: emailFails.length,
      ipFailsWindow: ipFails.length,
    };
  }

  if (input.applyIp && ipFails.length >= LOGIN_IP_MAX_FAILS) {
    const oldest = ipFails[0]!;
    const retryMs = oldest + LOGIN_WINDOW_MS - input.nowMs;
    return {
      allowed: false,
      reason: "ip_lockout",
      retryAfterSeconds: Math.max(0, Math.ceil(retryMs / 1000)),
      emailFailsWindow: emailFails.length,
      ipFailsWindow: ipFails.length,
    };
  }

  return {
    allowed: true,
    reason: "ok",
    retryAfterSeconds: 0,
    emailFailsWindow: emailFails.length,
    ipFailsWindow: ipFails.length,
  };
}
