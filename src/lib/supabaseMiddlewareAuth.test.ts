import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import {
  hasSupabaseAuthCookie,
  isAuthSessionInvalid,
  isAuthUnavailableError,
} from "./supabaseMiddlewareAuth";

function requestWithCookies(
  cookies: Record<string, string>,
  url = "https://zeip.ru/map",
): NextRequest {
  const header = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  return new NextRequest(url, {
    headers: header ? { cookie: header } : {},
  });
}

describe("hasSupabaseAuthCookie", () => {
  it("detects base and chunked auth cookies", () => {
    assert.equal(
      hasSupabaseAuthCookie(
        requestWithCookies({ "sb-supabase-auth-token": "x" }),
      ),
      true,
    );
    assert.equal(
      hasSupabaseAuthCookie(
        requestWithCookies({ "sb-supabase-auth-token.0": "x" }),
      ),
      true,
    );
    assert.equal(hasSupabaseAuthCookie(requestWithCookies({})), false);
  });
});

describe("isAuthUnavailableError", () => {
  it("treats network and 5xx as unavailable", () => {
    assert.equal(
      isAuthUnavailableError(new Error("fetch failed")),
      true,
    );
    assert.equal(
      isAuthUnavailableError(
        Object.assign(new Error("server"), { status: 503 }),
      ),
      true,
    );
    assert.equal(
      isAuthUnavailableError(
        Object.assign(new Error("bad jwt"), { status: 401 }),
      ),
      false,
    );
  });
});

describe("isAuthSessionInvalid", () => {
  it("treats 401 and jwt errors as invalid session", () => {
    assert.equal(
      isAuthSessionInvalid(
        Object.assign(new Error("Unauthorized"), { status: 401 }),
      ),
      true,
    );
    assert.equal(
      isAuthSessionInvalid(new Error("invalid JWT")),
      true,
    );
    assert.equal(
      isAuthSessionInvalid(new Error("fetch failed")),
      false,
    );
  });
});
