-- Push dispatch URL для test.zeip.ru (после переезда с zeip.ru).
-- Запуск: SQL Editor https://supabase.zeip.ru или через migrate-to-test-domain.sh

UPDATE public.app_config
SET value = 'https://test.zeip.ru/api/push/dispatch'
WHERE key = 'push_dispatch_url';
