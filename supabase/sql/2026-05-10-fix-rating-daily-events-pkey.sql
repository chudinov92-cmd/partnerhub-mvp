-- Исправление: duplicate key value violates unique constraint "rating_daily_events_pkey"
--
-- 1) После pg_restore/импорта последовательность id может отставать от MAX(id) — следующий INSERT
--    получает уже занятый id → duplicate on pkey.
-- 2) award_daily() использовала "if found" после INSERT ... ON CONFLICT DO NOTHING — в PG это ненадёжно
--    для определения «строка вставлена». Заменено на RETURNING id.
--
-- Выполнить в Supabase SQL Editor.

-- Синхронизация bigserial с MAX(id); пустая таблица → первый id останется 1
do $$
declare
  mx bigint;
  seq text;
begin
  seq := pg_get_serial_sequence('public.rating_daily_events', 'id');
  select coalesce(max(id), 0) into mx from public.rating_daily_events;
  if mx = 0 then
    perform setval(seq, 1, false);
  else
    perform setval(seq, mx, true);
  end if;
end $$;

create or replace function public.award_daily(p_profile_id uuid, p_event_type text, p_ts timestamptz)
returns void
language plpgsql
as $$
declare
  d date;
  new_id bigint;
begin
  d := public.day_msk(p_ts);

  insert into public.rating_daily_events(profile_id, event_type, day_msk)
  values (p_profile_id, p_event_type, d)
  on conflict (profile_id, event_type, day_msk) do nothing
  returning id into new_id;

  if new_id is not null then
    update public.profiles
      set rating_count = coalesce(rating_count, 0) + 1
    where id = p_profile_id;
  end if;
end;
$$;

notify pgrst, 'reload schema';
