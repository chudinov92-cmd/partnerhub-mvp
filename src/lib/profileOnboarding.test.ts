import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isProfileCityFilled,
  shouldShowProfileOnboarding,
} from "./profileOnboarding.ts";

describe("isProfileCityFilled", () => {
  it("пустой город — false", () => {
    assert.equal(isProfileCityFilled(null), false);
    assert.equal(isProfileCityFilled(""), false);
    assert.equal(isProfileCityFilled("  "), false);
  });

  it("заполненный город — true", () => {
    assert.equal(isProfileCityFilled("Пермь"), true);
  });
});

describe("shouldShowProfileOnboarding", () => {
  it("authed на /map без города — показать", () => {
    assert.equal(
      shouldShowProfileOnboarding({
        pathname: "/map",
        isAuthed: true,
        profileCity: null,
      }),
      true,
    );
  });

  it("authed на /map с городом — скрыта", () => {
    assert.equal(
      shouldShowProfileOnboarding({
        pathname: "/map",
        isAuthed: true,
        profileCity: "Москва",
      }),
      false,
    );
  });

  it("гость на /map — скрыта", () => {
    assert.equal(
      shouldShowProfileOnboarding({
        pathname: "/map",
        isAuthed: false,
        profileCity: null,
      }),
      false,
    );
  });

  it("authed не на /map — скрыта", () => {
    assert.equal(
      shouldShowProfileOnboarding({
        pathname: "/profile",
        isAuthed: true,
        profileCity: null,
      }),
      false,
    );
  });
});
