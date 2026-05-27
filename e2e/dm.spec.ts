import { test, expect } from "@playwright/test";
import { e2eUser } from "./helpers/env";
import { loginViaUi } from "./helpers/auth";
import { openMobileTab } from "./helpers/navigation";
import { describeWithUser } from "./helpers/skip";

describeWithUser("Фаза 5: Личные сообщения", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, e2eUser.email, e2eUser.password);
  });

  test("TC-5.1 Вкладка «Мои чаты» открывается", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await openMobileTab(page, "Мои чаты");
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("TC-5.7 Поддержка: открытие из меню", async ({ page }) => {
    await page.goto("/");
    await page
      .locator("header")
      .locator("button")
      .filter({ has: page.locator("span.rounded-full") })
      .first()
      .click();
    await page.getByRole("button", { name: /поддержк/i }).click();
    await expect(page.getByText(/поддержк|обращен/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});

test("TC-5.6 Admin API без гостевой сессии", async ({ request }) => {
  const res = await request.get("/api/admin/analytics/profile-demand");
  expect([401, 403]).toContain(res.status());
});
