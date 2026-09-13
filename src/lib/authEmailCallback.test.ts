import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authEmailCallbackErrorMessage,
  authEmailCallbackPendingInUrl,
  authOtpVerifyErrorMessage,
  classifyAuthEmailCallback,
  consumedOtpUserMessage,
  extractAuthErrorTexts,
  hasAuthEmailCallbackParams,
  isConsumedOtpErrorText,
  isOtpVerifyError,
  isRecoveryEmailCallback,
  parseAuthEmailCallbackParams,
  SIGNUP_OTP_VERIFY_ERROR,
} from "./authEmailCallback.ts";

describe("parseAuthEmailCallbackParams", () => {
  it("implicit signup hash", () => {
    const params = parseAuthEmailCallbackParams(
      "",
      "#access_token=abc&refresh_token=def&type=signup&expires_in=3600",
    );
    assert.equal(params.access_token, "abc");
    assert.equal(params.refresh_token, "def");
    assert.equal(params.type, "signup");
    assert.equal(classifyAuthEmailCallback(params), "implicit");
  });

  it("PKCE code in query", () => {
    const params = parseAuthEmailCallbackParams("?code=xyz", "");
    assert.equal(params.code, "xyz");
    assert.equal(classifyAuthEmailCallback(params), "pkce_code");
  });

  it("token_hash + type", () => {
    const params = parseAuthEmailCallbackParams(
      "?token_hash=hash123&type=signup",
      "",
    );
    assert.equal(classifyAuthEmailCallback(params), "token_hash");
  });

  it("token_hash + type=recovery", () => {
    const params = parseAuthEmailCallbackParams(
      "?token_hash=hash123&type=recovery",
      "",
    );
    assert.equal(classifyAuthEmailCallback(params), "token_hash");
    assert.equal(params.type, "recovery");
    assert.equal(params.token_hash, "hash123");
  });

  it("error in query", () => {
    const params = parseAuthEmailCallbackParams(
      "?error=access_denied&error_description=otp_expired",
      "",
    );
    assert.equal(classifyAuthEmailCallback(params), "error");
  });
});

describe("authEmailCallbackPendingInUrl", () => {
  it("signup hash — pending", () => {
    assert.equal(
      authEmailCallbackPendingInUrl(
        "",
        "#access_token=a&refresh_token=b&type=signup",
      ),
      true,
    );
  });

  it("recovery — не signup callback", () => {
    assert.equal(
      authEmailCallbackPendingInUrl("", "#type=recovery&access_token=a"),
      false,
    );
  });

  it("пустой URL — false", () => {
    assert.equal(authEmailCallbackPendingInUrl("", ""), false);
    assert.equal(hasAuthEmailCallbackParams({}), false);
  });

  it("token_hash recovery — не signup callback (обрабатывает reset-password)", () => {
    assert.equal(
      authEmailCallbackPendingInUrl("?token_hash=abc&type=recovery", ""),
      false,
    );
    assert.equal(
      isRecoveryEmailCallback({ token_hash: "abc", type: "recovery" }),
      true,
    );
  });
});

describe("consumed OTP messages", () => {
  it("распознаёт истекший recovery token", () => {
    assert.equal(isConsumedOtpErrorText("Email link is invalid or has expired"), true);
    assert.equal(isConsumedOtpErrorText("Token has expired or is invalid"), true);
    const msg = authEmailCallbackErrorMessage({
      error_description: "otp_expired",
      type: "recovery",
    });
    assert.equal(msg, consumedOtpUserMessage("recovery"));
    assert.match(msg, /код из письма/i);
  });
});

describe("auth OTP verify errors", () => {
  it("извлекает тексты из ответа GoTrue verifyOtp", () => {
    const texts = extractAuthErrorTexts({
      code: 403,
      error_code: "otp_expired",
      msg: "Token has expired or is invalid",
    });
    assert.deepEqual(new Set(texts), new Set([
      "403",
      "otp_expired",
      "Token has expired or is invalid",
    ]));
  });

  it("распознаёт otp_expired от verifyOtp", () => {
    assert.equal(
      isOtpVerifyError({
        code: 403,
        error_code: "otp_expired",
        msg: "Token has expired or is invalid",
      }),
      true,
    );
  });

  it("signup verify message не про отправку письма", () => {
    assert.equal(authOtpVerifyErrorMessage("signup"), SIGNUP_OTP_VERIFY_ERROR);
    assert.match(authOtpVerifyErrorMessage("signup"), /Код неверный/i);
    assert.doesNotMatch(authOtpVerifyErrorMessage("signup"), /отправить письмо/i);
  });
});
