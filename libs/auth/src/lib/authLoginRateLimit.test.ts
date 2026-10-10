import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LOGIN_EMAIL_MAX_FAILS,
  LOGIN_IP_MAX_FAILS,
  LOGIN_WINDOW_MS,
  evaluateLoginLimits,
  formatLoginRetryAfter,
  loginLimitMessage,
} from "./authLoginRateLimit";

const now = Date.UTC(2026, 8, 16, 12, 0, 0);

describe("formatLoginRetryAfter", () => {
  it("минуты и секунды", () => {
    assert.equal(formatLoginRetryAfter(90), "1:30");
  });
});

describe("evaluateLoginLimits", () => {
  it("первая попытка разрешена", () => {
    const result = evaluateLoginLimits({
      nowMs: now,
      emailFailsAtMs: [],
      ipFailsAtMs: [],
      applyIp: true,
    });
    assert.equal(result.allowed, true);
    assert.equal(result.reason, "ok");
  });

  it("5 неудач на email — lockout", () => {
    const oldest = now - 10 * 60_000;
    const emailFailsAtMs = Array.from({ length: LOGIN_EMAIL_MAX_FAILS }, (_, i) =>
      oldest + i * 30_000,
    );
    const result = evaluateLoginLimits({
      nowMs: now,
      emailFailsAtMs,
      ipFailsAtMs: [],
      applyIp: true,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "email_lockout");
    assert.equal(result.retryAfterSeconds, 5 * 60);
  });

  it("20 неудач с IP — lockout", () => {
    const oldest = now - LOGIN_WINDOW_MS + 60_000;
    const ipFailsAtMs = Array.from({ length: LOGIN_IP_MAX_FAILS }, (_, i) =>
      oldest + i * 1_000,
    );
    const result = evaluateLoginLimits({
      nowMs: now,
      emailFailsAtMs: [],
      ipFailsAtMs,
      applyIp: true,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "ip_lockout");
    assert.equal(result.retryAfterSeconds, 60);
  });

  it("без IP лимит по адресу не применяется", () => {
    const ipFailsAtMs = Array.from({ length: LOGIN_IP_MAX_FAILS }, (_, i) =>
      now - 60_000 - i * 1_000,
    );
    const result = evaluateLoginLimits({
      nowMs: now,
      emailFailsAtMs: [],
      ipFailsAtMs,
      applyIp: false,
    });
    assert.equal(result.allowed, true);
  });
});

describe("loginLimitMessage", () => {
  it("lockout и credentials", () => {
    assert.match(loginLimitMessage("email_lockout", 300), /Слишком много попыток/);
    assert.equal(loginLimitMessage("invalid_credentials", 0), "Неверный логин или пароль");
  });
});
