import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { splitMessageWithLinks } from "./linkifyMessage.ts";
import {
  buildProfileShortPath,
  buildProfileShortUrl,
  parseZeipProfileLink,
  PROFILE_SHARE_CODE_REGEX,
} from "./profileShare.ts";

describe("profileShare short links", () => {
  it("buildProfileShortPath encodes code", () => {
    assert.equal(buildProfileShortPath("Ab3xK9mn"), "/p/Ab3xK9mn");
  });

  it("buildProfileShortUrl uses site origin fallback", () => {
    assert.equal(
      buildProfileShortUrl("Ab3xK9mn"),
      "https://zeip.ru/p/Ab3xK9mn",
    );
  });

  it("PROFILE_SHARE_CODE_REGEX accepts valid alphabet", () => {
    assert.match("Ab3xK9mn", PROFILE_SHARE_CODE_REGEX);
    assert.doesNotMatch("Ab3xK0mn", PROFILE_SHARE_CODE_REGEX);
    assert.doesNotMatch("short", PROFILE_SHARE_CODE_REGEX);
  });

  it("parseZeipProfileLink recognizes /p/code", () => {
    assert.deepEqual(parseZeipProfileLink("https://zeip.ru/p/Ab3xK9mn"), {
      kind: "share_code",
      code: "Ab3xK9mn",
    });
    assert.deepEqual(parseZeipProfileLink("/p/Ab3xK9mn"), {
      kind: "share_code",
      code: "Ab3xK9mn",
    });
  });

  it("parseZeipProfileLink recognizes /map?profile=uuid", () => {
    const id = "5620dc2e-ee8d-4ae4-b736-49ef40e96883";
    assert.deepEqual(
      parseZeipProfileLink(`https://zeip.ru/map?profile=${id}`),
      { kind: "profile_id", profileId: id },
    );
    assert.deepEqual(parseZeipProfileLink(`/map?profile=${id}`), {
      kind: "profile_id",
      profileId: id,
    });
  });

  it("parseZeipProfileLink ignores external URLs", () => {
    assert.equal(
      parseZeipProfileLink("https://example.com/p/Ab3xK9mn"),
      null,
    );
  });
});

describe("linkifyMessage", () => {
  it("splits text with https URL", () => {
    assert.deepEqual(
      splitMessageWithLinks("Смотри https://zeip.ru/p/Ab3xK9mn ок?"),
      [
        { type: "text", value: "Смотри " },
        {
          type: "url",
          value: "https://zeip.ru/p/Ab3xK9mn",
          href: "https://zeip.ru/p/Ab3xK9mn",
        },
        { type: "text", value: " ок?" },
      ],
    );
  });

  it("strips trailing punctuation from URL", () => {
    assert.deepEqual(
      splitMessageWithLinks("https://zeip.ru/p/Ab3xK9mn."),
      [
        {
          type: "url",
          value: "https://zeip.ru/p/Ab3xK9mn",
          href: "https://zeip.ru/p/Ab3xK9mn",
        },
        { type: "text", value: "." },
      ],
    );
  });

  it("normalizes www links", () => {
    const parts = splitMessageWithLinks("www.zeip.ru/map");
    assert.equal(parts.length, 1);
    assert.equal(parts[0]?.type, "url");
    if (parts[0]?.type === "url") {
      assert.equal(parts[0].href, "https://www.zeip.ru/map");
    }
  });
});
