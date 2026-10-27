// ── Контракты (клиент + сервер) ─────────────────────────────────────
export type { AdminRole, AdminSupportChatRow, ModerationPurgeReason } from "./lib/api-contracts";
export { MODERATION_PURGE_REASONS, moderationReasonLabel } from "./lib/api-contracts";

// ── Утилиты ─────────────────────────────────────────────────────────
export { getErrorMessage } from "./lib/errors";

// ── Админ-сервисы ───────────────────────────────────────────────────
export {
  adminGetAuthUser,
  adminSignOut,
  adminGetAdminRow,
  adminInsertAuditLog,
  adminFetchProfilesList,
  adminFetchPostsList,
  adminFetchAbuseReportsList,
  adminUpdateAbuseReport,
  adminInsertAbuseReportEvent,
  adminFetchCatalogs,
  adminInsertIndustry,
  adminInsertSubindustry,
  adminInsertProfession,
  adminDeleteIndustry,
  adminDeleteSubindustry,
  adminDeleteProfession,
  adminFetchAdminUsersList,
  adminInsertAdminUser,
  adminUpdateAdminUserRole,
  adminDeleteAdminUser,
  adminFetchPioneerPromoSettings,
  adminSetPioneerPromoEnabled,
  adminFetchPioneerSlots,
  adminSetPioneerCityMax,
  adminFetchDashboardCounts,
} from "./lib/services/adminService";

// ── Аналитика (админ-фетчеры) ──────────────────────────────────────
export {
  fetchProfileDemandMatrix,
  fetchMapSearchMatrix,
  fetchPaywallFunnel,
  fetchRevenueMetrics,
  type DemandMatrixRow,
  type ProfileDemandQuery,
  type MapSearchDemandQuery,
  type PaywallFunnelStep,
  type PaywallFunnelIntent,
  type PaywallFunnelData,
  type RevenueSnapshotPoint,
  type RevenueMetricsData,
} from "./lib/services/analyticsService";

// ── Хук SuperAdmin ──────────────────────────────────────────────────
export { useIsSuperAdmin } from "./lib/hooks/useIsSuperAdmin";

// ── Компоненты ──────────────────────────────────────────────────────
export { AdminShell, ModerationPurgeDialog, RevenueAnalytics, PaywallFunnelAnalytics, ProfessionDemandAnalytics } from "./lib/components";
export type { ModerationPreview } from "./lib/components/ModerationPurgeDialog";

// ── Страницы ────────────────────────────────────────────────────────
export { AdminAdminsPage } from "./lib/pages/AdminAdminsPage";
export { AdminAnalyticsPage } from "./lib/pages/AdminAnalyticsPage";
export { AdminCatalogsPage } from "./lib/pages/AdminCatalogsPage";
export { AdminPostsPage } from "./lib/pages/AdminPostsPage";
export { AdminPromoPage } from "./lib/pages/AdminPromoPage";
export { AdminReportsPage } from "./lib/pages/AdminReportsPage";
export { AdminSupportPage } from "./lib/pages/AdminSupportPage";
export { AdminUsersPage } from "./lib/pages/AdminUsersPage";
