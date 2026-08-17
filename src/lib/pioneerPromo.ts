/** Акция «первые 50 в городе → 90 дней Pro». */
export function isPioneerPromoEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_PIONEER_PROMO_ENABLED?.trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "on") return true;
  if (raw === "0" || raw === "false" || raw === "off") return false;
  return false;
}
