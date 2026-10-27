import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldApplyProfileCity } from "./profileCitySelection";

describe("shouldApplyProfileCity", () => {
  it("профильный город применяется, когда карта на России и ручного выбора нет", () => {
    assert.equal(
      shouldApplyProfileCity({
        profileCity: "Пермь",
        selectedCity: "Россия",
        userPickedCity: false,
      }),
      true,
    );
  });

  it("профильный город применяется, когда в localStorage выбор из прошлой сессии", () => {
    // По документации city-onboarding: после нового входа карта сбрасывается
    // на profiles.city.
    assert.equal(
      shouldApplyProfileCity({
        profileCity: "Пермь",
        selectedCity: "Москва",
        userPickedCity: false,
      }),
      true,
    );
  });

  it("ручной выбор пользователя не перетирается профилем", () => {
    assert.equal(
      shouldApplyProfileCity({
        profileCity: "Пермь",
        selectedCity: "Москва",
        userPickedCity: true,
      }),
      false,
    );
  });

  it("город уже применён — false (нет лишних ререндеров)", () => {
    assert.equal(
      shouldApplyProfileCity({
        profileCity: "Пермь",
        selectedCity: "Пермь",
        userPickedCity: false,
      }),
      false,
    );
  });

  it("пустой город профиля — false", () => {
    assert.equal(
      shouldApplyProfileCity({
        profileCity: null,
        selectedCity: "Россия",
        userPickedCity: false,
      }),
      false,
    );
    assert.equal(
      shouldApplyProfileCity({
        profileCity: "",
        selectedCity: "Россия",
        userPickedCity: false,
      }),
      false,
    );
    assert.equal(
      shouldApplyProfileCity({
        profileCity: "   ",
        selectedCity: "Россия",
        userPickedCity: false,
      }),
      false,
    );
  });
});