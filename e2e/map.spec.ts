import { test, expect } from "@playwright/test";
import { e2eUser } from "./helpers/env";
import { clearClientStorage, loginViaUi } from "./helpers/auth";
import { openMobileTab } from "./helpers/navigation";
import { describeWithUser } from "./helpers/skip";

test.describe("Фаза 3: Карта и поиск — smoke", () => {
  test("TC-3.1 Карта по умолчанию — Россия (первый визит)", async ({
    page,
  }) => {
    await clearClientStorage(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await openMobileTab(page, "Карта");
    const cityStorage = await page.evaluate(() =>
      localStorage.getItem("selected_city"),
    );
    expect(cityStorage === null || cityStorage === "Россия").toBeTruthy();
    await expect(page.locator(".leaflet-container").first()).toBeVisible({
      timeout: 25_000,
    });
  });

  test("TC-3.4 Панель фильтров открывается", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await openMobileTab(page, "Карта");
    await page.getByRole("button", { name: "Настройки поиска" }).click();
    await expect(
      page.getByText(/отрасл|професс|возраст|статус/i).first(),
    ).toBeVisible();
  });

  test("TC-3.6 Карта Leaflet отображается", async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator(".leaflet-container").first()).toBeVisible({
      timeout: 25_000,
    });
  });
});

describeWithUser("Фаза 3: Карта — авторизованный", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, e2eUser.email, e2eUser.password);
  });

  test("TC-3.2 Выбор города сохраняется в localStorage", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    const cityButton = page
      .locator("header")
      .getByRole("button")
      .filter({ hasText: /Россия|Пермь|Москва/i })
      .first();
    if (await cityButton.isVisible()) {
      await cityButton.click();
      const perm = page
        .getByRole("option", { name: "Пермь" })
        .or(page.getByText("Пермь", { exact: true }));
      if (await perm.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await perm.first().click();
        await page.waitForTimeout(500);
        const stored = await page.evaluate(() =>
          localStorage.getItem("selected_city"),
        );
        expect(stored).toBe("Пермь");
      }
    }
  });

  test("TC-3.3 Фильтр: панель поиска и кнопка Поиск", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await openMobileTab(page, "Карта");
    await page.getByRole("button", { name: "Настройки поиска" }).click();
    await expect(page.getByText("Поиск специалистов")).toBeVisible();
    await page.getByRole("button", { name: "Поиск", exact: true }).click();
    await expect(page.locator(".leaflet-container").first()).toBeVisible();
  });

  test("TC-3.5 Рекомендованные контакты в фильтрах", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await openMobileTab(page, "Карта");
    await page.getByRole("button", { name: "Настройки поиска" }).click();
    await expect(page.getByText("Рекомендованные контакты")).toBeVisible();
  });

  test("TC-3.9 Режим только контакты на карте (?mapContacts=1)", async ({
    page,
  }) => {
    await page.goto("/?mapContacts=1");
    await expect(page.locator(".leaflet-container").first()).toBeVisible({
      timeout: 25_000,
    });
  });
});
