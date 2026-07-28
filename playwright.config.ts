import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

/** Локальные браузеры в репозитории — стабильный путь вне sandbox-cache Cursor. */
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(
  __dirname,
  "node_modules",
  ".playwright-browsers",
);

dotenv.config({ path: path.resolve(__dirname, ".env.e2e") });
dotenv.config({ path: path.resolve(__dirname, ".env.local"), override: false });

const baseURL = process.env.E2E_BASE_URL ?? "https://zeip.ru";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["json", { outputFile: "playwright-report/results.json" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "ru-RU",
    timezoneId: "Asia/Yekaterinburg",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
  timeout: 60_000,
  expect: { timeout: 15_000 },
});
