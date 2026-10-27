-- Push dispatch URL для zeip.ru (возврат с test.zeip.ru).
-- Запуск: SQL Editor https://supabase.zeip.ru или через migrate-to-prod-domain.sh

UPDATE public.app_config
SET value = 'https://zeip.ru/api/push/dispatch'
WHERE key = 'push_dispatch_url';
