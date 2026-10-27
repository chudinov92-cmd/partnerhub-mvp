import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultPioneerMaxForCity } from "./pioneerLimits";

describe("defaultPioneerMaxForCity", () => {
  it("Пермь — 100", () => {
    assert.equal(defaultPioneerMaxForCity("Пермь"), 100);
  });

  it("другой город — 50", () => {
    assert.equal(defaultPioneerMaxForCity("Москва"), 50);
  });
});
