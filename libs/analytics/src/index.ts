// Яндекс.Метрика
export {
  YANDEX_METRIKA_ID,
  initYandexMetrika,
  reachYandexMetrikaGoal,
} from './lib/yandexMetrika';

// VK Pixel (Top.Mail.Ru)
export { VK_PIXEL_ID, initVkPixel } from './lib/vkPixel';

// Paywall-аналитика (Метрика + API)
export {
  trackPaywallShown,
  trackPaywallDismissed,
  trackPaywallCtaBuy,
  trackCheckoutStarted,
  trackTrialStart,
  trackPaymentSuccessAha,
} from './lib/paywallAnalytics';

// Платёжная аналитика (Метрика)
export {
  trackPaymentSuccessOpen,
  trackPaymentSuccessActivated,
  trackPaymentSuccessNeedLogin,
  trackPaymentSuccessTimeout,
} from './lib/paymentAnalytics';

// Типы
export type { PaywallIntent } from './lib/types';
