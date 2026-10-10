import { describe, it } from "node:test";
import assert from "node:assert";
import {
  hashToSeed,
  mulberry32,
  obfuscateLatLngWithinRadius,
} from "./geoPrivacy";

describe("hashToSeed", () => {
  it("deterministic: same input → same output", () => {
    assert.strictEqual(hashToSeed("abc"), hashToSeed("abc"));
  });

  it("different inputs → different outputs", () => {
    assert.notStrictEqual(hashToSeed("abc"), hashToSeed("abd"));
  });

  it("empty string", () => {
    assert.strictEqual(typeof hashToSeed(""), "number");
  });

  it("output is unsigned 32-bit integer", () => {
    const h = hashToSeed("test-user-id");
    assert.ok(h >= 0 && h <= 0xffffffff);
  });
});

describe("mulberry32", () => {
  it("returns values in [0, 1)", () => {
    const rnd = mulberry32(12345);
    for (let i = 0; i < 100; i++) {
      const v = rnd();
      assert.ok(v >= 0 && v < 1);
    }
  });

  it("deterministic sequence", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 10; i++) {
      assert.strictEqual(a(), b());
    }
  });

  it("different seeds → different sequences", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const values = new Set<number>();
    for (let i = 0; i < 5; i++) values.add(a());
    for (let i = 0; i < 5; i++) {
      assert.ok(!values.has(b()));
    }
  });
});

describe("obfuscateLatLngWithinRadius", () => {
  it("returns within radius (deterministic)", () => {
    const result = obfuscateLatLngWithinRadius(55.7558, 37.6173, "user-1", 250);

    // Same seed → same result
    const same = obfuscateLatLngWithinRadius(55.7558, 37.6173, "user-1", 250);
    assert.strictEqual(result.lat, same.lat);
    assert.strictEqual(result.lng, same.lng);
  });

  it("actually displaces the coordinate", () => {
    const result = obfuscateLatLngWithinRadius(0, 0, "test", 100);
    assert.ok(result.lat !== 0 || result.lng !== 0, "should be displaced from origin");
  });

  it("displacement is within radius", () => {
    const lat = 55.7558;
    const lng = 37.6173;
    const radius = 250;
    const result = obfuscateLatLngWithinRadius(lat, lng, "user-2", radius);

    const R = 6378137;
    const dLatM = (result.lat - lat) * (Math.PI / 180) * R;
    const dLngM =
      (result.lng - lng) *
      (Math.PI / 180) *
      R *
      Math.cos((lat * Math.PI) / 180);
    const distanceM = Math.sqrt(dLatM * dLatM + dLngM * dLngM);

    assert.ok(distanceM <= radius + 1, `distance ${distanceM.toFixed(1)}m should be ≤ ${radius}m`);
  });

  it("different users get different positions", () => {
    const a = obfuscateLatLngWithinRadius(55, 37, "user-a", 250);
    const b = obfuscateLatLngWithinRadius(55, 37, "user-b", 250);
    assert.ok(a.lat !== b.lat || a.lng !== b.lng);
  });
});