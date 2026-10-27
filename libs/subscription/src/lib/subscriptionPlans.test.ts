import {
  comparePlanRank,
  getEffectiveSubscriptionPlan,
  isActiveProProfile,
  planRank,
} from "./subscriptionPlans";

describe("planRank", () => {
  it("Pro+ выше Pro и Free", () => {
    expect(planRank("pro_plus")).toBe(2);
    expect(planRank("pro")).toBe(1);
    expect(planRank("free")).toBe(0);
  });
});

describe("isActiveProProfile", () => {
  it("false без строки или при is_pro=false", () => {
    expect(isActiveProProfile(null)).toBe(false);
    expect(isActiveProProfile({ is_pro: false })).toBe(false);
  });

  it("true при is_pro без даты окончания", () => {
    expect(isActiveProProfile({ is_pro: true })).toBe(true);
  });

  it("false при истёкшей дате", () => {
    expect(
      isActiveProProfile({
        is_pro: true,
        pro_expires_at: "2020-01-01T00:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("true при дате в будущем", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(
      isActiveProProfile({ is_pro: true, pro_expires_at: future }),
    ).toBe(true);
  });
});

describe("getEffectiveSubscriptionPlan", () => {
  it("free если подписка не активна", () => {
    expect(getEffectiveSubscriptionPlan({ is_pro: false })).toBe("free");
  });

  it("pro_plus если активен pro_plus", () => {
    expect(
      getEffectiveSubscriptionPlan({
        is_pro: true,
        subscription_plan: "pro_plus",
      }),
    ).toBe("pro_plus");
  });
});

describe("comparePlanRank", () => {
  it("Pro+ идёт перед Pro", () => {
    expect(comparePlanRank("pro_plus", "pro")).toBe(-1);
    expect(comparePlanRank("pro", "pro_plus")).toBe(1);
  });

  it("Pro идёт перед Free", () => {
    expect(comparePlanRank("pro", "free")).toBe(-1);
    expect(comparePlanRank("free", "pro")).toBe(1);
  });

  it("одинаковый тариф — 0", () => {
    expect(comparePlanRank("pro", "pro")).toBe(0);
    expect(comparePlanRank("free", "free")).toBe(0);
  });
});
