import { describe, expect, it } from "vitest";
import { defaultFilterOption, shouldShowSearch } from "./types";

describe("select/types", () => {
  it("shouldShowSearch when searchable or long list", () => {
    expect(shouldShowSearch(false, 8)).toBe(false);
    expect(shouldShowSearch(false, 9)).toBe(true);
    expect(shouldShowSearch(true, 3)).toBe(true);
  });

  it("defaultFilterOption matches substring", () => {
    expect(
      defaultFilterOption({ value: "a", label: "Генеральный директор" }, "ген"),
    ).toBe(true);
    expect(
      defaultFilterOption({ value: "a", label: "Генеральный директор" }, "xyz"),
    ).toBe(false);
  });
});
