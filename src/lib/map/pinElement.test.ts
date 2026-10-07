import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import {
  escapeHtmlChar,
  escapeHtmlColor,
  escapeHtmlText,
  pinInitial,
  markerVisualKey,
} from "./pinElement";

describe("escapeHtmlChar", () => {
  it("escapes &", () => assert.strictEqual(escapeHtmlChar("&"), "&amp;"));
  it("escapes <", () => assert.strictEqual(escapeHtmlChar("<"), "&lt;"));
  it("escapes >", () => assert.strictEqual(escapeHtmlChar(">"), "&gt;"));
  it('escapes "', () => assert.strictEqual(escapeHtmlChar('"'), "&quot;"));
  it("passes regular chars through", () => {
    assert.strictEqual(escapeHtmlChar("A"), "A");
    assert.strictEqual(escapeHtmlChar("1"), "1");
    assert.strictEqual(escapeHtmlChar(" "), " ");
  });
});

describe("escapeHtmlColor", () => {
  it("accepts valid hex", () => {
    assert.strictEqual(escapeHtmlColor("#10B981", "red"), "#10B981");
    assert.strictEqual(escapeHtmlColor("#ffffff", "red"), "#ffffff");
    assert.strictEqual(escapeHtmlColor("#000000", "red"), "#000000");
  });
  it("rejects invalid hex and falls back", () => {
    assert.strictEqual(escapeHtmlColor("red", "#F00"), "#F00");
    assert.strictEqual(escapeHtmlColor("#GGGGGG", "fallback"), "fallback");
    assert.strictEqual(escapeHtmlColor("#12345", "fb"), "fb");
    assert.strictEqual(escapeHtmlColor("", "fb"), "fb");
  });
});

describe("escapeHtmlText", () => {
  it("escapes all dangerous chars", () => {
    assert.strictEqual(escapeHtmlText('<script>alert("xss & more")</script>'), "&lt;script&gt;alert(&quot;xss &amp; more&quot;)&lt;/script&gt;");
  });
  it("leaves safe text unchanged", () => {
    assert.strictEqual(escapeHtmlText("Hello, world!"), "Hello, world!");
  });
  it("handles empty string", () => {
    assert.strictEqual(escapeHtmlText(""), "");
  });
});

describe("pinInitial", () => {
  it("returns uppercase first letter", () => {
    assert.strictEqual(pinInitial("Иван"), "И");
    assert.strictEqual(pinInitial("John"), "J");
  });
  it("returns ? for empty/null/undefined", () => {
    assert.strictEqual(pinInitial(""), "?");
    assert.strictEqual(pinInitial(null), "?");
    assert.strictEqual(pinInitial(undefined), "?");
  });
  it("handles whitespace", () => {
    assert.strictEqual(pinInitial("  Анна "), "А");
  });
  it("escapes dangerous first char", () => {
    assert.strictEqual(pinInitial("<test>"), "&lt;");
  });
});

describe("markerVisualKey", () => {
  it("produces deterministic key", () => {
    const a = markerVisualKey({ isOwn: true, isViewed: false, isFocused: false, subscriptionPlan: "pro", initial: "И" });
    const b = markerVisualKey({ isOwn: true, isViewed: false, isFocused: false, subscriptionPlan: "pro", initial: "И" });
    assert.strictEqual(a, b);
    assert.strictEqual(a, "true:false:false:pro:И");
  });
  it("differentiates by each field", () => {
    const base = { isOwn: false, isViewed: false, isFocused: false, subscriptionPlan: "free", initial: "A" };
    const keys = new Set<string>();
    keys.add(markerVisualKey(base));
    keys.add(markerVisualKey({ ...base, isOwn: true }));
    keys.add(markerVisualKey({ ...base, isViewed: true }));
    keys.add(markerVisualKey({ ...base, isFocused: true }));
    keys.add(markerVisualKey({ ...base, subscriptionPlan: "pro" }));
    keys.add(markerVisualKey({ ...base, initial: "B" }));
    assert.strictEqual(keys.size, 6);
  });
});