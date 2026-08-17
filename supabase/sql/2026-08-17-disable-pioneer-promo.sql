-- Kill switch акции «первые 50 в городе».
-- claim_pioneer_slot всегда false → квиз не выдаёт Pro, можно тестировать оплату.
--
-- Self-hosted Timeweb:
--   ssh root@186.246.2.104
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/2026-08-17-disable-pioneer-promo.sql
--
-- Включить снова: в функции выставить v_promo_enabled := true
-- и NEXT_PUBLIC_PIONEER_PROMO_ENABLED=true + пересборка app-web.

create or replace function public.claim_pioneer_slot(p_city text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promo_enabled constant boolean := false;
  v_profile_id uuid;
  v_created_at timestamptz;
  v_claimed boolean := false;
  v_launch_cutoff constant timestamptz := timestamptz '2026-08-13 00:00:00+00';
begin
  if not v_promo_enabled then
    return false;
  end if;

  select id, created_at
  into v_profile_id, v_created_at
  from public.profiles
  where auth_user_id = auth.uid()
  limit 1;

  if v_profile_id is null then
    return false;
  end if;

  if v_created_at < v_launch_cutoff then
    return false;
  end if;

  if exists (
    select 1 from public.profiles
    where id = v_profile_id and is_city_pioneer = true
  ) then
    return false;
  end if;

  insert into public.city_pioneer_slots (city, used_count, max_count)
  values (p_city, 0, 50)
  on conflict (city) do nothing;

  update public.city_pioneer_slots
  set used_count = used_count + 1
  where city = p_city and used_count < max_count
  returning true into v_claimed;

  if v_claimed then
    update public.profiles
    set
      is_city_pioneer = true,
      is_pro = true,
      pro_expires_at = now() + interval '90 days'
    where id = v_profile_id;
  end if;

  return coalesce(v_claimed, false);
end;
$$;

revoke all on function public.claim_pioneer_slot(text) from public;
grant execute on function public.claim_pioneer_slot(text) to authenticated;

select proname
from pg_proc
where proname = 'claim_pioneer_slot';
