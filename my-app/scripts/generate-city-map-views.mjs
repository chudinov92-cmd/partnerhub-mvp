/**
 * Одноразовая генерация cityMapViews.ts из CITY_OPTIONS через Nominatim.
 * Запуск (папка my-app):
 *   node scripts/generate-city-map-views.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const RUSSIA_LABEL = "Россия";

const CITY_OPTIONS = [
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
  "Краснодар",
  "Саратов",
  "Тюмень",
  "Тольятти",
  "Ижевск",
  "Барнаул",
  "Ульяновск",
  "Иркутск",
  "Хабаровск",
  "Ярославль",
  "Владивосток",
  "Махачкала",
  "Томск",
  "Оренбург",
  "Кемерово",
  "Набережные Челны",
  "Рязань",
  "Астрахань",
  "Пенза",
  "Липецк",
  "Киров",
  "Чебоксары",
  "Тула",
  "Калининград",
  "Балашиха",
  "Сочи",
  "Курск",
  "Ставрополь",
  "Тверь",
  "Магнитогорск",
  "Иваново",
  "Брянск",
  "Белгород",
  "Сургут",
  "Владимир",
  "Нижний Тагил",
  "Архангельск",
  "Чита",
  "Калуга",
  "Смоленск",
  "Улан-Удэ",
  "Волжский",
  "Подольск",
  "Череповец",
  "Якутск",
  "Орёл",
  "Вологда",
  "Саранск",
  "Грозный",
  "Мурманск",
  "Новокузнецк",
  "Тамбов",
  "Стерлитамак",
  "Петрозаводск",
  "Нижневартовск",
  "Кострома",
  "Новороссийск",
  "Йошкар-Ола",
  "Химки",
  "Нальчик",
  "Курган",
  "Таганрог",
  "Сыктывкар",
  "Нижнекамск",
  "Братск",
  "Ангарск",
  "Благовещенск",
  "Мытищи",
  "Комсомольск-на-Амуре",
  "Люберцы",
  "Энгельс",
  "Псков",
  "Великий Новгород",
  "Бийск",
  "Орск",
  "Дзержинск",
  "Королёв",
  "Шахты",
  "Рыбинск",
  "Армавир",
  "Балаково",
  "Прокопьевск",
  "Абакан",
  "Нефтеюганск",
  "Волгодонск",
  "Ковров",
  "Петропавловск-Камчатский",
  "Майкоп",
  "Черкесск",
  "Хасавюрт",
  "Каспийск",
  "Дербент",
  "Кызыл",
  "Серпухов",
  "Коломна",
  "Одинцово",
  "Красногорск",
  "Электросталь",
  "Орехово-Зуево",
  "Элиста",
  "Пятигорск",
  "Мичуринск",
];

/** Ручные поправки, если Nominatim промахнулся. center: [lng, lat] для VK Maps */
const MANUAL = {
  [RUSSIA_LABEL]: { center: [90, 61], zoom: 3 },
  Москва: { center: [37.6176, 55.7558], zoom: 10 },
  "Санкт-Петербург": { center: [30.3609, 59.9311], zoom: 10 },
  Пермь: { center: [56.25, 58.01], zoom: 12 },
};

function zoomForCity(city) {
  if (city === RUSSIA_LABEL) return 3;
  if (city === "Москва" || city === "Санкт-Петербург") return 10;
  if (city === "Пермь") return 12;
  return 11;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocodeCity(city) {
  const q = encodeURIComponent(`${city}, Россия`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&accept-language=ru`;
  const res = await fetch(url, {
    headers: { "User-Agent": "ZeipCityMapGenerator/1.0 (contact@zeip.ru)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${city}`);
  const data = await res.json();
  if (!data?.length) return null;
  const lat = Number(data[0].lat);
  const lng = Number(data[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { center: [lng, lat], zoom: zoomForCity(city) };
}

function escapeKey(key) {
  return JSON.stringify(key);
}

async function main() {
  const views = {
    [RUSSIA_LABEL]: MANUAL[RUSSIA_LABEL],
  };

  for (const city of CITY_OPTIONS) {
    if (MANUAL[city]) {
      views[city] = MANUAL[city];
      console.log(`[manual] ${city}`);
      continue;
    }
    try {
      const cfg = await geocodeCity(city);
      if (!cfg) {
        console.error(`[miss] ${city}`);
        continue;
      }
      views[city] = cfg;
      console.log(`[ok] ${city} → ${cfg.center.join(", ")}`);
    } catch (e) {
      console.error(`[err] ${city}:`, e.message);
    }
    await sleep(1100);
  }

  const lines = [
    `export type LngLat = [number, number];`,
    ``,
    `export type CityViewConfig = {`,
    `  center: LngLat;`,
    `  zoom: number;`,
    `};`,
    ``,
    `/** Центр карты для каждого города из CITY_OPTIONS + «Россия». Сгенерировано scripts/generate-city-map-views.mjs */`,
    `export const CITY_VIEWS: Record<string, CityViewConfig> = {`,
  ];

  const keys = [RUSSIA_LABEL, ...CITY_OPTIONS.filter((c) => views[c])];
  for (const key of keys) {
    const v = views[key];
    if (!v) continue;
    const k = escapeKey(key);
    lines.push(`  ${k}: {`);
    lines.push(`    center: [${v.center[0]}, ${v.center[1]}],`);
    lines.push(`    zoom: ${v.zoom},`);
    lines.push(`  },`);
  }

  lines.push(`};`, ``);
  lines.push(`const DEFAULT_CITY = "Пермь";`, ``);
  lines.push(`export function getMapConfigForCity(selectedCity: string | null | undefined) {`);
  lines.push(`  const key = (selectedCity || DEFAULT_CITY).trim() || DEFAULT_CITY;`);
  lines.push(`  const cfg = CITY_VIEWS[key];`);
  lines.push(`  if (!cfg) {`);
  lines.push(`    if (process.env.NODE_ENV === "development") {`);
  lines.push(`      console.warn(\`[cityMapViews] unknown city "\${key}", fallback \${DEFAULT_CITY}\`);`);
  lines.push(`    }`);
  lines.push(`    return CITY_VIEWS[DEFAULT_CITY] ?? { center: [58.01, 56.25], zoom: 12 };`);
  lines.push(`  }`);
  lines.push(`  return cfg;`);
  lines.push(`}`, ``);

  const out = path.join(ROOT, "src/data/cityMapViews.ts");
  fs.writeFileSync(out, lines.join("\n"), "utf8");
  console.log(`\nWrote ${out} (${Object.keys(views).length} cities)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
