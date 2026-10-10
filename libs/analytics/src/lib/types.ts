/**
 * Локальный тип PaywallIntent для либы analytics
 * (совместим с типом из my-app/src/lib/paywallIntent.ts)
 */
export type PaywallIntent =
  | "dm"
  | "chat"
  | "favorites_limit"
  | "full_profile"
  | "dm_global"
  | "pioneer_slot"
  | "pioneer_boost"
  | string;