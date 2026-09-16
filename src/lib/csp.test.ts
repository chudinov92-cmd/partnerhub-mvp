import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextResponse } from "next/server";
import {
  applySecurityHeaders,
  buildCspHeader,
  INLINE_SCRIPT_HASHES,
  INLINE_SCRIPT_SOURCES,
  sha256ScriptHash,
} from "./csp";

describe("csp inline script hashes", () => {
  it("matches precomputed sha256 for recovery and JSON-LD", async () => {
    assert.equal(INLINE_SCRIPT_HASHES.length, INLINE_SCRIPT_SOURCES.length);

    for (let i = 0; i < INLINE_SCRIPT_SOURCES.length; i += 1) {
      const computed = await sha256ScriptHash(INLINE_SCRIPT_SOURCES[i]!);
      assert.equal(computed, INLINE_SCRIPT_HASHES[i]);
    }
  });
});

describe("buildCspHeader", () => {
  it("includes nonce, strict-dynamic and inline hashes", () => {
    const csp = buildCspHeader("test-nonce-value");
    assert.match(csp, /'nonce-test-nonce-value'/);
    assert.match(csp, /'strict-dynamic'/);
    for (const hash of INLINE_SCRIPT_HASHES) {
      assert.match(csp, new RegExp(hash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });

  it("allows Supabase and VK Maps in connect-src", () => {
    const prev = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.zeip.ru";

    try {
      const csp = buildCspHeader("n");
      assert.match(csp, /connect-src[^;]*https:\/\/supabase\.zeip\.ru/);
      assert.match(csp, /connect-src[^;]*wss:\/\/supabase\.zeip\.ru/);
      assert.match(csp, /connect-src[^;]*https:\/\/maps\.vk\.com/);
    } finally {
      if (prev === undefined) {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      } else {
        process.env.NEXT_PUBLIC_SUPABASE_URL = prev;
      }
    }
  });

  it("includes frame-ancestors none and object-src none", () => {
    const csp = buildCspHeader("n");
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /object-src 'none'/);
  });
});

describe("applySecurityHeaders", () => {
  it("sets X-Frame-Options DENY", () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevDisableHsts = process.env.CSP_DISABLE_HSTS;
    process.env.NODE_ENV = "production";
    delete process.env.CSP_DISABLE_HSTS;

    try {
      const res = applySecurityHeaders(NextResponse.next(), "nonce-test");
      assert.equal(res.headers.get("X-Frame-Options"), "DENY");
      assert.match(
        res.headers.get("Strict-Transport-Security") ?? "",
        /max-age=63072000/,
      );
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
      if (prevDisableHsts === undefined) {
        delete process.env.CSP_DISABLE_HSTS;
      } else {
        process.env.CSP_DISABLE_HSTS = prevDisableHsts;
      }
    }
  });
});
