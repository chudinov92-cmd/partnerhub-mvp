import { test, expect } from "@playwright/test";
import { openMobileTab } from "./helpers/navigation";

test.describe("Фаза 10: Мобильная адаптация", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("TC-10.1 Нижняя навигация видна", async ({ page }) => {
    await page.goto("/map");
    const nav = page.getByRole("navigation", { name: "Основная навигация" });
    await expect(nav).toBeVisible();
    for (const tab of ["Чат", "Карта", "Контакты", "Мои чаты"]) {
      await expect(nav.getByRole("button", { name: tab, exact: true })).toBeVisible();
    }
  });

  test("TC-10.2 Переключение вкладок", async ({ page }) => {
    await page.goto("/map");
    await openMobileTab(page, "Чат");
    await expect(page.locator("body")).not.toContainText("Application error");
    await openMobileTab(page, "Карта");
    await expect(page.locator(".leaflet-container").first()).toBeVisible({
      timeout: 25_000,
    });
    await openMobileTab(page, "Контакты");
    await openMobileTab(page, "Мои чаты");
  });

  test("TC-10.3 Нет лишнего вертикального скролла body на карте", async ({
    page,
  }) => {
    await page.goto("/map");
    await openMobileTab(page, "Карта");
    await page.waitForTimeout(800);
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeLessThan(50);
  });
});
