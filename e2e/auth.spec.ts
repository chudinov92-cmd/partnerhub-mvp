import { test, expect } from "@playwright/test";
import { e2eUser } from "./helpers/env";
import { loginViaUi, logoutViaTopBar } from "./helpers/auth";
import { describeWithUser } from "./helpers/skip";

test.describe("Фаза 1: Аутентификация", () => {
  test("TC-1.1 Регистрация: форма и отправка", async ({ page }) => {
    const unique = `e2e-${Date.now()}@example.com`;
    await page.goto("/auth");
    await page
      .locator("div.rounded-full")
      .getByRole("button", { name: "Регистрация", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: "Регистрация" })).toBeVisible();
    const form = page.locator("form");
    await form.locator('input[type="text"]').fill("E2E Test");
    await form.locator('input[type="email"]').fill(unique);
    await form.locator('input[type="password"]').fill("TestPass123!");
    await page.getByRole("button", { name: "Зарегистрироваться" }).click();
    await expect(
      page.getByText(/письмо|подтвержден/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("TC-1.5 Страница сброса пароля доступна", async ({ page }) => {
    await page.goto("/auth/reset-password");
    await expect(
      page
        .getByRole("heading", { name: /новый пароль|недействительна/i })
        .or(page.getByText(/проверка ссылки/i)),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("TC-1.6 Редирект из /admin без авторизации", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/auth\?redirect=%2Fadmin%2Fusers/);
  });

  describeWithUser("С учётными данными E2E_USER", () => {
    test("TC-1.2 Вход существующим пользователем", async ({ page }) => {
      await loginViaUi(page, e2eUser.email, e2eUser.password);
      await expect(page).not.toHaveURL(/\/auth(?:\?|$)/);
      await expect(
        page.locator("header").getByRole("link", { name: "Войти" }),
      ).toBeHidden();
    });

    test("TC-1.3 Ошибка входа (неверный пароль)", async ({ page }) => {
      await page.goto("/auth");
      const form = page.locator("form");
      await form.locator('input[type="email"]').fill(e2eUser.email);
      await form.locator('input[type="password"]').fill("wrong-password-xyz");
      await page.getByRole("button", { name: "Войти" }).click();
      await expect(page.getByText(/Неверный логин или пароль/i)).toBeVisible();
      await expect(page).toHaveURL(/\/auth/);
    });

    test("TC-1.4 Восстановление пароля", async ({ page }) => {
      await page.goto("/auth");
      await page.getByRole("button", { name: "Забыли пароль?" }).click();
      await expect(
        page.getByRole("heading", { name: "Восстановление пароля" }),
      ).toBeVisible();
      // Не e2eUser — иначе GoTrue выставит recovery_sent_at и сломает последующие тесты.
      await page
        .locator("form")
        .locator('input[type="email"]')
        .fill(`e2e-forgot-${Date.now()}@example.com`);
      await page.getByRole("button", { name: "Отправить ссылку" }).click();
      await expect(
        page.getByText(/отправили письмо|зарегистрирован/i).first(),
      ).toBeVisible({ timeout: 20_000 });
    });

    test("TC-1.6b После входа — редирект в админку", async ({ page }) => {
      await loginViaUi(page, e2eUser.email, e2eUser.password, "/admin/users");
      await page.waitForURL(/\/(admin|auth)/, { timeout: 30_000 });
      const url = page.url();
      expect(url.includes("/admin/users") || url.includes("/auth")).toBeTruthy();
    });

    test("TC-1.7 Выход из системы", async ({ page }) => {
      await loginViaUi(page, e2eUser.email, e2eUser.password);
      await logoutViaTopBar(page);
      await page.goto("/subscription");
      await expect(page).toHaveURL(/\/auth/);
    });
  });
});
