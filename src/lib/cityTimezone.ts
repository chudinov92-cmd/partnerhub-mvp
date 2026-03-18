function normalizeCity(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^г\\.?\\s+/i, "")
    .replace(/\\s+/g, " ");
}

// Minimal MVP mapping. Extend as needed.
const CITY_TIMEZONES: Record<string, string> = {
  "москва": "Europe/Moscow",
  "санкт-петербург": "Europe/Moscow",
  "пермь": "Asia/Yekaterinburg",
  "екатеринбург": "Asia/Yekaterinburg",
  "челябинск": "Asia/Yekaterinburg",
  "уфа": "Asia/Yekaterinburg",
  "самара": "Europe/Samara",
  "казань": "Europe/Moscow",
  "нижний новгород": "Europe/Moscow",
  "ростов-на-дону": "Europe/Moscow",
  "воронеж": "Europe/Moscow",
  "волгоград": "Europe/Volgograd",
  "омск": "Asia/Omsk",
  "новосибирск": "Asia/Novosibirsk",
  "красноярск": "Asia/Krasnoyarsk",
};

export function getTimeZoneByCity(city: string | null | undefined) {
  if (!city) return null;
  const normalized = normalizeCity(city);
  if (!normalized) return null;
  return CITY_TIMEZONES[normalized] ?? null;
}

export function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

