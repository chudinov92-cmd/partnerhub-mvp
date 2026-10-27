# Отчёт: деплой email-доработки (2026-10-28) — провалы и решения

Цель: зафиксировать грабли, чтобы следующий деплой не занял столько шагов.
Сводный ранбук — `ai_docs/devel/runbooks/deploy-production.md`.

## Хронология проблем и как решили

### 1. Нет git remote на локальном клоне
- **Симптом:** `git push` не знал origin; прод-код на GitHub (`partnerhub-mvp`) существовал, но локально remote отсутствовал.
- **Решение:** выяснить origin с сервера
  `ssh root@186.246.2.104 "git -C /root/zeip/my-app remote get-url origin"`,
  добавить `git remote add origin <url>`.
- **Ранбук:** п.7 «История слияния».

### 2. Локальные коммиты и GitHub — несвязанные истории
- **Симптом:** `git push` → `rejected (fetch first)`, `git pull` → `refusing to merge unrelated histories`.
- **Решение:** слияние двух несвязанных историй через
  `git branch my-feature; git checkout -b main-from-remote origin/main; git merge my-feature --allow-unrelated-histories`,
  конфликты `add/add` разрешены в пользу актуальной версии GitHub, затем `main` передвинут и запушен.
- **Урок:** держать remote и историю синхронными заранее; не допускать деплой без push.

### 3. Docker-сборка не видела `libs/*`
- **Симптом:** `Module not found: Can't resolve '@my-startup/hooks'`, `'@my-startup/ui'`.
- **Причины (в появлении порядке):**
  1. Дееплой-скрипт указывал на корень `/root/zeip/my-app` → собирал СТАРУЮ копию приложения в корне.
  2. Docker-контекст `../../` указывал во вложенную `my-app/` (без `libs/`) →
     `lstat .../my-app/my-app: no such file`.
  3. `COPY my-app ./my-app` в builder затёр `node_modules` из deps.
  4. `npm ci` падал: `my-app/package-lock.json` не содержал `@my-startup/*`.
- **Решения:** `ROOT=/root/zeip/my-app/my-app`; `context: ../../../` + `dockerfile: my-app/Dockerfile`;
  порядок COPY «сначала `my-app`, потом node_modules из deps»; обновить `package-lock.json`.

### 4. `libs/ui` и `libs/hooks` не резолвились
- **Симптом:** `Cannot find module '@my-startup/ui'`.
- **Причина:** в `libs/ui/package.json` и `libs/hooks/package.json` были `"name": "ui"/"hooks"`
  (без скоупа) и `main/types` указывали на `./index.js`/`./src/index.d.ts` (нет в src).
- **Решение:** `"name": "@my-startup/ui"` / `"@my-startup/hooks"`; `main`/`types` = `"./src/index.ts"`.
- **Урок:** библиотеки должны называться `@my-startup/<имя>` и указывать на TS-исходник.

### 5. SQL-миграции на сервере не находились
- **Симптом:** `bash: supabase/sql/....sql: No such file or directory`.
- **Причина:** миграции в `/root/zeip/my-app/my-app/supabase/sql/`, а команда искала в корне.
- **Решение:** накатывать из `/root/zeip/my-app/my-app`; оттуда же запускать `deploy-app.sh`.

### 6. `email-notifications`/`exclude-support-from-email` дают `cannot change return type`
- **Причина:** порядок: `email-dm-deeplink` и др. пересоздают функцию с другим типом раньше.
- **Статус:** безвредно (`|| true`), финальная миграция пересоздаёт функцию корректно.

### 7. `.env.app` отсутствует в папке приложения
- **Решено:** одноразовый `cp /root/zeip/my-app/deploy/timeweb/.env.app /root/zeip/my-app/my-app/deploy/timeweb/.env.app`.

### 8. Изменение `name` в package.json хоста повлияло на локальную сборку
- **Симптом:** после правок `name` локальный `next build` падал на `SelectOverlay`/`truncateEmailText`.
- **Причина:** `setup-myapp-libs.sh` копирует только `src`; для `ui`/`hooks` нужны правильные `main/types`.
- **Решение:** настроить `package.json` библиотек на `./src/index.ts` (см. ранбук п.5).

## Итог
После всех правок деплой прошёл: `next build` ✓, образ собран, `app-web` запущен,
SQL-миграции применены, сайт отвечает 200. Ранбук `deploy-production.md` фиксирует
правильный порядок, чтобы повторить это без хаоса.