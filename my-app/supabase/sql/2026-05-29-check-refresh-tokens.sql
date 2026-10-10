-- Диагностика refresh-токенов пользователя (гонка ротации между вкладками).
-- Запуск: Supabase Studio → SQL Editor → вставить и выполнить целиком.

select
  rt.id,
  rt.revoked,
  rt.created_at,
  rt.updated_at,
  rt.parent
from auth.refresh_tokens rt
join auth.users u on u.id = rt.user_id::uuid
where u.email = 'chudinov92@gmail.com'
order by rt.created_at desc
limit 20;

-- auth.refresh_tokens.user_id хранится как text/varchar — нужен cast к uuid.
-- Много строк с revoked = true за короткий интервал → гонка refresh между вкладками.
-- Лечение на VPS: REFRESH_TOKEN_REUSE_INTERVAL=10 (см. scripts/vps/fix-gotrue-refresh.sh)
