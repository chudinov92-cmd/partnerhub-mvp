
// ── Гео-приватность и DOM-хелперы пинов ───────────────────────────
export {
  hashToSeed,
  mulberry32,
  obfuscateLatLngWithinRadius,
} from './lib/map/geoPrivacy';
export {
  createPinElement,
  escapeHtmlChar,
  escapeHtmlColor,
  escapeHtmlText,
  getMarkerVisual,
  markerVisualKey,
  pinInitial,
  PIN_BORDER_COLOR,
  PIN_FILL_COLOR,
  PIN_HELLO_WRAP_CLASS,
  prefersReducedMotion,
  scheduleOwnPinHello,
  setMarkerTooltip,
  triggerOwnPinHello,
} from './lib/map/pinElement';

// ── Данные карты городов ──────────────────────────────────────────
export type {
  LngLat,
  CityViewConfig,
} from './lib/data/cityMapViews';
export {
  CITY_VIEWS,
  getMapConfigForCity,
} from './lib/data/cityMapViews';

// ── Компоненты карты ──────────────────────────────────────────────
export { PartnerMap } from './lib/components/PartnerMap';
export type { PartnerMapProps, LightPointClickPayload } from './lib/components/PartnerMap';
export { ProfileLocationPicker } from './lib/components/ProfileLocationPicker';
