-- Ручная активация Pro после оплаты Robokassa (инцидент 2026-09-17).
-- auth.users.id: 827ce259-1869-414c-8ce0-2911a3206022
-- inv_id: 965579733
--
-- Требует предварительного наката 2026-09-16-apply-robokassa-payment.sql
--
-- Supabase SQL Editor (https://supabase.zeip.ru): вставить файл целиком и Run.
--
-- VPS:
--   cd /Users/vladimirchudinov/Desktop/my-startup/my-app
--   ssh root@186.246.2.104
--   cd /root/zeip/my-app
--   git pull
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/2026-09-16-apply-robokassa-payment.sql
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/2026-09-17-activate-payment-965579733.sql

-- =============================================================================
-- 1. DIAGNOSE (до активации)
-- =============================================================================

select proname
from pg_proc
where proname = 'apply_robokassa_payment';

select p.id as profile_id, p.auth_user_id, p.full_name,
       p.subscription_plan, p.is_pro, p.pro_expires_at, u.email
from public.profiles p
left join auth.users u on u.id = p.auth_user_id
where p.auth_user_id = '827ce259-1869-414c-8ce0-2911a3206022'::uuid
   or p.id = '827ce259-1869-414c-8ce0-2911a3206022'::uuid;

select inv_id, profile_id, plan, period, out_sum, status, created_at, paid_at
from public.subscription_payments
where inv_id = 965579733;

-- =============================================================================
-- 2. ENSURE PAYMENT ROW (если webhook не успел записать pending)
-- =============================================================================

do $$
declare
  v_profile_id uuid;
  v_auth_user_id uuid := '827ce259-1869-414c-8ce0-2911a3206022'::uuid;
  v_inv_id bigint := 965579733;
begin
  select p.id into v_profile_id
  from public.profiles p
  where p.auth_user_id = v_auth_user_id
     or p.id = v_auth_user_id
  limit 1;

  if v_profile_id is null then
    raise exception 'profile not found for auth_user_id %', v_auth_user_id;
  end if;

  if not exists (
    select 1 from public.subscription_payments where inv_id = v_inv_id
  ) then
    insert into public.subscription_payments (
      inv_id, profile_id, out_sum, plan, period, status
    ) values (
      v_inv_id, v_profile_id, 249.00, 'pro_monthly', 'monthly', 'pending'
    );
    raise notice 'inserted pending payment inv_id=% profile_id=%', v_inv_id, v_profile_id;
  else
    raise notice 'payment inv_id=% already exists', v_inv_id;
  end if;
end $$;

-- =============================================================================
-- 3. ACTIVATE via RPC (идемпотентно)
-- =============================================================================

select * from public.apply_robokassa_payment(965579733, now());

-- =============================================================================
-- 4. VERIFY
-- =============================================================================

select p.id as profile_id, p.auth_user_id, p.full_name,
       p.subscription_plan, p.is_pro, p.pro_expires_at, u.email
from public.profiles p
left join auth.users u on u.id = p.auth_user_id
where p.auth_user_id = '827ce259-1869-414c-8ce0-2911a3206022'::uuid
   or p.id = '827ce259-1869-414c-8ce0-2911a3206022'::uuid;

select inv_id, profile_id, plan, period, out_sum, status, paid_at, is_renewal
from public.subscription_payments
where inv_id = 965579733;
