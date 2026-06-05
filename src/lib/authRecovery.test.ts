import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPasswordRecoverySession,
  recoveryTypeInUrl,
} from "./authRecovery.ts";
import type { Session } from "@supabase/supabase-js";

describe("recoveryTypeInUrl", () => {
  it("голый ?code= не считается recovery", () => {
    assert.equal(recoveryTypeInUrl("?code=abc", ""), false);
  });

  it("?type=recovery&code= считается recovery", () => {
    assert.equal(recoveryTypeInUrl("?type=recovery&code=abc", ""), true);
  });

  it("#type=recovery&access_token= считается recovery", () => {
    assert.equal(
      recoveryTypeInUrl("", "#type=recovery&access_token=xyz"),
      true,
    );
  });

  it("signup implicit hash не считается recovery", () => {
    assert.equal(
      recoveryTypeInUrl("", "#access_token=xyz&type=signup"),
      false,
    );
  });
});

describe("isPasswordRecoverySession", () => {
  function sessionWithAmr(amr: unknown): Session {
    const payload = btoa(JSON.stringify({ amr }));
    const token = `header.${payload}.sig`;
    return {
      access_token: token,
      user: { id: "u1" },
    } as Session;
  }

  it("amr recovery → true", () => {
    assert.equal(
      isPasswordRecoverySession(sessionWithAmr([{ method: "recovery" }])),
      true,
    );
  });

  it("amr password → false", () => {
    assert.equal(
      isPasswordRecoverySession(sessionWithAmr([{ method: "password" }])),
      false,
    );
  });
});
