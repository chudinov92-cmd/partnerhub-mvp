# Переключение prod на paid_gate (2026-08-11)

## Якоря отката freemium

| Якорь | Значение |
|-------|----------|
| Git tag | `prod-freemium-2026-08-10` (commit `65f724d`) |
| Docker image (на VPS после backup) | `timeweb-app-web:freemium-rollback` |
| Env backup (на VPS) | `deploy/timeweb/.env.app.freemium.bak` |

## Деплой paid_gate (одна команда на VPS)

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
git pull --ff-only
bash scripts/vps/deploy-prod-paid-gate.sh
```

Скрипт:
1. `backup-prod-freemium.sh` (если backup ещё нет)
2. `NEXT_PUBLIC_ACCESS_MODE=paid_gate` в `.env.app`
3. `deploy-app.sh` (в т.ч. SQL `2026-08-11-subscription-trial.sql`)
4. `stop app-web-test`

## Быстрый откат freemium (~10 s)

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
bash scripts/vps/rollback-prod-freemium.sh
```

## Полный откат (код + rebuild, ~75 s)

```bash
git checkout prod-freemium-2026-08-10
cp deploy/timeweb/.env.app.freemium.bak deploy/timeweb/.env.app
bash deploy/timeweb/deploy-app.sh
git checkout main
```

## SQL trial (если деплой вручную)

```bash
cd /root/zeip/my-app
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < supabase/sql/2026-08-11-subscription-trial.sql
```

## Smoke после paid_gate

- `/` — Hero «Карту смотреть бесплатно · участие от 249 ₽»
- `/subscription` — один тариф (без Free vs Pro)
- Гость GET `/map` → redirect `/`
- Unpaid DM — PaywallDrawer

```bash
cd "/Users/vladimirchudinov/Desktop/my-startup/my-app"
bash scripts/migration/healthcheck_timeweb.sh "https://zeip.ru" "https://supabase.zeip.ru"
```

## Статус

| Шаг | Статус |
|-----|--------|
| Merge paid_gate в main | ✅ `0e5dcce` |
| Tag + scripts | ✅ |
| VPS deploy | ⏳ образ собран; `up` упал без `.env.app.test` — см. recovery ниже |

## Recovery (если up упал на .env.app.test)

Образ `timeweb-app-web:latest` уже с paid_gate после build. Достаточно:

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
git pull --ff-only
docker compose --env-file deploy/timeweb/.env.app -f deploy/timeweb/docker-compose.app.yml up -d app-web
curl -sS https://zeip.ru/subscription | grep -o 'Доступ к сети\|Тарифные планы' | head -1
```

Ожидаем **`Доступ к сети`**, не «Тарифные планы».

Исправление в `deploy-app.sh` (commit `e1ff39d`): prod deploy только `app-web`, без test.
