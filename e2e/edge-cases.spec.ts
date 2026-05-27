import { test, expect } from "@playwright/test";
import { baseURL } from "./helpers/env";

test.describe("Фаза 12: Edge cases и безопасность", () => {
  test("TC-12.2 POST map-search analytics принимает событие", async ({
    request,
  }) => {
    const res = await request.post("/api/analytics/map-search", {
      data: {
        target_profession: "E2E Test Profession",
        city_context: "Пермь",
        filters_json: { profession: "E2E Test Profession" },
      },
    });
    expect([200, 201, 204]).toContain(res.status());
  });

  test("TC-12.3 Admin posts API без авторизации", async ({ request }) => {
    const res = await request.patch("/api/admin/posts", {
      data: { postId: "00000000-0000-0000-0000-000000000000", hidden: true },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("TC-12.4 Profanity: публичные страницы отвечают 200", async ({
    request,
  }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);
  });

  test("TC-12.5 Subscription page redirect для гостя", async ({ page }) => {
    await page.goto("/subscription");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("Health: главная и auth отдают HTML", async ({ request }) => {
    for (const path of ["/", "/auth", "/landing"]) {
      const res = await request.get(path);
      expect(res.status(), `${baseURL}${path}`).toBe(200);
      const ct = res.headers()["content-type"] ?? "";
      expect(ct).toMatch(/text\/html/i);
    }
  });
});
