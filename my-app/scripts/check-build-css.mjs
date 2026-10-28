#!/usr/bin/env node
// Защита сборки: после `next build` Tailwind должен сгенерировать классы компонентов из
// библиотек (@my-startup/*). Если Docker переиспользовал слой npm ci со старыми копиями
// libs, нужные классы пропадают и прод «ломается» (чат на весь экран, пины поверх попапа,
// чёрная звезда рейтинга). Скрипт падает с понятной ошибкой, чтобы это не дошло до деплоя.
//
// Использование: node scripts/check-build-css.mjs
import fs from "node:fs";
import path from "node:path";
import { cwd } from "node:process";

// Ключевые классы — по одному на каждую сломанную зону:
//  - chat window (lg:rounded-2xl) и его z-index
//  - попап профиля (z-[1450])
//  - панель чата (bg-slate-50/70)
//  - золотая звезда рейтинга (text-amber-500)
const REQUIRED = [
  "lg\\:rounded-2xl",
  "z-\\[1600\\]",
  "z-\\[1450\\]",
  "bg-slate-50\\/70",
  "text-amber-500",
];

const cssDir = path.join(cwd(), ".next", "static", "css");
let cssFound = false;
const found = new Set();

for (const f of fs.readdirSync(cssDir, { withFileTypes: true })) {
  if (!f.isFile() || !f.name.endsWith(".css")) continue;
  cssFound = true;
  const css = fs.readFileSync(path.join(cssDir, f.name), "utf8");
  for (const sel of REQUIRED) {
    if (css.includes("." + sel + "{")) found.add(sel);
  }
}

if (!cssFound) {
  console.error(
    "✗ check-build-css: каталог .next/static/css пуст или не найден. Сначала выполните next build.",
  );
  process.exit(1);
}

const missing = REQUIRED.filter((sel) => !found.has(sel));
if (missing.length > 0) {
  console.error(
    "✗ check-build-css: после next build в .next/static/css НЕ найдены классы из библиотек:",
  );
  for (const sel of missing) console.error("   • ." + sel);
  console.error(
    "Возможные причины: устаревшие копии libs в my-app/node_modules/@my-startup. " +
      "Запустите: bash scripts/setup-myapp-libs.sh, затем пересоберите.",
  );
  console.error(
    "Дополнительно в Docker: собирайте с --build-arg LIBS_CACHEBUST=<git sha> (см. deploy-app.sh).",
  );
  process.exit(1);
}

console.error("✓ check-build-css: все ключевые классы библиотек на месте.");