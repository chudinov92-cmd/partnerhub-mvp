import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authEmailCallbackPendingInUrl,
  classifyAuthEmailCallback,
  hasAuthEmailCallbackParams,
  parseAuthEmailCallbackParams,
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
});
