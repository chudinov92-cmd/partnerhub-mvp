import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isSpecificCity,
  shouldShowCityOnboarding,
} from "./cityOnboarding.ts";

describe("isSpecificCity", () => {
  it("Россия — не конкретный город", () => {
    assert.equal(isSpecificCity("Россия"), false);
  });

  it("Пермь — конкретный город", () => {
    assert.equal(isSpecificCity("Пермь"), true);
  });
});

describe("shouldShowCityOnboarding", () => {
  it("скрыта после acknowledge", () => {
    assert.equal(
      shouldShowCityOnboarding({
        selectedCity: "Россия",
        profileCity: null,
        isAuthed: false,
        acknowledged: true,
      }),
      false,
    );
  });

  it("гость с Россией — показать", () => {
    assert.equal(
      shouldShowCityOnboarding({
        selectedCity: "Россия",
        profileCity: null,
        isAuthed: false,
        acknowledged: false,
      }),
      true,
    );
  });

  it("гость с конкретным городом — скрыта", () => {
    assert.equal(
      shouldShowCityOnboarding({
        selectedCity: "Пермь",
        profileCity: null,
        isAuthed: false,
        acknowledged: false,
      }),
      false,
    );
  });

  it("authed с городом в профиле — скрыта", () => {
    assert.equal(
      shouldShowCityOnboarding({
        selectedCity: "Россия",
        profileCity: "Москва",
        isAuthed: true,
        acknowledged: false,
      }),
      false,
    );
  });

  it("authed без города в профиле — скрыта (только для гостей)", () => {
    assert.equal(
      shouldShowCityOnboarding({
        selectedCity: "Россия",
        profileCity: null,
        isAuthed: true,
        acknowledged: false,
      }),
      false,
    );
  });

  it("authed с конкретным городом в селекторе — скрыта", () => {
    assert.equal(
      shouldShowCityOnboarding({
        selectedCity: "Пермь",
        profileCity: "",
        isAuthed: true,
        acknowledged: false,
      }),
      false,
    );
  });
});
