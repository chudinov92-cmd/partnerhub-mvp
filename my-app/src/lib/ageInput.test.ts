import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AGE_MAX,
  AGE_MIN,
  formatAgeInputValue,
  isValidAge,
  parseAgeInput,
} from "./ageInput";

describe("parseAgeInput", () => {
  it("пустая строка → null", () => {
    assert.equal(parseAgeInput(""), null);
  });

  it("ведущие нули → null или число без нуля", () => {
    assert.equal(parseAgeInput("0"), null);
    assert.equal(parseAgeInput("00"), null);
    assert.equal(parseAgeInput("01"), 1);
    assert.equal(parseAgeInput("09"), 9);
  });

  it("обрезает до 2 цифр", () => {
    assert.equal(parseAgeInput("3243"), 32);
    assert.equal(parseAgeInput("999"), 99);
  });

  it("игнорирует нецифровые символы", () => {
    assert.equal(parseAgeInput("2a5"), 25);
    assert.equal(parseAgeInput(" 3 "), 3);
  });

  it("принимает границы 1–99", () => {
    assert.equal(parseAgeInput("1"), 1);
    assert.equal(parseAgeInput("99"), 99);
  });
});

describe("isValidAge", () => {
  it("валидные значения", () => {
    assert.equal(isValidAge(1), true);
    assert.equal(isValidAge(99), true);
    assert.equal(isValidAge(42), true);
  });

  it("невалидные значения", () => {
    assert.equal(isValidAge(null), false);
    assert.equal(isValidAge(undefined), false);
    assert.equal(isValidAge(0), false);
    assert.equal(isValidAge(100), false);
    assert.equal(isValidAge(80.5), false);
  });
});

describe("formatAgeInputValue", () => {
  it("null/undefined → пустая строка", () => {
    assert.equal(formatAgeInputValue(null), "");
    assert.equal(formatAgeInputValue(undefined), "");
  });

  it("число → строка", () => {
    assert.equal(formatAgeInputValue(25), "25");
  });
});

describe("constants", () => {
  it("диапазон 1–99", () => {
    assert.equal(AGE_MIN, 1);
    assert.equal(AGE_MAX, 99);
  });
});
