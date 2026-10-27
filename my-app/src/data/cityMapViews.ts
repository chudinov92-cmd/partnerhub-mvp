// Данные карты городов вынесены в библиотеку @my-startup/map-ui.
// Этот файл остаётся для обратной совместимости импортов `@/data/cityMapViews`.
export type {
  LngLat,
  CityViewConfig,
} from "@my-startup/map-ui";
export {
  CITY_VIEWS,
  getMapConfigForCity,
} from "@my-startup/map-ui";