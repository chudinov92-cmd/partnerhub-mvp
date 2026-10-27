// Гео-модули вынесены в библиотеку @my-startup/map-ui.
// Этот файл остаётся для обратной совместимости импортов `@/lib/map`.
export {
  hashToSeed,
  mulberry32,
  obfuscateLatLngWithinRadius,
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
} from "@my-startup/map-ui";