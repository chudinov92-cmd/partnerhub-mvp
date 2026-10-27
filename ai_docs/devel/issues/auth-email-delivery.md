# Auth-письма не доходят (Gmail + Yandex) — 2026-09-07

## Статус: **РЕШЕНО** (2026-09-10)

- HELO `mail.zeip.ru` + A/PTR + hostname на VPS
- mail-tester **10/10** (id swaks `1x4ep3-000000008E2-18V5`)
- Recovery OTP на `vova1992_92@mail.ru` — **во входящие**

**Отложено:** DMARC `p=quarantine` — не раньше **2026-09-24** (см. [email-dmarc-and-vps-migration.md](../../tasks/email-dmarc-and-vps-migration.md)).  
**При смене VPS/IP:** тот же документ — A/PTR `mail.zeip.ru` + `run-set-mail-helo-remote.sh`.

---

## Статус (2026-09-10, HELO / Spamhaus — корневая причина)

**Timeweb (тикет, Александр Дерябин):** письмо `1x3elR-000000007xz-3tXe` принято `smtp.timeweb.ru`, затем **помечено спамом** (score 9.4) из‑за HELO `7662691-eo681482.twc1.net` (технический hostname VPS в **Spamhaus**), отправлено через `smtp-spam` → **mail.ru отклонил** (`550 spam message rejected`). Задержка на Yandex была на стороне Timeweb — **исправлена**.

**Решение:** HELO/hostname = **`mail.zeip.ru`** (не `twc1.net`, не apex `zeip.ru`). Отправка **только** через `smtp.timeweb.ru` + AUTH `noreply@zeip.ru` — без Postfix на VPS.

**DNS (Timeweb, вручную до смены hostname):**

1. A: `mail.zeip.ru` → `186.246.2.104`
2. PTR: `186.246.2.104` → `mail.zeip.ru`

**Проверка DNS:**

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
bash scripts/vps/verify-mail-helo-dns.sh
bash scripts/check-email-dns.sh
```

**Применение на VPS:**

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
git pull --ff-only
bash scripts/vps/set-mail-helo-hostname.sh
```

С Mac (DNS OK → SSH):

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
bash scripts/vps/run-set-mail-helo-remote.sh
```

**Не делать:** Postfix/прямая отправка на MX; `ip4:186.246.2.104` в SPF; hostname = `zeip.ru`; пачки swaks на личные ящики.

---

## Статус (2026-09-08, OTP-only auth)

**Решение:** confirm/recovery переведены на **OTP-only** (plain HTML без `<a href>`, только `{{ .Token }}`). Срок кода **10 минут** (`GOTRUE_MAILER_OTP_EXP=600`). UI: forgot → код + redirect на `/auth/reset-password?email=`; signup → OTP сразу после регистрации.

**Деплой с Mac:**

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
bash scripts/vps/run-deploy-recovery-template-remote.sh
ssh root@186.246.2.104
cd /root/zeip/my-app && git pull --ff-only && bash scripts/vps/fix-auth-email-on-vps.sh
```

