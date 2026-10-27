# Переезд на test.zeip.ru

Статус: **откат на zeip.ru** (2026-07-28). См. [`DNS-prod-domain.md`](../../my-app/deploy/timeweb/DNS-prod-domain.md) и [`migrate-to-prod-domain.sh`](../../my-app/scripts/vps/migrate-to-prod-domain.sh).

## Чеклист (история test-стенда)

- [x] DNS A `test` → `186.246.2.104`
- [x] VPS: Caddy (`test.zeip.ru` + 404 на `zeip.ru`), GoTrue `SITE_URL`, `.env.app`, deploy
- [x] Git: legal JSON, Caddyfile.example, e2e defaults
- [x] SQL `push_dispatch_url` → `https://test.zeip.ru/api/push/dispatch` (UPDATE 1)

## Откат на prod (2026-07-28)

- [ ] DNS Timeweb: удалить A `test` (сейчас `test.zeip.ru` ещё → `186.246.2.104`; `@` и `www` уже на VPS)
- [x] Скрипт `migrate-to-prod-domain.sh` + `run-migrate-prod-domain-remote.sh` (коммиты `cb303a7`, `aed67e8`)
- [ ] **VPS:** выполнить миграцию (сейчас `zeip.ru` → 404, `test.zeip.ru` → 200):

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
bash scripts/vps/run-migrate-prod-domain-remote.sh
# или: VPS_SSH_PASSWORD='***' bash scripts/vps/run-migrate-prod-domain-remote.sh
```
- [ ] Robokassa / VK Maps URLs в ЛК (см. `integrations-prod-domain.md`)
- [ ] Smoke: `https://zeip.ru` — 200; `test.zeip.ru` — недоступен
- [ ] РКН E1 с URL `https://zeip.ru` (см. `cookie-pd-compliance.md`)

## Проверка prod с Mac

```bash
dig +short zeip.ru A @8.8.8.8
dig +short test.zeip.ru A @8.8.8.8
/usr/bin/curl -sI https://zeip.ru/
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
bash scripts/migration/healthcheck_timeweb.sh "https://zeip.ru" "https://supabase.zeip.ru"
```

## Проверка на VPS

```bash
ssh root@186.246.2.104
curl -sI https://zeip.ru/ | head -5
grep SITE_URL /root/zeip/supabase-stack/.env
docker exec -i supabase-db psql -U supabase_admin -d postgres -c "SELECT value FROM public.app_config WHERE key='push_dispatch_url';"
```
