-- Self-hosted Supabase: pg_net из контейнера supabase-db не достучится до https://zeip.ru
-- (hairpin/NAT). Dispatch для триггера messages → push через Docker bridge на app-web.
-- Публичный https://zeip.ru/api/push/dispatch остаётся для ручных проверок с хоста.

UPDATE public.app_config
SET value = 'http://172.17.0.1:3001/api/push/dispatch'
WHERE key = 'push_dispatch_url';
