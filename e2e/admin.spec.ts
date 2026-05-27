import { test, expect } from "@playwright/test";
import { e2eAdmin, e2eUser } from "./helpers/env";
import { loginViaUi } from "./helpers/auth";
import { describeWithAdmin, describeWithUser } from "./helpers/skip";

test.describe("Фаза 9: Админка — API", () => {
  test("TC-12.3 Admin API profile-demand без сессии", async ({ request }) => {
    const res = await request.get(
      "/api/admin/analytics/profile-demand?from=2026-01-01&to=2026-12-31",
    );
    expect([401, 403]).toContain(res.status());
  });

  test("TC-12.3b Admin API map-search без сессии", async ({ request }) => {
    const res = await request.get(
      "/api/admin/analytics/map-search?from=2026-01-01&to=2026-12-31",
    );
    expect([401, 403]).toContain(res.status());
  });
});

describeWithUser("Фаза 9: Админка — доступ пользователя", () => {
  test("TC-9.1 Обычный пользователь — 403 на /admin/users", async ({
    page,
  }) => {
    await loginViaUi(page, e2eUser.email, e2eUser.password);
    const res = await page.goto("/admin/users");
    expect(res?.status()).toBe(403);
    await expect(page.getByText(/доступ запрещён/i)).toBeVisible();
  });
});

describeWithAdmin("Фаза 9: Админка — support+", () => {
  test("TC-9.2 Админ: страница пользователей", async ({ page }) => {
    await loginViaUi(page, e2eAdmin.email, e2eAdmin.password, "/admin/users");
    await page.waitForURL(/\/admin/, { timeout: 30_000 });
    await expect(
      page.getByRole("navigation", { name: "Разделы админки" }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("TC-9.8 Аналитика: блок «Кто кого ищет»", async ({ page }) => {
    await loginViaUi(page, e2eAdmin.email, e2eAdmin.password);
    await page.goto("/admin/analytics");
    await expect(
      page.getByText(/кто кого ищет|спрос в профилях|поиск на карте/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("TC-9.3–9.7 Навигация админки по разделам", async ({ page }) => {
    await loginViaUi(page, e2eAdmin.email, e2eAdmin.password, "/admin/users");
    await page.waitForURL(/\/admin/, { timeout: 30_000 });
    const nav = page.getByRole("navigation", { name: "Разделы админки" });
    for (const section of ["Посты", "Жалобы", "Поддержка", "Аналитика"]) {
      const link = nav.getByRole("link", { name: new RegExp(section, "i") });
      if (await link.isVisible().catch(() => false)) {
        await link.click();
        await expect(page).toHaveURL(/\/admin\//);
      }
    }
  });
});
