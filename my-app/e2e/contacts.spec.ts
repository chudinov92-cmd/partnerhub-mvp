import { test, expect } from "@playwright/test";
import { e2eUser } from "./helpers/env";
import { loginViaUi } from "./helpers/auth";
import { openMobileTab } from "./helpers/navigation";
import { describeWithUser } from "./helpers/skip";

describeWithUser("Фаза 6: Контакты", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, e2eUser.email, e2eUser.password);
  });

  test("TC-6.1 Вкладка «Контакты» открывается", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/map");
    await openMobileTab(page, "Контакты");
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.locator("body")).not.toContainText(
      "личных диалогов с контактами",
    );
  });

  test("TC-6.3 Контакты: вкладка и иконка в TopBar при наличии контактов", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/map");
    await openMobileTab(page, "Контакты");
    await expect(page.locator("body")).not.toContainText("Application error");

    const headerContacts = page.locator("header").getByLabel("Контакты");
    const count = await headerContacts.count();
    if (count > 0) {
      await expect(headerContacts.first()).toBeVisible({ timeout: 15_000 });

      const badgeText = await headerContacts
        .first()
        .locator("span")
        .last()
        .textContent();
      const contactCount = badgeText?.trim() === "9+" ? 9 : Number(badgeText);
      if (Number.isFinite(contactCount) && contactCount > 0) {
        await expect(page.getByRole("heading", { name: "Контакты" })).toBeVisible();
        await expect(page.locator("body")).not.toContainText(
          "У вас пока нет контактов",
        );
        await expect(
          page.locator("aside ul li").first(),
        ).toBeVisible({ timeout: 15_000 });
      }
    }
  });
});
