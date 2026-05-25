import fs from "node:fs";
import maxmind, { type CityResponse, type Reader } from "maxmind";
import { mapGeoCityToZeipCity } from "@/lib/geoip/mapGeoCityToZeipCity";

let readerPromise: Promise<Reader<CityResponse> | null> | null = null;

async function getGeoIpReader(): Promise<Reader<CityResponse> | null> {
  if (!readerPromise) {
    readerPromise = (async () => {
      const dbPath = process.env.GEOIP_DB_PATH?.trim();
      if (!dbPath || !fs.existsSync(dbPath)) return null;
      try {
        return await maxmind.open<CityResponse>(dbPath);
      } catch {
        return null;
      }
    })();
  }
  return readerPromise;
}

function pickCityName(record: CityResponse): string | null {
  const names = record.city?.names;
  if (!names) return null;
  return names.ru ?? names.en ?? Object.values(names)[0] ?? null;
}

/** Определяет город Zeip по IP через локальную GeoLite2-City.mmdb. */
export async function lookupZeipCityByIp(ip: string): Promise<string | null> {
  const reader = await getGeoIpReader();
  if (!reader) return null;

  let record: CityResponse | null;
  try {
    record = reader.get(ip) ?? null;
  } catch {
    return null;
  }

  if (!record) return null;

  const country = record.country?.iso_code?.toUpperCase();
  if (country && country !== "RU") return null;

  const rawCity = pickCityName(record);
  return mapGeoCityToZeipCity(rawCity);
}
