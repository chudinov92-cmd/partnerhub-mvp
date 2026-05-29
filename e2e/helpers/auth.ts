import { expect, type Page } from "@playwright/test";

/** Заполнение формы входа (label без htmlFor — только input в form). */
async function fillSignInForm(
  page: Page,
  email: string,
  password: string,
) {
  const form = page.locator("form");
  await expect(form).toBeVisible({ timeout: 20_000 });
  await form.locator('input[type="email"]').fill(email);
  await form.locator('input[type="password"]').fill(password);
}


function headerUserMenuButton(page: Page) {
  return page
    .locator("header")
    .locator("button")
    .filter({ has: page.locator("span.rounded-full") })
    .first();
}

async function isSignedInUi(page: Page): Promise<boolean> {
  if (await headerUserMenuButton(page).isVisible().catch(() => false)) {
    return true;
  }
  // После redirect=/admin/* — AdminShell, не TopBar с аватаркой.
  if (
    await page
      .getByRole("navigation", { name: "Разделы админки" })
      .isVisible()
      .catch(() => false)
  ) {
    return true;
  }
  // Обычный пользователь на /admin/*: middleware отдаёт 403, но сессия есть.
  if (page.url().includes("/admin")) {
    const forbidden = await page
      .getByText(/доступ запрещён/i)
      .isVisible()
      .catch(() => false);
    if (forbidden) return true;
  }
  return false;
}

/** Успешный вход: TopBar с аватаркой или shell админки. */
async function waitForSignedIn(page: Page, email: string) {
  const wrongPassword = page.getByText(/Неверный логин или пароль/i);

  await expect(async () => {
    if (await wrongPassword.isVisible().catch(() => false)) {
      throw new Error(
        `Неверный логин или пароль для ${email}. Сверьте пароль в my-app/.env.e2e с тем, что вводите вручную (символ # без кавычек в .env обрезается).`,
      );
    }

    if (await isSignedInUi(page)) {
      return;
    }

    throw new Error("still waiting for sign-in");
  }).toPass({ timeout: 45_000, intervals: [300, 500, 1000] });
}

function assertE2ePasswordLoaded(email: string, password: string) {
  if (password.length >= 8) return;
  throw new Error(
    `Пароль для ${email} в my-app/.env.e2e слишком короткий (${password.length} симв.). ` +
      `Сейчас в тест уходит не полный пароль. Если в пароле есть # — оберните значение в кавычки: E2E_USER_PASSWORD="ваш#пароль".`,
  );
}

export async function loginViaUi(
  page: Page,
  email: string,
  password: string,
  redirectPath?: string,
) {
  assertE2ePasswordLoaded(email, password);

  const url = redirectPath
    ? `/auth?redirect=${encodeURIComponent(redirectPath)}`
    : "/auth";
  await page.goto(url);
  await page.waitForLoadState("domcontentloaded");

  if (!page.url().includes("/auth")) {
    return;
  }

  const signinTab = page
    .locator("div.rounded-full")
    .getByRole("button", { name: "Вход", exact: true });
  if (await signinTab.isVisible().catch(() => false)) {
    await signinTab.click();
  }

  const form = page.locator("form");
  await fillSignInForm(page, email, password);

  const tokenOk = page.waitForResponse(
    (r) =>
      r.url().includes("/auth/v1/token") &&
      r.request().method() === "POST" &&
      r.status() === 200,
    { timeout: 45_000 },
  );

  try {
    await Promise.all([
      tokenOk,
      form.getByRole("button", { name: "Войти" }).click(),
    ]);
  } catch {
    const tokenResp = await page
      .waitForResponse(
        (r) =>
          r.url().includes("/auth/v1/token") &&
          r.request().method() === "POST",
        { timeout: 10_000 },
      )
      .catch(() => null);

    if (tokenResp && tokenResp.status() !== 200) {
      throw new Error(
        `Auth token HTTP ${tokenResp.status()} для ${email}. Проверьте E2E_* в my-app/.env.e2e.`,
      );
    }
  }

  await waitForSignedIn(page, email);
}

export async function logoutViaTopBar(page: Page) {
  await page.goto("/");
  await headerUserMenuButton(page).click();
  await page.getByRole("button", { name: "Выйти" }).click();
  await page.waitForURL(/\/auth/, { timeout: 15_000 });
}

export async function clearClientStorage(page: Page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
