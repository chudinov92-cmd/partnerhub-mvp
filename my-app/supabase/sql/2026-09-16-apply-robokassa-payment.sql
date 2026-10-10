-- Идемпотентная активация оплаты Robokassa: profiles + subscription_payments в одной транзакции.
-- Self-hosted Timeweb:
--   cd /root/zeip/my-app
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < supabase/sql/2026-09-16-apply-robokassa-payment.sql

create or replace function public.apply_robokassa_payment(
  p_inv_id bigint,
  p_paid_at timestamptz default now()
)
returns table (
  result text,
  profile_id uuid,
  plan text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.subscription_payments%rowtype;
  v_plan text;
  v_subscription_plan text;
  v_period text;
  v_days int;
  v_prior_paid int;
  v_is_upgrade boolean;
  v_paid_at timestamptz;
  v_profile public.profiles%rowtype;
  v_needs_repair boolean;
begin
  v_paid_at := coalesce(p_paid_at, now());

  select * into v_payment
  from public.subscription_payments
  where inv_id = p_inv_id
  for update;

  if not found then
    result := 'not_found';
    profile_id := null;
    plan := null;
    return next;
    return;
  end if;

  profile_id := v_payment.profile_id;
  plan := v_payment.plan;
  v_plan := coalesce(v_payment.plan, 'pro_monthly');
  v_is_upgrade := v_plan = 'upgrade_pro_to_pro_plus';

  select * into v_profile
  from public.profiles
  where id = v_payment.profile_id;

  if not found then
    result := 'not_found';
    return next;
    return;
  end if;

  -- Уже оплачен: догоняем профиль при необходимости.
  if v_payment.status = 'paid' then
    v_needs_repair := false;

    if v_is_upgrade then
      if v_profile.subscription_plan is distinct from 'pro_plus'
         or v_profile.is_pro is not true then
        v_needs_repair := true;
        update public.profiles
        set subscription_plan = 'pro_plus', is_pro = true
        where id = v_payment.profile_id;
      end if;
    else
      if v_profile.is_pro is not true then
        v_needs_repair := true;
        -- Маппинг plan id как parsePaymentPlanId в subscriptionPlans.ts
        case v_plan
          when 'pro_yearly' then
            v_subscription_plan := 'pro';
            v_period := 'yearly';
            v_days := 365;
          when 'pro_plus_monthly' then
            v_subscription_plan := 'pro_plus';
            v_period := 'monthly';
            v_days := 30;
          when 'pro_plus_yearly' then
            v_subscription_plan := 'pro_plus';
            v_period := 'yearly';
            v_days := 365;
          when 'pro', 'pro_monthly' then
            v_subscription_plan := 'pro';
            v_period := 'monthly';
            v_days := 30;
          else
            result := 'unknown_plan';
            return next;
            return;
        end case;

        update public.profiles
        set
          subscription_plan = v_subscription_plan,
          is_pro = true,
          pro_expires_at = coalesce(v_payment.paid_at, v_paid_at)
            + (v_days || ' days')::interval
        where id = v_payment.profile_id;
      end if;
    end if;

    if v_needs_repair then
      result := 'repaired';
    else
      result := 'already_paid';
    end if;
    return next;
    return;
  end if;

  -- Pending: сначала профиль, потом paid.
  if v_is_upgrade then
    update public.profiles
    set subscription_plan = 'pro_plus', is_pro = true
    where id = v_payment.profile_id;

    v_period := coalesce(v_payment.period, 'monthly');
  else
    case v_plan
      when 'pro_yearly' then
        v_subscription_plan := 'pro';
        v_period := 'yearly';
        v_days := 365;
      when 'pro_plus_monthly' then
        v_subscription_plan := 'pro_plus';
        v_period := 'monthly';
        v_days := 30;
      when 'pro_plus_yearly' then
        v_subscription_plan := 'pro_plus';
        v_period := 'yearly';
        v_days := 365;
      when 'pro', 'pro_monthly' then
        v_subscription_plan := 'pro';
        v_period := 'monthly';
        v_days := 30;
      else
        result := 'unknown_plan';
        return next;
        return;
    end case;

    update public.profiles
    set
      subscription_plan = v_subscription_plan,
      is_pro = true,
      pro_expires_at = v_paid_at + (v_days || ' days')::interval
    where id = v_payment.profile_id;
  end if;

  select count(*) into v_prior_paid
  from public.subscription_payments sp
  where sp.profile_id = v_payment.profile_id
    and sp.status = 'paid'
    and sp.id <> v_payment.id;

  update public.subscription_payments sp
  set
    status = 'paid',
    paid_at = v_paid_at,
    period = coalesce(v_period, sp.period, 'monthly'),
    is_renewal = v_prior_paid > 0
  where sp.id = v_payment.id;

  result := 'applied';
  return next;
end;
$$;

revoke all on function public.apply_robokassa_payment(bigint, timestamptz) from public;
grant execute on function public.apply_robokassa_payment(bigint, timestamptz) to service_role;

comment on function public.apply_robokassa_payment is
  'Robokassa Result URL: активирует подписку и помечает платёж paid в одной транзакции; повтор webhook догоняет профиль.';

notify pgrst, 'reload schema';
