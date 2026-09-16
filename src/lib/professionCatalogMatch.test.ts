import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ProfessionCatalogRow } from "@/lib/professionCatalog.types";
import {
  findProfessionByKey,
  findSimilarProfessions,
  normalizeProfessionKey,
  resolveProfessionInput,
  shouldUpsertProfession,
} from "./professionCatalogMatch";

const catalog: ProfessionCatalogRow[] = [
  { label: "Дизайнер" },
  { label: "Программист" },
  { label: "UX/UI-дизайнер" },
];

describe("normalizeProfessionKey", () => {
  it("trims and lowercases", () => {
    assert.equal(normalizeProfessionKey("  Дизайнер  "), "дизайнер");
  });
});

describe("findProfessionByKey", () => {
  it("matches regardless of case", () => {
    assert.equal(findProfessionByKey(catalog, "дизайнер")?.label, "Дизайнер");
  });
});

describe("resolveProfessionInput", () => {
  it("returns canonical label", () => {
    assert.equal(resolveProfessionInput(catalog, "ДИЗАЙНЕР"), "Дизайнер");
  });

  it("returns null for unknown profession", () => {
    assert.equal(resolveProfessionInput(catalog, "Космонавт"), null);
  });
});

describe("shouldUpsertProfession", () => {
  it("returns false for existing key", () => {
    assert.equal(shouldUpsertProfession(catalog, "дизайнер"), false);
  });

  it("returns true for new profession", () => {
    assert.equal(shouldUpsertProfession(catalog, "Космонавт"), true);
  });
});

describe("findSimilarProfessions", () => {
  it("finds typo match", () => {
    const matches = findSimilarProfessions(catalog, "Дизайнерр", { limit: 1 });
    assert.equal(matches[0]?.label, "Дизайнер");
  });

  it("returns empty for unrelated input", () => {
    assert.deepEqual(findSimilarProfessions(catalog, "xyzabc"), []);
  });

  it("returns empty for exact key match", () => {
    assert.deepEqual(findSimilarProfessions(catalog, "дизайнер"), []);
  });
});
