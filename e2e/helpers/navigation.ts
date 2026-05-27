import type { Page } from "@playwright/test";

type MobileTab = "Чат" | "Карта" | "Контакты" | "Мои чаты";

/** Мобильная нижняя навигация (viewport < lg). На desktop — no-op. */
export async function openMobileTab(page: Page, tab: MobileTab) {
  const nav = page.getByRole("navigation", { name: "Основная навигация" });
  if (!(await nav.isVisible().catch(() => false))) {
    return;
  }
  await nav.getByRole("button", { name: tab, exact: true }).click();
}

/** Открыть карту: мобильный таб или desktop (карта в split-view). */
export async function openMapView(page: Page) {
  await openMobileTab(page, "Карта");
  if (await page.locator(".leaflet-container").first().isVisible().catch(() => false)) {
    return;
  }
  await page.getByRole("button", { name: "Настройки поиска" }).click().catch(() => {});
}
