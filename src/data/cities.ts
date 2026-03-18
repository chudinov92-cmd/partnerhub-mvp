export const RUSSIA_LABEL = "Россия";

export const CITY_OPTIONS = [
  "Москва",
  "Санкт-Петербург",
  "Новосибирск",
  "Екатеринбург",
  "Казань",
  "Нижний Новгород",
  "Челябинск",
  "Самара",
  "Омск",
  "Ростов-на-Дону",
  "Уфа",
  "Красноярск",
  "Пермь",
  "Волгоград",
  "Воронеж",
] as const;

export const SORTED_CITY_OPTIONS = [...CITY_OPTIONS].sort((a, b) =>
  a.localeCompare(b, "ru"),
);

export function normalizeCityQuery(raw: string) {
  return (raw ?? "").trim().toLowerCase();
}

