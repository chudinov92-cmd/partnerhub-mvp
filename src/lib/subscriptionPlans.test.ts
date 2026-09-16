import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  comparePlanRank,
  getEffectiveSubscriptionPlan,
  isActiveProProfile,
  planRank,
} from "./subscriptionPlans";

describe("planRank", () => {
  it("Pro+ выше Pro и Free", () => {
    assert.equal(planRank("pro_plus"), 2);
    assert.equal(planRank("pro"), 1);
    assert.equal(planRank("free"), 0);
  });
});

describe("isActiveProProfile", () => {
  it("false без строки или при is_pro=false", () => {
    assert.equal(isActiveProProfile(null), false);
    assert.equal(isActiveProProfile({ is_pro: false }), false);
  });

  it("true при is_pro без даты окончания", () => {
    assert.equal(isActiveProProfile({ is_pro: true }), true);
  });

  it("false при истёкшей дате", () => {
    assert.equal(
      isActiveProProfile({
        is_pro: true,
        pro_expires_at: "2020-01-01T00:00:00.000Z",
      }),
      false,
    );
  });

  it("true при дате в будущем", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    assert.equal(
      isActiveProProfile({ is_pro: true, pro_expires_at: future }),
      true,
    );
  });
});

describe("getEffectiveSubscriptionPlan", () => {
  it("free если подписка не активна", () => {
    assert.equal(getEffectiveSubscriptionPlan({ is_pro: false }), "free");
  });

  it("pro_plus если активен pro_plus", () => {
    assert.equal(
      getEffectiveSubscriptionPlan({
        is_pro: true,
        subscription_plan: "pro_plus",
      }),
      "pro_plus",
    );
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
