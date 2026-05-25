import { CITY_OPTIONS } from "@/data/cities";

/** Нормализация названия города для сопоставления GeoIP ↔ справочник Zeip. */
function normalizeGeoCityName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ");
}

const CITY_OPTIONS_SET = new Set<string>(CITY_OPTIONS);

const CANONICAL_BY_NORMALIZED = new Map<string, string>(
  CITY_OPTIONS.map((city) => [normalizeGeoCityName(city), city]),
);

/** Алиасы из GeoLite2 (en/транслит) → каноническое имя в CITY_OPTIONS. */
const GEO_CITY_ALIASES: Record<string, string> = {
  "saint petersburg": "Санкт-Петербург",
  "st petersburg": "Санкт-Петербург",
  "st. petersburg": "Санкт-Петербург",
  "nizhniy novgorod": "Нижний Новгород",
  "nizhny novgorod": "Нижний Новгород",
  "nizhniy tagil": "Нижний Тагил",
  "nizhny tagil": "Нижний Тагил",
  nizhnekamsk: "Нижнекамск",
  nizhnevartovsk: "Нижневартовск",
  "yoshkar-ola": "Йошкар-Ола",
  "yoshkar ola": "Йошкар-Ола",
  "ulan-ude": "Улан-Удэ",
  "ulan ude": "Улан-Удэ",
  "naberezhnyye chelny": "Набережные Челны",
  "naberezhnye chelny": "Набережные Челны",
  "rostov-na-donu": "Ростов-на-Дону",
  "rostov-on-don": "Ростов-на-Дону",
  "veliky novgorod": "Великий Новгород",
  "velikiy novgorod": "Великий Новгород",
  "petropavlovsk-kamchatskiy": "Петропавловск-Камчатский",
  "petropavlovsk-kamchatsky": "Петропавловск-Камчатский",
  "komsomolsk-on-amur": "Комсомольск-на-Амуре",
  "orekhovo-zuyevo": "Орехово-Зуево",
  "orekhovo-zuevo": "Орехово-Зуево",
  perm: "Пермь",
  moscow: "Москва",
  kazan: "Казань",
  samara: "Самара",
  omsk: "Омск",
  ufa: "Уфа",
  krasnoyarsk: "Красноярск",
  volgograd: "Волгоград",
  voronezh: "Воронеж",
  krasnodar: "Краснодар",
  saratov: "Саратов",
  tyumen: "Тюмень",
  tolyatti: "Тольятти",
  izhevsk: "Ижевск",
  barnaul: "Барнаул",
  ulyanovsk: "Ульяновск",
  irkutsk: "Иркутск",
  khabarovsk: "Хабаровск",
  yaroslavl: "Ярославль",
  vladivostok: "Владивосток",
  makhachkala: "Махачкала",
  tomsk: "Томск",
  orenburg: "Оренбург",
  kemerovo: "Кемерово",
  ryazan: "Рязань",
  astrakhan: "Астрахань",
  penza: "Пенза",
  lipetsk: "Липецк",
  kirov: "Киров",
  cheboksary: "Чебоксары",
  tula: "Тула",
  kaliningrad: "Калининград",
  sochi: "Сочи",
  kursk: "Курск",
  stavropol: "Ставрополь",
  tver: "Тверь",
  magnitogorsk: "Магнитогорск",
  ivanovo: "Иваново",
  bryansk: "Брянск",
  belgorod: "Белгород",
  surgut: "Сургут",
  vladimir: "Владимир",
  arkhangelsk: "Архангельск",
  chita: "Чита",
  kaluga: "Калуга",
  smolensk: "Смоленск",
  volzhskiy: "Волжский",
  podolsk: "Подольск",
  cherepovets: "Череповец",
  yakutsk: "Якутск",
  oryol: "Орёл",
  orel: "Орёл",
  vologda: "Вологда",
  saransk: "Саранск",
  groznyy: "Грозный",
  grozny: "Грозный",
  murmansk: "Мурманск",
  novokuznetsk: "Новокузнецк",
  tambov: "Тамбов",
  sterlitamak: "Стерлитамак",
  petrozavodsk: "Петрозаводск",
  kostroma: "Кострома",
  novorossiysk: "Новороссийск",
  nalchik: "Нальчик",
  kurgan: "Курган",
  taganrog: "Таганрог",
  syktyvkar: "Сыктывкар",
  bratsk: "Братск",
  angarsk: "Ангарск",
  blagoveshchensk: "Благовещенск",
  mytishchi: "Мытищи",
  engels: "Энгельс",
  pskov: "Псков",
  biysk: "Бийск",
  orsk: "Орск",
  dzerzhinsk: "Дзержинск",
  korolev: "Королё\u0432",
  shakhty: "Шахты",
  rybinsk: "Рыбинск",
  armavir: "Армавир",
  balakovo: "Балаково",
  prokopyevsk: "Прокопьевск",
  abakan: "Абакан",
  nefteyugansk: "Нефтеюганск",
  volgodonsk: "Волгодонск",
  kovrov: "Ковров",
  maykop: "Майкоп",
  cherkessk: "Черкесск",
  khasavyurt: "Хасавюрт",
  kaspiysk: "Каспийск",
  derbent: "Дербент",
  kyzyl: "Кызыл",
  serpukhov: "Серпухов",
  kolomna: "Коломна",
  odintsovo: "Одинцово",
  krasnogorsk: "Красногорск",
  elektrostal: "Электросталь",
  pyatigorsk: "Пятигорск",
  michurinsk: "Мичуринск",
  elista: "Элиста",
  balashikha: "Балашиха",
  khimki: "Химки",
  lyubertsy: "Люберцы",
  novosibirsk: "Новосибирск",
  yekaterinburg: "Екатеринбург",
  chelyabinsk: "Челябинск",
};

function resolveAlias(normalized: string): string | null {
  const alias = GEO_CITY_ALIASES[normalized];
  if (!alias) return null;
  return CITY_OPTIONS_SET.has(alias) ? alias : null;
}

/** Сопоставляет название из GeoIP с городом из CITY_OPTIONS. */
export function mapGeoCityToZeipCity(
  rawCity: string | null | undefined,
): string | null {
  if (!rawCity?.trim()) return null;

  const normalized = normalizeGeoCityName(rawCity);

  const direct = CANONICAL_BY_NORMALIZED.get(normalized);
  if (direct) return direct;

  return resolveAlias(normalized);
}
