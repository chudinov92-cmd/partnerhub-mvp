import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OTP_SEND_COOLDOWN_SECONDS,
  OTP_SEND_EMAIL_MAX_24H,
  OTP_SEND_IP_MAX_24H,
  OTP_SEND_WINDOW_MS,
  evaluateOtpSendLimits,
  formatOtpRetryAfter,
  nextRetryAfterAfterSuccessfulSend,
  otpSendLimitMessage,
} from "./authOtpRateLimit";

const now = Date.UTC(2026, 8, 13, 12, 0, 0);

describe("formatOtpRetryAfter", () => {
  it("минуты и секунды", () => {
    assert.equal(formatOtpRetryAfter(0), "0:00");
    assert.equal(formatOtpRetryAfter(59), "0:59");
    assert.equal(formatOtpRetryAfter(60), "1:00");
    assert.equal(formatOtpRetryAfter(90), "1:30");
  });

  it("часы", () => {
    assert.equal(formatOtpRetryAfter(3600), "1 ч 00 мин");
    assert.equal(formatOtpRetryAfter(12 * 3600 + 5 * 60), "12 ч 05 мин");
  });
});

describe("evaluateOtpSendLimits", () => {
  it("первая отправка разрешена", () => {
    const result = evaluateOtpSendLimits({
      nowMs: now,
      emailSendsAtMs: [],
      ipSendsAtMs: [],
      applyIp: true,
    });
    assert.equal(result.allowed, true);
    assert.equal(result.reason, "ok");
    assert.equal(result.retryAfterSeconds, 0);
  });

  it("пауза 60 с после последней отправки на email", () => {
    const result = evaluateOtpSendLimits({
      nowMs: now,
      emailSendsAtMs: [now - 30_000],
      ipSendsAtMs: [],
      applyIp: true,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "email_cooldown");
    assert.equal(result.retryAfterSeconds, 30);
  });

  it("через 60 с снова можно", () => {
    const result = evaluateOtpSendLimits({
      nowMs: now,
      emailSendsAtMs: [now - OTP_SEND_COOLDOWN_SECONDS * 1000],
      ipSendsAtMs: [],
      applyIp: true,
    });
    assert.equal(result.allowed, true);
  });

  it("4 отправки на email за 24 ч — запрет до истечения окна", () => {
    const oldest = now - OTP_SEND_WINDOW_MS + 90_000;
    const result = evaluateOtpSendLimits({
      nowMs: now,
      emailSendsAtMs: [
        oldest,
        oldest + 60_000,
        oldest + 120_000,
        oldest + 180_000,
      ],
      ipSendsAtMs: [],
      applyIp: true,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "email_daily");
    assert.equal(result.retryAfterSeconds, 90);
    assert.equal(result.emailSends24h, OTP_SEND_EMAIL_MAX_24H);
  });

  it("отправки старше 24 ч не считаются", () => {
    const result = evaluateOtpSendLimits({
      nowMs: now,
      emailSendsAtMs: [
        now - OTP_SEND_WINDOW_MS - 1_000,
        now - OTP_SEND_WINDOW_MS - 2_000,
        now - OTP_SEND_WINDOW_MS - 3_000,
        now - OTP_SEND_WINDOW_MS - 4_000,
      ],
      ipSendsAtMs: [],
      applyIp: true,
    });
    assert.equal(result.allowed, true);
    assert.equal(result.emailSends24h, 0);
  });

  it("8 отправок с IP за 24 ч — запрет", () => {
    const oldest = now - OTP_SEND_WINDOW_MS + 120_000;
    const ipSendsAtMs = Array.from({ length: OTP_SEND_IP_MAX_24H }, (_, i) =>
      oldest + i * 60_000,
    );
    const result = evaluateOtpSendLimits({
      nowMs: now,
      emailSendsAtMs: [],
      ipSendsAtMs,
      applyIp: true,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "ip_daily");
    assert.equal(result.retryAfterSeconds, 120);
  });

  it("без IP лимит по адресу не применяется", () => {
    const ipSendsAtMs = Array.from({ length: OTP_SEND_IP_MAX_24H }, (_, i) =>
      now - 120_000 - i * 1_000,
    );
    const result = evaluateOtpSendLimits({
      nowMs: now,
      emailSendsAtMs: [],
      ipSendsAtMs,
      applyIp: false,
    });
    assert.equal(result.allowed, true);
    assert.equal(result.ipSends24h, 0);
  });

  it("signup и recovery делят счётчик email", () => {
    const mixed = [now - 10 * 60_000, now - 8 * 60_000, now - 6 * 60_000, now - 4 * 60_000];
    const result = evaluateOtpSendLimits({
      nowMs: now,
      emailSendsAtMs: mixed,
      ipSendsAtMs: [],
      applyIp: true,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "email_daily");
  });

  it("email_daily важнее cooldown", () => {
    const oldest = now - OTP_SEND_WINDOW_MS + 50_000;
    const result = evaluateOtpSendLimits({
      nowMs: now,
      emailSendsAtMs: [oldest, oldest + 1_000, oldest + 2_000, now - 5_000],
      ipSendsAtMs: [],
      applyIp: true,
    });
    assert.equal(result.reason, "email_daily");
  });
});

describe("nextRetryAfterAfterSuccessfulSend", () => {
  it("после 1–3 писем — 60 с", () => {
    assert.equal(nextRetryAfterAfterSuccessfulSend(1), 60);
    assert.equal(nextRetryAfterAfterSuccessfulSend(3), 60);
  });

  it("после 4-го — окно 24 ч", () => {
    assert.equal(nextRetryAfterAfterSuccessfulSend(4), OTP_SEND_WINDOW_MS / 1000);
  });
});

describe("otpSendLimitMessage", () => {
  it("тексты причин", () => {
    assert.match(otpSendLimitMessage("email_cooldown", 45), /через 0:45/);
    assert.match(otpSendLimitMessage("email_daily", 3600), /4 кода за 24 часа/);
    assert.match(otpSendLimitMessage("ip_daily", 120), /лимит 8 за 24 часа/);
  });
});
