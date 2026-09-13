"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchOtpSendStatus,
  isOtpSendLimitedError,
  type OtpSendLimitedError,
} from "@/lib/authOtpSendClient";
import {
  formatOtpRetryAfter,
  isPlausibleOtpEmail,
  otpSendLimitMessage,
  type OtpSendLimitResult,
  type OtpSendReason,
} from "@/lib/authOtpRateLimit";

export function useOtpSendCooldown(email: string, enabled: boolean) {
  const [retryAfter, setRetryAfter] = useState(0);
  const [reason, setReason] = useState<OtpSendReason>("ok");
  const [message, setMessage] = useState<string | null>(null);

  const applyResult = useCallback(
    (result: OtpSendLimitResult, overrideMessage?: string | null) => {
      const seconds = result.allowed
        ? result.retryAfterSeconds
        : Math.max(result.retryAfterSeconds, 1);
      setRetryAfter(seconds);
      setReason(result.reason);
      if (overrideMessage !== undefined) {
        setMessage(overrideMessage);
        return;
      }
      if (seconds > 0) {
        setMessage(otpSendLimitMessage(result.reason, seconds));
      } else {
        setMessage(null);
      }
    },
    [],
  );

  const applyLimitedError = useCallback((err: OtpSendLimitedError) => {
    setRetryAfter(Math.max(err.retryAfterSeconds, 1));
    setReason(err.reason);
    setMessage(err.message);
  }, []);

  const refresh = useCallback(async () => {
    if (!isPlausibleOtpEmail(email)) return;
    try {
      const { result, message: nextMessage } = await fetchOtpSendStatus(email);
      applyResult(result, result.allowed && result.retryAfterSeconds <= 0 ? null : nextMessage);
    } catch {
      // статус не должен ломать форму
    }
  }, [email, applyResult]);

  useEffect(() => {
    if (!enabled || !isPlausibleOtpEmail(email)) return;
    const timer = window.setTimeout(() => {
      void refresh();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [enabled, email, refresh]);

  const ticking = retryAfter > 0;
  useEffect(() => {
    if (!ticking) return;
    const timer = window.setInterval(() => {
      setRetryAfter((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [ticking]);

  useEffect(() => {
    if (retryAfter <= 0) {
      setMessage(null);
      return;
    }
    const displayReason = reason === "ok" ? "email_cooldown" : reason;
    setMessage(otpSendLimitMessage(displayReason, retryAfter));
  }, [retryAfter, reason]);

  const countdownLabel =
    retryAfter > 0 ? `Повторно запросить код можно через ${formatOtpRetryAfter(retryAfter)}.` : null;

  return {
    retryAfter,
    blocked: retryAfter > 0,
    reason,
    message,
    countdownLabel,
    applyResult,
    applyLimitedError,
    refresh,
    isLimitedError: isOtpSendLimitedError,
  };
}
