import {
  loginLimitMessage,
  parseLoginReason,
  type LoginLimitResult,
  type LoginReason,
} from "@/lib/authLoginRateLimit";

export class AuthLoginLimitedError extends Error {
  readonly reason: LoginReason;
  readonly retryAfterSeconds: number;

  constructor(reason: LoginReason, retryAfterSeconds: number, message: string) {
    super(message);
    this.name = "AuthLoginLimitedError";
    this.reason = reason;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function isAuthLoginLimitedError(err: unknown): err is AuthLoginLimitedError {
  return err instanceof AuthLoginLimitedError;
}

type ApiBody = {
  allowed?: unknown;
  reason?: unknown;
  retry_after_seconds?: unknown;
  message?: unknown;
  error?: unknown;
};

function resultFromBody(body: ApiBody, status: number): LoginLimitResult {
  const retryAfterSeconds =
    typeof body.retry_after_seconds === "number"
      ? Math.max(0, Math.ceil(body.retry_after_seconds))
      : 0;
  const reason = parseLoginReason(body.reason);
  const allowed = body.allowed === true && status < 400;
  return {
    allowed,
    reason: allowed ? "ok" : reason === "ok" ? "email_lockout" : reason,
    retryAfterSeconds,
    emailFailsWindow: 0,
    ipFailsWindow: 0,
  };
}

export async function requestAuthLogin(email: string, password: string): Promise<void> {
  const res = await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email: email.trim(), password }),
  });

  let body: ApiBody = {};
  try {
    body = (await res.json()) as ApiBody;
  } catch {
    body = {};
  }

  if (res.status === 429) {
    const result = resultFromBody(body, res.status);
    const message =
      typeof body.message === "string" && body.message.trim()
        ? body.message.trim()
        : loginLimitMessage(result.reason, result.retryAfterSeconds);
    throw new AuthLoginLimitedError(
      result.reason,
      result.retryAfterSeconds,
      message,
    );
  }

  if (!res.ok) {
    const message =
      typeof body.error === "string" && body.error.trim()
        ? body.error.trim()
        : "Неверный логин или пароль";
    throw new Error(message);
  }
}
