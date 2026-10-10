// ── Планы подписки, лимиты, цены ──────────────────────────────────
export {
  // Типы
  type SubscriptionPlan,
  type PaidSubscriptionPlan,
  type SubscriptionPeriod,
  type PaymentPlanId,
  // Лимиты
  FREE_DM_LIMIT,
  PRO_DM_LIMIT,
  PRO_PLUS_DM_LIMIT,
  FREE_FAVORITES_LIMIT,
  FREE_PROFILE_VIEWS_LIMIT,
  PRO_PLUS_CHAT_LIMIT,
  // Цвета пинов
  PIN_COLOR_FREE,
  PIN_COLOR_PRO,
  PIN_COLOR_PRO_PLUS,
  PLAN_TEXT_COLOR_PRO,
  getPinColorForPlan,
  getPlanLabel,
  getPlanTextColor,
  // Цены
  SUBSCRIPTION_PRICING,
  YEARLY_DISCOUNT_PERCENT,
  getPlanPrice,
  formatRub,
  formatMonthlyEquivalent,
  // Апгрейд
  UPGRADE_PLAN_ID,
  upgradeRemainingDays,
  calculateUpgradePrice,
  formatUpgradeOutSum,
  buildUpgradeDescription,
  buildUpgradeReceiptName,
  isUpgradePaymentPlan,
  // Платежные идентификаторы
  buildPaymentPlanId,
  parsePaymentPlanId,
  // Фичи планов
  FREE_PLAN_FEATURES,
  PRO_PLAN_FEATURES,
  PRO_PLUS_PLAN_FEATURES,
  FREE_PLAN_PIN_FEATURE,
  PRO_PLAN_PIN_FEATURE,
  PRO_PLUS_PLAN_PIN_FEATURE,
  // Профили Pro
  type ProProfileFields,
  isActiveProProfile,
  isProActive,
  getEffectiveSubscriptionPlan,
  isPaidPlan,
  planRank,
  comparePlanRank,
} from './lib/subscriptionPlans';

// ── Пробный период ────────────────────────────────────────────────
export {
  TRIAL_ENABLED,
} from './lib/subscriptionTrial';

// ── Robokassa (платёжный шлюз) ───────────────────────────────────
export {
  type RobokassaHashAlg,
  type RobokassaSno,
  type RobokassaReceiptItem,
  type RobokassaReceipt,
  getRobokassaPassword1,
  getRobokassaPassword2,
  isRobokassaTestMode,
  getRobokassaSno,
  buildRobokassaSignature,
  signPaymentRequest,
  signResultWebhook,
  buildRobokassaReceipt,
  encodeRobokassaReceipt,
  applyRobokassaInvoiceDescription,
  allocRobokassaInvId,
  type BuildRobokassaPaymentUrlParams,
  buildRobokassaPaymentUrl,
} from './lib/robokassa';

// ── Возвраты с оплаты (Success/Fail URL) ─────────────────────────
export {
  PAYMENT_PENDING_INV_ID_KEY,
  PAYMENT_AUTH_BACKUP_KEY,
  type AuthSessionBackup,
  type RobokassaReturnParams,
  parseRobokassaReturnParams,
  isRobokassaReturnUrl,
  buildPaymentSuccessPath,
  shouldRedirectRobokassaReturnFromSubscription,
  savePendingPaymentInvId,
  readPendingPaymentInvId,
  clearPendingPaymentInvId,
  resolvePaymentInvId,
  buildPaymentSuccessLoginRedirect,
  getSiteUrl,
  getPaymentReturnSiteUrl,
  saveAuthSessionBackup,
  readAuthSessionBackup,
  clearAuthSessionBackup,
} from './lib/paymentReturn';

// ── Сервис подписки (клиентский) ──────────────────────────────────
export {
  type SubscriptionStatus,
  PRO_PIN_COLOR,
  getDmPartnersDailyLimit,
  canWriteGeneralChat,
  canSendDirectMessages,
  getSubscriptionStatus,
  initRobokassaPayment,
  type UpgradePaymentResult,
  initUpgradePayment,
  cancelProSubscription,
} from './lib/subscriptionService';

// ── Статус оплаты ────────────────────────────────────────────────
export {
  type PaymentStatusResponse,
  fetchPaymentStatusByInvId,
} from './lib/paymentStatusService';
