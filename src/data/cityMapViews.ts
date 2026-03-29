import type { LatLngExpression } from "leaflet";

export type CityViewConfig = {
  center: LatLngExpression;
  zoom: number;
};

export const CITY_VIEWS: Record<string, CityViewConfig> = {
  Россия: {
    center: [61, 90],
    zoom: 3,
  },
  Москва: {
    center: [55.7558, 37.6176],
    zoom: 10,
  },
  "Санкт-Петербург": {
    center: [59.9311, 30.3609],
    zoom: 10,
  },
  Новосибирск: {
    center: [55.0084, 82.9357],
    zoom: 10,
  },
  Екатеринбург: {
    center: [56.8389, 60.6057],
    zoom: 10,
  },
  Казань: {
    center: [55.7963, 49.1088],
    zoom: 10,
  },
  "Нижний Новгород": {
    center: [56.2965, 43.9361],
    zoom: 10,
  },
  Челябинск: {
    center: [55.1644, 61.4368],
    zoom: 10,
  },
  Самара: {
    center: [53.1959, 50.1008],
    zoom: 10,
  },
  Омск: {
    center: [54.9885, 73.3242],
    zoom: 10,
  },
  "Ростов-на-Дону": {
    center: [47.2357, 39.7015],
    zoom: 10,
  },
  Уфа: {
    center: [54.7388, 55.9721],
    zoom: 10,
  },
  Красноярск: {
    center: [56.0153, 92.8932],
    zoom: 10,
  },
  Пермь: {
    center: [58.01, 56.25],
    zoom: 12,
  },
  Волгоград: {
    center: [48.708, 44.5133],
    zoom: 10,
  },
  Воронеж: {
    center: [51.6608, 39.2003],
    zoom: 10,
  },
};

export function getMapConfigForCity(selectedCity: string | null | undefined) {
  const key = (selectedCity || "Пермь").trim() || "Пермь";
  return CITY_VIEWS[key] ?? CITY_VIEWS["Пермь"];
}
