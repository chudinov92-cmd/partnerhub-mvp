-- Диагностика refresh-токенов пользователя (гонка ротации между вкладками).
-- Запуск: Supabase Studio → SQL Editor → вставить и выполнить целиком.

select
  rt.id,
  rt.token,
  rt.revoked,
  rt.created_at,
  rt.updated_at,
  rt.parent
from auth.refresh_tokens rt
join auth.users u on u.id = rt.user_id
where u.email = 'chudinov92@gmail.com'
order by rt.created_at desc
limit 20;

-- Много строк с revoked = true за короткий интервал → вероятна гонка refresh между вкладками.
-- Лечение на VPS: GOTRUE_SECURITY_REFRESH_TOKEN_REUSE_INTERVAL=10
