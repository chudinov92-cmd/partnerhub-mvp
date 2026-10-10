-- Hairpin NAT fix: pg_net из supabase-db не достаёт https://zeip.ru — переключаем на Docker bridge.
-- Аналогично push_dispatch_url в 2026-08-11-push-dispatch-internal-url.sql.
-- Запуск: Supabase SQL Editor или psql на self-hosted Timeweb.

UPDATE public.app_config
SET value = 'http://172.17.0.1:3001/api/email/new-message'
WHERE key = 'email_new_message_url';

UPDATE public.app_config
SET value = 'http://172.17.0.1:3001/api/email/city-growth'
WHERE key = 'email_city_growth_url';

notify pgrst, 'reload schema';
