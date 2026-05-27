import { test, expect } from "@playwright/test";
import { e2eProUser, e2eUser } from "./helpers/env";
import { loginViaUi } from "./helpers/auth";
import { describeWithUser } from "./helpers/skip";

test.describe("Фаза 7: Подписка Pro", () => {
  test("TC-7.3 Без авторизации — редирект на /auth", async ({ page }) => {
    await page.goto("/subscription");
    await expect(page).toHaveURL(/\/auth/);
  });
});

describeWithUser("Фаза 7: Подписка — авторизованный", () => {
  test("TC-7.1 Free: страница подписки", async ({ page }) => {
    await loginViaUi(page, e2eUser.email, e2eUser.password);
    await page.goto("/subscription");
    await expect(
      page.getByText(/Free|Pro|тариф|подписк/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("TC-7.2 Pro: активная подписка или кнопка покупки", async ({ page }) => {
    await loginViaUi(page, e2eProUser.email, e2eProUser.password);
    await page.goto("/subscription");
    const active = page.getByText(/Pro активна|Подписка Pro активна/i);
    const buy = page.getByRole("button", { name: /купить|оформить/i });
    await expect(active.or(buy).first()).toBeVisible({ timeout: 20_000 });
  });
});
