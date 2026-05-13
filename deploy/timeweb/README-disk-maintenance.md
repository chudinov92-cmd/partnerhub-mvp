# Обслуживание диска на VPS (Timeweb)

На Mac сам проект ~900 МБ; на сервере десятки ГБ часто заняты **Docker** (старые образы, build cache), **бэкапами** без ротации и **логами** контейнеров/systemd.

Скрипт: [`scripts/migration/timeweb_disk_maintenance.sh`](../../scripts/migration/timeweb_disk_maintenance.sh).

## С Mac (SSH одной строкой)

Папка на вашей машине:

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app
```

Подставьте хост пользователя (`root@IP`). Примеры:

```bash
# Только диагностика (безопасно)
ssh root@YOUR_IP 'bash -s' < scripts/migration/timeweb_disk_maintenance.sh diagnose

# Очистка Docker (пересборка образов при следующем deploy займёт дольше)
ssh root@YOUR_IP 'bash -s' < scripts/migration/timeweb_disk_maintenance.sh docker-prune

# Оставить 7 последних дампов ежедневных бэкапов Supabase
ssh root@YOUR_IP 'bash -s' < scripts/migration/timeweb_disk_maintenance.sh rotate-backups "/root/zeip/backups/daily" 7

# Очистка apt + ограничение journald (~100 MiB)
ssh root@YOUR_IP 'bash -s' < scripts/migration/timeweb_disk_maintenance.sh system-cleanup

# Вывести JSON для ограничения логов Docker (применить вручную на сервере)
ssh root@YOUR_IP 'bash -s' < scripts/migration/timeweb_disk_maintenance.sh print-log-limits-json
```

## На сервере напрямую

```bash
cd /root/zeip/my-app
chmod +x scripts/migration/timeweb_disk_maintenance.sh
./scripts/migration/timeweb_disk_maintenance.sh diagnose
```

## Лимиты логов Docker

Фрагмент для слияния с `/etc/docker/daemon.json`:  
[`docker-daemon-log-limits.fragment.json`](./docker-daemon-log-limits.fragment.json).

После изменения конфигурации: `systemctl restart docker`, затем пересоздайте сервисы `docker compose` (см. вывод команды `print-log-limits-json`).

## Ротация бэкапов

Ежедневный cron вызывает `backup_self_hosted_supabase.sh` — после каждого успешного дампа выполняется ротация только файлов **`supabase_*.dump`** в том же каталоге: сохраняется не больше **`KEEP_BACKUPS`** самых новых (по умолчанию **14**). Чтобы задать другое число без правки файла:

```cron
30 3 * * * env KEEP_BACKUPS=7 "/root/zeip/my-app/scripts/migration/backup_self_hosted_supabase.sh" "/root/zeip/supabase-stack" "/root/zeip/backups/daily" >> "/root/zeip/backups/daily/backup.log" 2>&1
```

(Если ваш `cron` без `env` в PATH — замените на полный путь к `env`.)

Ручная подгонка **всех** `*.dump` в каталоге (например после ручных `backup_postgres.sh`): команда `rotate-backups` в `timeweb_disk_maintenance.sh`.
