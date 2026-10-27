// Гео-приватность вынесена в библиотеку @my-startup/map-ui.
// Этот файл остаётся для обратной совместимости импортов `@/lib/map/geoPrivacy`.
export {
  hashToSeed,
  mulberry32,
  obfuscateLatLngWithinRadius,
} from "@my-startup/map-ui";