// ── Supabase клиенты ───────────────────────────────────────────────
export { supabase, supabasePublic, supabaseAuthForms } from './lib/supabaseClient';
export { createSupabaseAdmin, createSupabaseAdminClient } from './lib/supabaseAdmin';

// ── Сервис авторизации (сессии, токены) ──────────────────────────
export {
  AUTH_SESSION_EXPIRED_EVENT,
  AUTH_OPERATION_TIMEOUT_MS,
  AUTH_FORM_TIMEOUT_MS,
  PROACTIVE_REFRESH_BEFORE_EXPIRY_MS,
  withAuthTimeout,
  isAuthTimeoutError,
  dispatchAuthSessionExpired,
  authRefreshSession,
  scheduleProactiveAuthRefresh,
  stopProactiveAuthRefresh,
  authGetUser,
  authSignOut,
  authLocalSignOut,
  authGetSession,
  authUpdateUser,
  authVerifyOtp,
  authSetSession,
  authRefreshSessionPublic,
  authFormsResend,
  authFormsResetPasswordForEmail,
  authFormsSignUp,
  authFormsOnAuthStateChange,
  authFormsGetSession,
  completeAuthEmailCallbackFromLocation,
  completeAuthEmailCallbackWithParams,
  authOnAuthStateChange,
} from './lib/authService';
export type {
  AuthChangeCallback,
  AuthGetUserResult,
  Session,
  User,
} from './lib/authService';

// ── Профиль из JWT / token ⇢ profiles.id ──────────────────────────
export { getProfileIdFromAccessToken } from './lib/authProfile';

// ── Email-каллбек (GoTrue redirect) ──────────────────────────────
export {
  getEmailAuthRedirectOrigin,
  getEmailAuthCallbackUrl,
  getEmailAuthResetPasswordUrl,
  authEmailCallbackPendingInUrl,
  isConsumedOtpErrorText,
  consumedOtpUserMessage,
  SIGNUP_OTP_VERIFY_ERROR,
  extractAuthErrorTexts,
  isOtpVerifyError,
  authOtpVerifyErrorMessage,
  parseAuthEmailCallbackParams,
  classifyAuthEmailCallback,
  isRecoveryEmailCallback,
  authEmailCallbackErrorMessage,
  completeAuthEmailCallback,
  clearAuthCallbackFromUrl,
  isEmailNotConfirmedError,
} from './lib/authEmailCallback';
export type {
  AuthEmailCallbackParams,
  AuthEmailCallbackKind,
} from './lib/authEmailCallback';

// ── Recovery / сброс пароля ───────────────────────────────────────
export {
  pkceAuthCallbackInUrl,
  recoveryTypeInUrl,
  recoveryCallbackPendingInUrl,
  markPasswordResetComplete,
  isPasswordResetComplete,
  clearPasswordResetComplete,
  isPasswordRecoverySession,
} from './lib/authRecovery';

// ── Entry path / редиректы ────────────────────────────────────────
export {
  sanitizeAuthRedirect,
  resolveAuthedAppEntryPath,
  resolveLandingHeroCta,
  LANDING_GUEST_CTA,
} from './lib/authEntryPath';
export type {
  LandingHeroCta,
  FetchProfileRow,
} from './lib/authEntryPath';

// ── Access mode ───────────────────────────────────────────────────
export {
  getAccessMode,
  isPaidGateMode,
  hasActiveSubscription,
} from './lib/accessMode';
export type {
  AccessMode,
  ProProfileFields,
} from './lib/accessMode';

// ── Rate-limit login ──────────────────────────────────────────────
export {
  LOGIN_EMAIL_MAX_FAILS,
  LOGIN_IP_MAX_FAILS,
  LOGIN_WINDOW_MS,
  LOGIN_EMAIL_LOCK_MS,
  normalizeLoginEmail,
  isPlausibleLoginEmail,
  parseLoginReason,
  loginLimitMessage,
} from './lib/authLoginRateLimit';
export type {
  LoginReason,
  LoginLimitResult,
} from './lib/authLoginRateLimit';
export {
  requestAuthLogin,
  isAuthLoginLimitedError,
} from './lib/authLoginClient';
export {
  tryAuthLogin,
  validateLoginEmail,
  loginLimitedJson,
  mapGoTrueLoginError,
  parseLoginRpc,
  clientIpFromRequest,
  AuthLoginUnavailableError,
  isAuthLoginUnavailableError,
} from './lib/authLoginServer';

// ── Rate-limit OTP send ───────────────────────────────────────────
export {
  OTP_SEND_COOLDOWN_SECONDS,
  OTP_SEND_EMAIL_MAX_24H,
  OTP_SEND_IP_MAX_24H,
  OTP_SEND_WINDOW_MS,
  normalizeOtpEmail,
  isPlausibleOtpEmail,
  pad2,
  formatOtpRetryAfter,
  parseOtpSendReason,
  otpSendLimitMessage,
} from './lib/authOtpRateLimit';
export type {
  OtpSendReason,
  OtpSendKind,
  OtpSendLimitResult,
} from './lib/authOtpRateLimit';
export {
  fetchOtpSendStatus,
  requestOtpSend,
  OtpSendLimitedError,
  isOtpSendLimitedError,
} from './lib/authOtpSendClient';
export {
  purposeFromKind,
  parseOtpSendRpc,
  tryAuthOtpSend,
  releaseOtpSend,
  validateOtpSendEmail,
  limitedJson,
  okJson,
  createGoTrueFormsClient,
  authOtpRedirectOrigin,
  otpEmailRedirectTo,
  sendGoTrueOtp,
} from './lib/authOtpSendServer';