**Проверка после деплоя:** чеклист в [password-recovery-email.md](../features/password-recovery-email.md#чеклист-проверки-prod).

**Гипотеза:** plain OTP без ссылок лучше проходит фильтры Mail.ru/Yandex, чем HTML recovery с `token_hash` (swaks HTML → спам, plain text → inbox).

---

## Статус (2026-09-08)

| Компонент | Статус |
|---|---|
| DMARC | `p=none` (откат выполнен, DNS подтверждён 2026-09-10) |
| HELO / PTR | **OK** (2026-09-10) |
| Транзакционные (`/api/email/new-message`) | **OK** — HTTP 200, SMTP в `.env.app` |
| Recovery GoTrue (`/recover`) | **Отправляет** (`recovery_sent_at` обновляется), но **не доходит** на Mail.ru/Yandex |

### Диагностика recovery 2026-09-08 (mail.ru + yandex.ru)

**Симптом:** recovery через UI на `vova1992_92@mail.ru` и `v.chudinov.direct@yandex.ru` — письма нет (включая спам).

**Проверено автоматически:**

| Email | recovery_sent_at (UTC) | email_confirmed | deleted_at |
|---|---|---|---|
| `v.chudinov.direct@yandex.ru` | `2026-09-08T07:18:53` | да | null |
| `vova1992_92@mail.ru` | `2026-09-08T07:18:57` | да | null |

`POST /auth/v1/recover` → **HTTP 200** для обоих.

**Вывод: ветка B+** — SMTP Timeweb работает (swaks plain text → Yandex **мгновенно**, не спам). GoTrue recovery (HTML) **не доходит** — вероятно фильтр Yandex/Mail.ru на HTML-письма «сброс пароля» с длинной ссылкой, либо устаревший шаблон на VPS.

**Swaks plain (2026-09-08 ~07:20 UTC):** `250 OK`, письмо на Yandex пришло в 10:20 МСК во входящие.

**UI recovery после swaks:** по-прежнему не приходит → проблема в **формате/шаблоне GoTrue**, не в SMTP.

**Действия:**

1. HTML swaks-тест (отличить фильтр HTML от бага GoTrue):
   ```bash
   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
   bash scripts/vps/run-swaks-html-recovery-remote.sh v.chudinov.direct@yandex.ru
   ```
2. Задеплоить упрощённый `recovery.html` (OTP первым, без дублирующей ссылки) + recreate auth:
   ```bash
   bash scripts/vps/run-deploy-recovery-template-remote.sh
   ```
3. **Один** recovery через UI, подождать 10 мин.
4. Обход без почты: `generate_link` (см. ниже).

**Дальше:**

1. Один swaks-тест с Mac:
   ```bash
   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
   bash scripts/vps/run-recovery-diagnose-remote.sh v.chudinov.direct@yandex.ru
   ```
2. Запросить у Timeweb журнал отправки: `noreply@zeip.ru` → получатель + время.
3. Обход для пользователя — `generate_link` (см. ниже).
4. Yandex Postmaster + Google Postmaster Tools для домена.

**Скрипты диагностики (Mac):**

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
bash scripts/vps/check-recovery-users.sh v.chudinov.direct@yandex.ru vova1992_92@mail.ru
bash scripts/vps/trigger-recover-test.sh EMAIL
bash scripts/vps/run-recovery-diagnose-remote.sh EMAIL
```

---

## Статус (2026-09-08, Email Fix Plan — транзакционные)

### Шаг 1 — откат DMARC (Timeweb, вручную)

1. Timeweb → Домены → `zeip.ru` → DNS-записи
2. Найти TXT `_dmarc.zeip.ru`
3. Заменить значение на:
   ```
   v=DMARC1; p=none; rua=mailto:dmarc@zeip.ru
   ```
4. Сохранить, подождать 5–15 мин (TTL)

Через 2–4 недели стабильной доставки вернуть `p=quarantine`.

### Шаги 2–4 — на VPS

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
git pull --ff-only
bash scripts/vps/run-email-fix-plan-on-vps.sh
```

С Mac (inline, без git pull на сервере):

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
bash scripts/vps/run-email-fix-plan-remote.sh --inline
```

Скрипт: копирует SMTP из `supabase-stack/.env` → `.env.app`, подтягивает `INTERNAL_PUSH_SECRET` из `app_config`, делает `force-recreate app-web`, проверяет `POST /api/email/new-message`.

---

## Симптом

Через UI «Забыли пароль?» на https://zeip.ru/auth и signup **не приходят** письма confirm/recovery:

- `@yandex.ru` — не во входящих, спаме, промо
- `@gmail.com` — тоже не приходят (сентябрь 2026)

GoTrue отвечает **200** на `/recover` и `/signup`, выставляет `recovery_sent_at` / `confirmation_sent_at`. UI показывает «письмо отправлено».

**Не путать:** `POST /auth/v1/admin/generate_link` **не отправляет** письмо — только JSON со ссылкой и OTP.

## Цепочка

```
/auth (forgot) → GoTrue /recover → http://templates-server/recovery.html → smtp.timeweb.ru → Gmail/Yandex
```

Проблема в инфраструктуре **GoTrue + templates-server + SMTP**, не в фильтрах одного провайдера.

## Вероятные причины

1. **templates-server** не поднят или auth не достаёт шаблон (деплoy `deploy-email-templates.sh` с VPS не сработал — скрипт рассчитан на Mac → SSH).
2. **SMTP Timeweb** — неверный пароль, порт 465 vs 587, блокировка исходящей почты; **GOTRUE_SMTP_*** не заданы (только `SMTP_*` в `.env`).
3. **Gmail / Спам** — SMTP принимает (`250 OK`), письмо **доходит**, но Gmail кладёт во **«Спам»** (репутация `noreply@zeip.ru`, серия тестов swaks, DMARC `p=none`). Подтверждено: swaks на `chudinov92@gmail.com` пришёл в Спам (2026-09-07).
4. **Транзакционные email (new-message, city-growth, paywall-reminder, pioneer-expiry)** — две отдельные проблемы:
   - **hairpin NAT** — pg_net не достаёт `https://zeip.ru` (исправлено миграцией `2026-09-07-email-internal-urls.sql`, URL → `http://172.17.0.1:3001/api/email/...`).
   - **SMTP_* отсутствуют в `/root/zeip/my-app/deploy/timeweb/.env.app`** — Nodemailer в Next.js читает только этот файл; GoTrue использует `/root/zeip/supabase-stack/.env`. Без `SMTP_HOST/USER/PASS` cron тихо пропускал письма (`skipped`). Исправление: `bash scripts/vps/sync-smtp-to-env-app.sh --recreate` (вызывается из `deploy-app.sh` и `fix-auth-email-on-vps.sh`). Эндпоинты `/api/email/*` при отсутствии SMTP возвращают **503**.

DNS `zeip.ru`: SPF (`include:_spf.timeweb.ru ~all`), DKIM (`dkim._domainkey.zeip.ru`), DMARC `p=none`. Проверка: `bash my-app/scripts/check-email-dns.sh`.

## Диагностика

### На VPS

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
git pull --ff-only
bash scripts/vps/diagnose-auth-email.sh test@gmail.com
```

### С Mac (одна SSH-сессия, auth + deploy + hairpin SQL)

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
bash scripts/vps/run-email-fix-and-deploy-remote.sh
# или с паролем:
# VPS_SSH_PASSWORD='***' bash scripts/vps/run-email-fix-and-deploy-remote.sh
bash scripts/vps/trigger-recover-test.sh YOUR@gmail.com
```

### Проверка templates из auth-контейнера

```bash
cd /root/zeip/supabase-stack
docker exec supabase-auth wget -qO- --timeout=5 http://templates-server/recovery.html | head -5
```

Если FAIL → см. исправление ниже.

### Транзакционные письма (new-message, city-growth)

```bash
ssh root@186.246.2.104
grep -E '^SMTP_' /root/zeip/my-app/deploy/timeweb/.env.app | sed 's/PASS=.*/PASS=***/'
docker exec app-web printenv | grep -E '^SMTP_' | sed 's/PASS=.*/PASS=***/'

# sync + recreate без rebuild:
bash /root/zeip/my-app/scripts/vps/sync-smtp-to-env-app.sh --recreate
```

С Mac (до git pull, inline):

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
VPS_SSH_PASSWORD='***' bash scripts/vps/run-sync-smtp-remote.sh --inline
```

После деплоя с новым кодом эндпоинты `/api/email/*` без SMTP вернут **503** (видно в `net._http_response`).

## Исправление на VPS

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
git pull --ff-only
bash scripts/vps/fix-auth-email-on-vps.sh
bash scripts/vps/diagnose-auth-email.sh test@gmail.com
```

Если swaks timeout на 465:

```bash
bash scripts/vps/fix-auth-email-on-vps.sh --smtp-587
```

С Mac:

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
bash scripts/vps/run-fix-auth-email-remote.sh
```

После смены пароля ящика в Timeweb — обновить `SMTP_PASS` / `GOTRUE_SMTP_PASS` в `/root/zeip/supabase-stack/.env`, затем `fix-auth-email-on-vps.sh`.

## Обход без SMTP

### Сброс пароля

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
SRK=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2- | tr -d '"')
curl -sS -X POST "https://supabase.zeip.ru/auth/v1/admin/generate_link" \
  -H "apikey: $SRK" -H "Authorization: Bearer $SRK" \
  -H "Content-Type: application/json" \
  -d '{"type":"recovery","email":"USER@example.com","redirect_to":"https://zeip.ru/auth/reset-password"}'
```

Открыть: `https://zeip.ru/auth/reset-password?token_hash=<hashed_token>&type=recovery` или ввести `email_otp`.

### Подтверждение регистрации

Admin API или SQL — см. [password-recovery-email.md](../features/password-recovery-email.md).

## Критерии «починено»

- [x] `wget http://templates-server/recovery.html` из `supabase-auth` — HTTP 200
- [x] swaks → `250 OK`
- [x] **mail-tester.com → 10/10** (SPF pass, DKIM pass, DMARC pass, не в блэклистах) — 2026-09-07
- [x] SPF добавлен на корневой `zeip.ru` — `v=spf1 include:_spf.timeweb.ru ~all`
- [x] Пароль SMTP обновлён, auth пересоздан
- [x] DMARC обновлён `p=none` → `p=quarantine` (2026-09-07)
- [x] **DMARC откат `p=quarantine` → `p=none`** — выполнен (2026-09-08)
- [x] **HELO `mail.zeip.ru`** — A + PTR, `set-mail-helo-hostname.sh`, mail-tester 10/10 (2026-09-10)
- [ ] **DMARC `p=none` → `p=quarantine`** — не раньше 2026-09-24 → [email-dmarc-and-vps-migration.md](../../tasks/email-dmarc-and-vps-migration.md)
- [x] `GOTRUE_MAILER_EXTERNAL_HOSTS=supabase.zeip.ru` добавлен в docker-compose.yml
- [x] **SMTP_* синхронизируются в `.env.app`** — `scripts/vps/sync-smtp-to-env-app.sh` (+ `--recreate`)
- [x] **Recovery на @mail.ru** — OTP во входящие (2026-09-10)
- [ ] **Recovery на @yandex.ru** — spot-check при необходимости
- [ ] Google Postmaster Tools верифицировать `zeip.ru` (через Search Console)
- [ ] В логах auth нет ошибок mail/smtp/template после `/recover`

## Gmail: письмо в Спам (не «не приходит»)

Если swaks/recovery **есть в Спам** — SMTP и GoTrue работают. Действия:

1. Gmail → Спам → письмо от `noreply@zeip.ru` → **«Не спам»** / «Report not spam».
2. Добавить `noreply@zeip.ru` в контакты Google.
3. Зарегистрировать домен в [Google Postmaster Tools](https://postmaster.google.com/) (`zeip.ru`).
4. Панель Timeweb → почта `noreply@zeip.ru` → **DKIM включён**, TXT `dkim._domainkey.zeip.ru` в DNS.
5. Не гонять лишние swaks-тесты на личный ящик (учат фильтр помечать отправителя).
6. Проверка DNS: `cd my-app && bash scripts/check-email-dns.sh`

Recovery через UI ищите в **Спам** с темой «Сброс пароля — Zeip».

## Gmail: 250 OK, но письма нет нигде (даже в Спам)

Timeweb SMTP принял (`250 OK`), Gmail мог **отбросить молча** (не спам, а drop) после серии тестов swaks/recover.

1. Gmail → поиск: `from:noreply@zeip.ru` и «Вся почта» (All Mail) — не только Входящие/Спам.
2. Подождать 10–30 мин (иногда задержка релея Timeweb → Google).
3. Отправить **одно** письмо через UI «Забыли пароль?», не swaks, подождать 15 мин.
4. [mail-tester.com](https://www.mail-tester.com/) — swaks на выданный адрес, цель ≥ 9/10; смотреть SPF/DKIM/DMARC в отчёте.
5. Timeweb → Почта → журнал отправки ящика `noreply@zeip.ru` — статус доставки на gmail.com.
6. **Сменить пароль** ящика и `SMTP_PASS`/`GOTRUE_SMTP_PASS` на VPS — пароль SMTP светился в логах терминала (base64 в swaks).

## Связанные документы

- [password-recovery-email.md](../features/password-recovery-email.md)
- [auth.md](../screens/auth.md)
- Скрипты: `my-app/scripts/vps/diagnose-auth-email.sh`, `fix-auth-email-on-vps.sh`

## История

- 2026-09-07: изначально казалось проблемой только Яндекса; после теста Gmail через UI — общая проблема SMTP/infra.
- 2026-09-07 (вечер): после `fix-auth-email-on-vps` + deploy — swaks `250 OK`, templates OK.
- 2026-09-07 (ночь): найдена реальная причина — **SPF-запись отсутствовала на корневом `zeip.ru`** (была только на `supabase.zeip.ru` и `test.zeip.ru`). Добавлен SPF, пароль SMTP обновлён (старый засветился в логах), auth пересоздан. **mail-tester.com → 10/10**: SPF pass, DKIM pass, DMARC pass, не в блэклистах. DMARC обновлён до `p=quarantine`. `GOTRUE_MAILER_EXTERNAL_HOSTS` добавлен в docker-compose.yml.
- 2026-09-08 (recovery): диагностика mail.ru + yandex.ru — `recovery_sent_at` обновляется, `/recover` HTTP 200, письма не доходят. Ветка B: доставка после Timeweb. Скрипты: `check-recovery-users.sh`, `run-recovery-diagnose-remote.sh` (inline self-contained).
- 2026-09-08 (OTP-only): шаблоны recovery/confirm без ссылок, UI на код, `OTP_EXP=600`. Деплой: `run-deploy-recovery-template-remote.sh` + `fix-auth-email-on-vps.sh`.
- 2026-09-10: Timeweb подтвердил Spamhaus HELO `twc1.net` → smtp-spam → reject mail.ru. Скрипты: `verify-mail-helo-dns.sh`, `set-mail-helo-hostname.sh`, `patch-compose-auth-helo.sh`; Nodemailer `name: mail.zeip.ru`; `--ehlo` в swaks.
- 2026-09-10 (вечер): mail-tester 10/10, recovery @mail.ru inbox — **закрыто**. Задачи: [email-dmarc-and-vps-migration.md](../../tasks/email-dmarc-and-vps-migration.md) (DMARC 24.09, чеклист VPS).
