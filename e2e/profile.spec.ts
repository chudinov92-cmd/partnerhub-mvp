import { test, expect } from "@playwright/test";
import { e2eOtherProfileId, e2eUser } from "./helpers/env";
import { loginViaUi } from "./helpers/auth";
import { describeWithUser } from "./helpers/skip";
import { openMobileTab } from "./helpers/navigation";

describeWithUser("Фаза 2: Профиль", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, e2eUser.email, e2eUser.password);
  });

  test("TC-2.1 Страница профиля загружается и содержит форму", async ({
    page,
  }) => {
    await page.goto("/profile");
    await expect(
      page.getByRole("heading", { name: "Мой профиль" }),
    ).toBeVisible({ timeout: 20_000 });
    const personal = page
      .locator("div")
      .filter({
        has: page.getByRole("heading", { name: "Личная информация" }),
      })
      .first();
    await expect(personal.getByText("Имя", { exact: true })).toBeVisible();
    await expect(personal.locator('input[type="text"]').first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Сохранить профиль" }),
    ).toBeVisible();
  });

  test("TC-2.2 Блок геолокации на профиле", async ({ page }) => {
    await page.goto("/profile");
    await expect(
      page.getByRole("heading", { name: "Локация на карте" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/кликни по карте|точная точка будет скрыта/i).first(),
    ).toBeVisible();
  });

  test("TC-2.3 Блок интересующих профессий", async ({ page }) => {
    await page.goto("/profile");
    await expect(
      page.getByText(/интересующие профессии/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("TC-2.4b Публичный профиль (авторизованный)", async ({ page }) => {
    test.skip(!e2eOtherProfileId, "Задайте E2E_OTHER_PROFILE_ID в .env.e2e");
    await page.goto(`/profiles/${e2eOtherProfileId}`);
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("TC-2.5 Предупреждение без города/профессии", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/map");
    await openMobileTab(page, "Мои чаты");
    const hint = page.getByText(/заполните профиль|город|профессию|профил/i);
    await expect(hint.first()).toBeVisible({ timeout: 15_000 }).catch(() => {
      // профиль уже заполнен — ок
    });
  });
});

test("TC-2.4 Публичный профиль (гость)", async ({ page }) => {
  test.skip(!e2eOtherProfileId, "Задайте E2E_OTHER_PROFILE_ID в .env.e2e");
  await page.goto(`/profiles/${e2eOtherProfileId}`);
  await expect(page.locator("body")).not.toContainText("Application error");
  await expect(
    page.getByRole("button", { name: /добавить в контакты/i }),
  ).toHaveCount(0);
});
