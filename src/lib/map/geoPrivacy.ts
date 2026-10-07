/**
 * Client-side geographic coordinate obfuscation.
 * Uses a deterministic PRNG seeded by user_id to displace lat/lng
 * within a given radius, so real coordinates never appear on the map.
 */
export function hashToSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function obfuscateLatLngWithinRadius(
  lat: number,
  lng: number,
  seedStr: string,
  radiusM: number,
): { lat: number; lng: number } {
  const seed = hashToSeed(seedStr);
  const rnd = mulberry32(seed);

  const u = rnd();
  const v = rnd();
  const r = radiusM * Math.sqrt(u);
  const theta = 2 * Math.PI * v;

  const R = 6378137;
  const latRad = (lat * Math.PI) / 180;

  const dNorth = r * Math.cos(theta);
  const dEast = r * Math.sin(theta);

  const dLat = dNorth / R;
  const dLng = dEast / (R * Math.cos(latRad));

  return {
    lat: lat + (dLat * 180) / Math.PI,
    lng: lng + (dLng * 180) / Math.PI,
  };
}