# Email: DMARC quarantine + миграция VPS (HELO mail.zeip.ru)

Связано: [auth-email-delivery.md](../devel/issues/auth-email-delivery.md) (HELO-fix **решён** 2026-09-10, mail-tester 10/10, recovery @mail.ru во входящие).

---

## Напоминание: DMARC p=quarantine

**Старт мягкой политики:** 2026-09-08 (`p=none`).  
**Напомнить:** **2026-09-24** (через 2 недели после HELO-fix).  
**Cursor Goal:** создан 2026-09-10 — напоминание 24.09.2026.

### Когда менять

- [ ] Прошло **≥ 2 недели** стабильной доставки auth + транзакционных писем
- [ ] Нет reject/smtp-spam в логах Timeweb
- [ ] Spot-check: recovery на @mail.ru, @yandex.ru, @gmail.com — inbox (не reject)

### Как изменить (Timeweb)

1. **Домены → zeip.ru → DNS**
2. TXT `_dmarc.zeip.ru` заменить на:
   ```
   v=DMARC1; p=quarantine; rua=mailto:dmarc@zeip.ru
   ```
3. Подождать TTL (5–15 мин)
4. Проверка:
   ```bash
   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
   bash scripts/check-email-dns.sh
   dig +short TXT _dmarc.zeip.ru
   ```

### Откат при проблемах

Вернуть `p=none`:
```
v=DMARC1; p=none; rua=mailto:dmarc@zeip.ru
```

---

## При смене VPS / нового IP (миграция на сервер побольше)

**Критично для доставки:** без A + PTR + hostname Timeweb снова может помечать письма спамом (HELO в Spamhaus).

### DNS (Timeweb, до деплоя приложения)

| Запись | Значение |
|--------|----------|
| A `mail.zeip.ru` | **новый IP** VPS |
| PTR нового IP | `mail.zeip.ru` |
| A `@` / `www` / `supabase` | по runbook домена |

**Не менять без необходимости:** SPF (`include:_spf.timeweb.ru`), DKIM, MX Timeweb.  
**Не добавлять** `ip4:НОВЫЙ_IP` в SPF, пока отправка через `smtp.timeweb.ru`.

### VPS после миграции

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
bash scripts/vps/verify-mail-helo-dns.sh   # A + PTR OK
bash scripts/vps/run-set-mail-helo-remote.sh   # hostname + auth/app-web HELO
```

Или на новом VPS вручную: [set-mail-helo-hostname.sh](../../my-app/scripts/vps/set-mail-helo-hostname.sh).

### Проверка после миграции

1. `bash scripts/vps/verify-mail-helo-dns.sh` — оба OK
2. Один mail-tester (≥ 9/10)
3. Один recovery через UI на @mail.ru
4. `POST /api/email/new-message` → HTTP 200

### Чеклист миграции VPS (кратко)

- [ ] Новый IP известен
- [ ] A `mail.zeip.ru` → новый IP
- [ ] PTR новый IP → `mail.zeip.ru`
- [ ] DNS apex/supabase по [timeweb-migration-runbook](../../my-app/docs/timeweb-migration-runbook.md)
- [ ] Деплой stack + app
- [ ] `run-set-mail-helo-remote.sh` на новом сервере
- [ ] mail-tester + один recovery test
- [ ] DMARC оставить `p=none` минимум 2 недели после миграции

---

## История

- 2026-09-10: HELO-fix на `186.246.2.104`, mail-tester 10/10, recovery Mail.ru OK. Задачи DMARC + VPS migration зафиксированы.
