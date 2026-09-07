import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { comparePlanRank, planRank } from "./subscriptionPlans.ts";

describe("planRank", () => {
  it("Pro+ выше Pro и Free", () => {
    assert.equal(planRank("pro_plus"), 2);
    assert.equal(planRank("pro"), 1);
    assert.equal(planRank("free"), 0);
  });
});

describe("comparePlanRank", () => {
  it("Pro+ идёт перед Pro", () => {
    assert.equal(comparePlanRank("pro_plus", "pro"), -1);
    assert.equal(comparePlanRank("pro", "pro_plus"), 1);
  });

  it("Pro идёт перед Free", () => {
    assert.equal(comparePlanRank("pro", "free"), -1);
    assert.equal(comparePlanRank("free", "pro"), 1);
  });

  it("одинаковый тариф — 0", () => {
    assert.equal(comparePlanRank("pro", "pro"), 0);
    assert.equal(comparePlanRank("free", "free"), 0);
  });
});
