import { CITY_VIEWS } from "@/data/cityMapViews";

/** IANA timezone per city for local-time email scheduling (20:30 user local). */
const CITY_TIMEZONE_OVERRIDES: Record<string, string> = {
  Калининград: "Europe/Kaliningrad",
  Екатеринбург: "Asia/Yekaterinburg",
  Челябинск: "Asia/Yekaterinburg",
  Тюмень: "Asia/Yekaterinburg",
  Сургут: "Asia/Yekaterinburg",
  Нижневартовск: "Asia/Yekaterinburg",
  Магнитогорск: "Asia/Yekaterinburg",
  "Нижний Тагил": "Asia/Yekaterinburg",
  Орск: "Asia/Yekaterinburg",
  Нефтеюганск: "Asia/Yekaterinburg",
  Омск: "Asia/Omsk",
  Новосибирск: "Asia/Novosibirsk",
  Барнаул: "Asia/Novosibirsk",
  Кемерово: "Asia/Novosibirsk",
  Томск: "Asia/Novosibirsk",
  Новокузнецк: "Asia/Krasnoyarsk",
  Бийск: "Asia/Barnaul",
  Прокопьевск: "Asia/Novokuznetsk",
  Красноярск: "Asia/Krasnoyarsk",
  Абакан: "Asia/Krasnoyarsk",
  Кызыл: "Asia/Krasnoyarsk",
  Иркутск: "Asia/Irkutsk",
  "Улан-Удэ": "Asia/Irkutsk",
  Братск: "Asia/Irkutsk",
  Ангарск: "Asia/Irkutsk",
  Якутск: "Asia/Yakutsk",
  Чита: "Asia/Chita",
  Владивосток: "Asia/Vladivostok",
  Хабаровск: "Asia/Vladivostok",
  Благовещенск: "Asia/Yakutsk",
  "Комсомольск-на-Амуре": "Asia/Vladivostok",
  "Петропавловск-Камчатский": "Asia/Kamchatka",
  Махачкала: "Europe/Moscow",
};

const DEFAULT_TIMEZONE = "Europe/Moscow";

export const CITY_TIMEZONES: Record<string, string> = Object.fromEntries(
  Object.keys(CITY_VIEWS).map((city) => [
    city,
    CITY_TIMEZONE_OVERRIDES[city] ?? DEFAULT_TIMEZONE,
  ]),
);

export function getCityTimezone(city: string | null | undefined): string {
  const key = (city ?? "").trim();
  if (!key) return DEFAULT_TIMEZONE;
  return CITY_TIMEZONES[key] ?? DEFAULT_TIMEZONE;
}

/** True when user's local time is 20:xx (hour 20) in their city timezone. */
export function isLocalReminderWindow(
  city: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const tz = getCityTimezone(city);
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "-1");
    return hour === 20;
  } catch {
    return false;
  }
}
