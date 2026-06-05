import { test, expect } from "@playwright/test";
import { e2eProUser, e2eUser } from "./helpers/env";
import { loginViaUi } from "./helpers/auth";
import { openMobileTab } from "./helpers/navigation";
import { describeWithUser } from "./helpers/skip";

test.describe("Фаза 4: Общий чат — smoke", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("TC-4.1 Чтение постов (гость)", async ({ page }) => {
    await page.goto("/map");
    await openMobileTab(page, "Чат");
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("TC-4.5 Гость: общий чат без записи", async ({ page }) => {
    await page.goto("/map");
    await openMobileTab(page, "Чат");
    const input = page.getByPlaceholder("Введите сообщение");
    const proHint = page.getByText(/подписк|Pro|войти/i);
    const hasInput = await input.isVisible().catch(() => false);
    if (hasInput) {
      const disabled = await input.isDisabled();
      expect(disabled || (await proHint.first().isVisible().catch(() => false))).toBeTruthy();
    }
  });
});

describeWithUser("Фаза 4: Общий чат — авторизованный", () => {
  test("TC-4.2 Pro: поле общего чата", async ({ page }) => {
    await loginViaUi(page, e2eProUser.email, e2eProUser.password);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/map");
    await openMobileTab(page, "Чат");
    const input = page.getByPlaceholder("Введите сообщение");
    await expect(input).toBeVisible({ timeout: 15_000 });
  });

  test("TC-4.3 Free: ограничение записи в общий чат", async ({ page }) => {
    await loginViaUi(page, e2eUser.email, e2eUser.password);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/map");
    await openMobileTab(page, "Чат");
    const input = page.getByPlaceholder("Введите сообщение");
    if (await input.isVisible()) {
      const disabled = await input.isDisabled();
      const proText = page.getByText(/Pro|подписк/i);
      expect(
        disabled || (await proText.first().isVisible().catch(() => false)),
      ).toBeTruthy();
    }
  });
});
