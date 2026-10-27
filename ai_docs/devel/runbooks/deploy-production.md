# Деплой в прод (Runbook). Читать ПЕРЕД любой операцией на VPS.

## Кратко про архитектуру (важно!)

- **Монорепозиторий** с приложением **`my-app/`** и библиотеками в **`libs/`**.
- Приложение зависит от `@my-startup/*` (`file:../libs/*`), а `scripts/setup-myapp-libs.sh`
  (postinstall в `my-app/package.json`) копирует `libs/*` → `my-app/node_modules/@my-startup/*`.
- **Ключевой риск:** локальный git-копия и компот сервера легко расходятся (см. «История слияния»).

## Хостинг / доступ

- VPS: `root@186.246.2.104`, SSH с паролем (вводится интерактивно пользователем).
- Гит-репозиторий прод-кода лежит **на сервере** в `/root/zeip/my-app`.
  Код подтягивается на сервер через `git pull` из `origin` (GitHub: `git@github.com:chudinov92-cmd/partnerhub-mvp.git`).
- Сайт: `https://zeip.ru` → `186.246.2.104`.
- Docker-сервисы: `app-web` (приложение), `supabase-*` (БД, auth, storage и т.д.), Caddy (прокси).

## Точки пути на сервере (НЕ перепутать!)

- `/root/zeip/my-app` — **корень git-репозитория** (монопрепо): здесь `libs/`, `scripts/`, `my-app/`.
- `/root/zeip/my-app/my-app` — **папка приложения** (Next.js): здесь `deploy/`, `supabase/`, `src/`.
  Именно в ней живут **актуальные** SQL-миграции и `deploy-app.sh`.
- `/root/zeip/my-app/deploy/timeweb/.env.app` — **секреты** (НЕ в git). Есть копия в
  `/root/zeip/my-app/my-app/deploy/timeweb/.env.app` (см. ниже).

> ⚠️ В корне git-репо могут лежать УСТАРЕВШИЕ копии (`Dockerfile`, `src/`, `deploy/`) —
> это остатки старой структуры «приложение в корне». **Не использовать их для деплоя.**

## Порядок деплоя (единственный правильный)

Деплой идёт **из папки приложения** `/root/zeip/my-app/my-app`:

```bash
cd /Users/vladimirchudinov/Desktop/my-startup   # локальный клон (на Mac)

# 1) Закоммитить и запушить изменения в GitHub origin:
git add -A
git commit -m "feat/...: краткое описание"
git push -u origin main

# 2) На сервере: подтянуть код, накатить SQL-миграции, пересобрать и перезапустить приложение:
ssh root@186.246.2.104 "cd /root/zeip/my-app/my-app && git pull --ff-only && bash deploy/timeweb/deploy-app.sh"
```

`deploy-app.sh` (в `/root/zeip/my-app/my-app`) автоматически:
1. делает `git pull`;
2. прогоняет **все** SQL-миграции из `my-app/supabase/sql/` (см. предостережение №1);
3. пересобирает Docker-образ (`docker build`, Next.js) и запускает `app-web`;
4. перезагружает Caddy, проверяет HTTP.

## Что проверять после деплоя

Просто признак успеха в логе:
- `✓ Compiled successfully` и `Image timeweb-app-web Built`;
- `Container app-web Started`;
- `cookie-consent: HTTP 200` и `/subscription` → `HTTP/1.1 200 OK`.

## ПРЕДОСТЕРЕЖЕНИЯ (чтобы не повторить провалы)

### 1. SQL-миграции не идемпотентны по-отношению к `get_profiles_for_message_email()`
При каждом `deploy-app.sh` миграции `email-notifications` и `exclude-support-from-email`
выдают `ERROR: cannot change return type of existing function ... Use DROP FUNCTION first.`
Это **не критично** — скрипт использует `|| true`, продолжает, а финальная миграция
`email-dm-message-preview` в конце корректно пересоздаёт функцию (`DROP FUNCTION`+`CREATE FUNCTION`).
Не пытайся «чинить» этот шум без осознания — он безвреден. Если хочется чище — добавить
`DROP FUNCTION` в начало проблемных миграций.

### 2. МИГРАЦИИ ОБЯЗАНЫ лежать в `my-app/supabase/sql/`
Путь на сервере — `/root/zeip/my-app/my-app/supabase/sql/<файл>.sql`.
НЕ пиши командой без префикса `my-app/` (например `supabase/sql/...` из корня — это не тот).
Всегда: `cd /root/zeip/my-app/my-app` перед операциями с SQL.

### 3. `.env.app` может отсутствовать в папке приложения
`deploy-app.sh` берёт env из `${ROOT}/deploy/timeweb/.env.app`, где `ROOT=/root/zeip/my-app/my-app`.
Если файла нет (например после пересоздания папки) — скопируй один раз:
```bash
ssh root@186.246.2.104 "cp /root/zeip/my-app/deploy/timeweb/.env.app /root/zeip/my-app/my-app/deploy/timeweb/.env.app"
```

### 4. Docker-контекст и Dockerfile
- `docker-compose.app.yml` (в `my-app/deploy/timeweb/`) должен иметь:
  `context: ../../../` и `dockerfile: my-app/Dockerfile` — только так сборка видит `libs/`.
- `my-app/Dockerfile` собирает монопрепо: `deps` слой делает `npm ci` в `my-app/` (postinstall
  копирует libs), `builder` собирает `next build`, `runner` выкладывает standalone.
- В `builder` порядок COPY важен: сначала `COPY my-app ./my-app`, ПОТОМ `node_modules` из deps
  (иначе COPY поверх затёр бы библиотеки).

### 5. Библиотеки `libs/ui` и `libs/hooks` — особая настройка package.json
У них обязательно:
- `"name": "@my-startup/ui"` и `"@my-startup/hooks"` (скоуп обязателен);
- `"main"` и `"types"` = `"./src/index.ts"` (указывать на TS-исходник, НЕ на `index.js`/`index.d.ts`,
  которых нет в src). Либо они сломают резолюцию в `next build`.

### 6. История слияния (когда-то была ошибка)
Если `git push`/`git pull` жалуется на «unrelated histories» / `refusing to merge` —
это значит локальные коммиты и ветка на GitHub НЕ имеют общего предка. НЕ паникуй и НЕ делай
`push --force`. Сначала: `git fetch origin`, затем аккуратно `git merge origin/main --allow-unrelated-histories`,
разрешив конфликты, сохранив свою работу. Но **в норме** используй описанный порядок выше —
он не должен приводить к слиянию несвязанных историй.

### 7. Не коммить артефакты
`.nx/`, `dist/`, `node_modules/`, `.next/` не должны попадать в git (проверяй `git status`).

## Самые частые команды-«аварийки»

- Узнать, какой коммит на сервере: `ssh root@186.246.2.104 "cd /root/zeip/my-app/my-app && git log --oneline -1"`
- Посмотреть логи приложения: `ssh root@186.246.2.104 "docker logs app-web --tail 30"`
- Статус контейнера: `ssh root@186.246.2.104 "docker ps --filter name=app-web --format '{{.Names}} {{.Status}}'"`