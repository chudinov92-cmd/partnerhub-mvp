# Очистка диска VPS Zeip (Timeweb)

**Дата:** 2026-05-30  
**Сервер:** `root@186.246.2.104` (80 ГБ, ~72% занято по панели на 2026-05-29)  
**Статус (2026-05-30, итог):** очистка успешна.

| Момент | Занятость `/` |
|--------|----------------|
| До (05:12) | **85–86%** (~66 GB из 77 GB) |
| После (05:13) | **21.2%** (~16 GB из 76 GB) |

**Освобождено ~50 GB**, в основном Docker build cache (многократные `docker build --no-cache` для `app-web`).

Выполнено: `docker system prune` (−2.82 GB), `docker image prune`, `docker builder prune` (завершился, несмотря на обрыв SSH).

Опционально на VPS: `system-cleanup`, `rotate-backups`, проверка `docker ps` / `https://zeip.ru`.

`diagnose` в репо ускорен; `docker-prune` пишет builder-prune в лог (меньше спама в SSH).

**Статус автоматического прогона агента:** SSH из среды Cursor **не выполнен** (`Permission denied (publickey,password)`). Ключ `~/.ssh/id_ed25519` (github-zeip) **не** в `authorized_keys` на VPS; пароль root в окружении агента отсутствует.

## Что сделано в репозитории

| Артефакт | Назначение |
|----------|------------|
| [`my-app/scripts/vps/zeip-disk-cleanup-plan.sh`](../../../my-app/scripts/vps/zeip-disk-cleanup-plan.sh) | Полный цикл: diagnose → docker-prune → system-cleanup → rotate-backups (автовыбор 7/14) → лимиты логов Docker → dedup `/root/zeip/app` |
| [`my-app/scripts/vps/run-zeip-disk-cleanup-remote.sh`](../../../my-app/scripts/vps/run-zeip-disk-cleanup-remote.sh) | Запуск с Mac через SSH (интерактивный пароль или `VPS_SSH_PASSWORD` + expect) |
| [`my-app/scripts/vps/ssh-with-password.expect`](../../../my-app/scripts/vps/ssh-with-password.expect) | Expect-обёртка для неинтерактивного SSH |
| [`my-app/deploy/timeweb/README-disk-maintenance.md`](../../../my-app/deploy/timeweb/README-disk-maintenance.md) | Обновлена ссылка на полный план |

## Запуск очистки (обязательно с вашего Mac, где SSH уже работает)

**Папка:**

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
```

**Вариант A — интерактивный пароль (как при `deploy-app.sh`):**

```bash
bash scripts/vps/run-zeip-disk-cleanup-remote.sh
```

**Вариант B — пароль в env (не коммитить):**

```bash
VPS_SSH_PASSWORD='ВАШ_ПАРОЛЬ_ROOT' bash scripts/vps/run-zeip-disk-cleanup-remote.sh
```

**Вариант C — уже на сервере:**

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
git pull
bash scripts/vps/zeip-disk-cleanup-plan.sh
```

Лог на сервере: `/root/zeip/backups/daily/disk-cleanup-YYYY-MM-DD_HH-MM-SS.log`

После прогона пришлите в чат строки `BEFORE:` / `AFTER:` из лога — дополним этот отчёт фактическими цифрами.

## Анализ без live-diagnose (по архитектуре проекта)

| Источник | Почему раздувает диск | Действие в плане |
|----------|----------------------|------------------|
| Docker **Images + Build Cache** | [`deploy-app.sh`](../../../my-app/deploy/timeweb/deploy-app.sh) каждый раз `build --no-cache`; в логе деплоя 2026-05-29 скачиваются **Playwright Chromium ~175 MiB** и ffmpeg внутри образа `app-web` | `docker-prune` (без `--volumes`) |
| Ежедневные дампы | `backup_self_hosted_supabase.sh`, по умолчанию **KEEP_BACKUPS=14** в `/root/zeip/backups/daily` | `rotate-backups` (скрипт оставит 7, если >14 файлов или суммарно >~5 ГБ) |
| Логи контейнеров | Kong/Auth/Analytics без `daemon.json` limits | Фрагмент [`docker-daemon-log-limits.fragment.json`](../../../my-app/deploy/timeweb/docker-daemon-log-limits.fragment.json) + restart docker |
| Дубликат кода | Runbook §5: `/root/zeip/app` vs актуальный `/root/zeip/my-app` | Удаление `app`, если >50 MiB и cron не ссылается |
| Postgres volume | Данные продакшена | **Не** `docker volume prune` |

**Ожидаемый эффект после прогона:** освобождение порядка **5–25 ГБ** (prune) + **0–15 ГБ** (бэкапы) + профилактика логов.

## Подключение к VPS

```bash
ssh root@186.246.2.104
```

### Автоматизация SSH для агента (опционально)

На сервере (консоль Timeweb или SSH с паролем):

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHWOaZf1yIeD9A8HxyRdNKrSofQoHAlLxtj+4Gm8Pl6H github-zeip' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

После этого с Mac должен работать `ssh -i ~/.ssh/id_ed25519 root@186.246.2.104` без пароля.

## Проверка после очистки

```bash
ssh root@186.246.2.104 'df -h /; docker system df; ls -lhS /root/zeip/backups/daily/*.dump 2>/dev/null | head -10'
curl -sI https://zeip.ru/ | head -3
curl -sI https://supabase.zeip.ru/ | head -3
```

## Мониторинг

- **> 75%** диска: `timeweb_disk_maintenance.sh diagnose`
- **> 85%**: `docker-prune` + уменьшить `KEEP_BACKUPS` в cron (см. README-disk-maintenance)
- Раз в месяц: полный `zeip-disk-cleanup-plan.sh`

## Supabase SQL

На этом этапе **не требуется** (очистка инфраструктуры, не схема БД).
