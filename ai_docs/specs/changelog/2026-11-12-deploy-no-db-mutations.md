# 2026-11-12: Деплой не должен менять базу данных — безопасность Supabase

## Контекст
`deploy-app.sh` при каждом запуске заново прогонял ВСЕ старые SQL-миграции из репо, что дважды (12.11) откатило исправления безопасности, применённые вручную через Studio. Деплой был запрещён до исправления.

## Что было сделано
1. **deploy-app.sh** — миграции выключены по умолчанию (`RUN_MIGRATIONS=0`). Запуск только с явным `RUN_MIGRATIONS=1`. Добавлено понятное сообщение.
2. **sync-smtp-to-env-app.sh** (2 копии) — исправлены пути: `APP_ENV` теперь указывает на `/root/zeip/my-app/my-app/deploy/timeweb/.env.app` (рабочий путь).
3. **.gitignore (корневой)** — добавлены `.env*` (кроме `.env.example`), `.vercel/`, `tsconfig.tsbuildinfo`, `next-env.d.ts`.
4. **Аудит 40+ SQL-миграций** — составлена таблица конфликтов с целевым состоянием, описаны исправления.
5. **SELECT-запросы на дубли** — для миграций, меняющих данные при повторном запуске.
6. **security-baseline.sql** — идемпотентный файл, фиксирующий целевое защищённое состояние: revoke/grant, alter function, drop лишних политик, правильные гранты.
7. **decision-log.md** — запись о решении.

## Что затронуто
- `my-app/deploy/timeweb/deploy-app.sh` — обёртка RUN_MIGRATIONS
- `scripts/vps/sync-smtp-to-env-app.sh` — исправление пути
- `my-app/scripts/vps/sync-smtp-to-env-app.sh` — исправление пути
- `.gitignore` — расширенная защита секретов
- `my-app/supabase/sql/2026-11-12-security-baseline.sql` — новый файл

## Проверка
1. `npx nx build my-app` — без ошибок (SQL-файлы не компилируются, только копируются)
2. На VPS: `bash deploy-app.sh` — без RUN_MIGRATIONS не трогает базу
3. На VPS: `RUN_MIGRATIONS=1 bash deploy-app.sh` — запускает миграции + security-baseline последним
4. security-baseline.sql идемпотентен — безопасно запускать повторно