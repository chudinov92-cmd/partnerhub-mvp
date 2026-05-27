import { test, expect } from "@playwright/test";

test.describe("Фаза 11: Маркетинговые страницы", () => {
  test("TC-11.1 Лендинг /landing", async ({ page }) => {
    await page.goto("/landing");
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(
      page.getByRole("link", { name: /создать|на карту|войти/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("TC-11.2 Страницы about без ошибок", async ({ page }) => {
    for (const path of ["/about", "/about2", "/about3"]) {
      await page.goto(path);
      await expect(page.locator("body")).not.toContainText("Application error");
      await expect(page.getByRole("navigation").first()).toBeVisible();
    }
  });
});
