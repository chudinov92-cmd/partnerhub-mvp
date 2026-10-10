import { test, expect } from "@playwright/test";

test.describe("Фаза 11: Маркетинговые страницы", () => {
  test("TC-11.1 Лендинг /", async ({ page }) => {
    // Тяжёлые ассеты на главной часто не успевают за load за 60s; DOM достаточен для smoke.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(
      page.getByRole("link", { name: /создать|на карту|войти/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
