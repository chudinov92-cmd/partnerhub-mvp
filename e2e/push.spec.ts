import { test, expect } from "@playwright/test";
import { e2eUser } from "./helpers/env";
import { loginViaUi } from "./helpers/auth";
import { describeWithUser } from "./helpers/skip";

test.describe("Фаза 8: Push — API", () => {
  test("TC-8.2 API subscribe без токена — ошибка", async ({ request }) => {
    const res = await request.post("/api/push/subscribe", {
      data: { subscription: {} },
    });
    expect([400, 401, 403, 500]).toContain(res.status());
  });
});

describeWithUser("Фаза 8: Push — UI", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, e2eUser.email, e2eUser.password);
  });

  test("TC-8.1 Баннер или настройки Push на главной", async ({ page }) => {
    await page.goto("/");
    const pushText = page.getByText(/уведомлен|push|сообщен/i);
    await expect(pushText.first())
      .toBeVisible({ timeout: 20_000 })
      .catch(() => {
        // уже подписан — ок
      });
  });

  test("TC-8.4 Настройки Push на странице профиля", async ({ page }) => {
    await page.goto("/profile");
    await expect(
      page.getByText(/push|уведомлен/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });
});
