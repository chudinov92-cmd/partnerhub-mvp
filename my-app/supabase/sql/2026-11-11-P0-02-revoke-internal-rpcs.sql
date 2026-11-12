-- =============================================================================
-- M2. Закрыть внутренние RPC от anon/authenticated.
-- Часть плана закрытия уязвимостей доступа Supabase (zeip.ru).
-- Все функции вызываются ТОЛЬКО с service_role.
-- Каждый блок идемпотентен: to_regprocedure → execute.
-- =============================================================================

do $$ begin

-- 1. admin_purge_account(uuid)
if to_regprocedure('public.admin_purge_account(uuid)') is not null then
  execute 'revoke all on function public.admin_purge_account(uuid) from public, anon, authenticated';
  execute 'grant execute on function public.admin_purge_account(uuid) to service_role';
end if;

-- 2. admin_lookup_account_for_purge(uuid)
if to_regprocedure('public.admin_lookup_account_for_purge(uuid)') is not null then
  execute 'revoke all on function public.admin_lookup_account_for_purge(uuid) from public, anon, authenticated';
  execute 'grant execute on function public.admin_lookup_account_for_purge(uuid) to service_role';
end if;

-- 3. admin_lookup_auth_user_id_by_email(text)
if to_regprocedure('public.admin_lookup_auth_user_id_by_email(text)') is not null then
  execute 'revoke all on function public.admin_lookup_auth_user_id_by_email(text) from public, anon, authenticated';
  execute 'grant execute on function public.admin_lookup_auth_user_id_by_email(text) to service_role';
end if;

-- 4. apply_robokassa_payment(bigint,timestamptz)
if to_regprocedure('public.apply_robokassa_payment(bigint,timestamptz)') is not null then
  execute 'revoke all on function public.apply_robokassa_payment(bigint,timestamptz) from public, anon, authenticated';
  execute 'grant execute on function public.apply_robokassa_payment(bigint,timestamptz) to service_role';
end if;

-- 5. get_profiles_for_message_email()
if to_regprocedure('public.get_profiles_for_message_email()') is not null then
  execute 'revoke all on function public.get_profiles_for_message_email() from public, anon, authenticated';
  execute 'grant execute on function public.get_profiles_for_message_email() to service_role';
end if;

-- 6. try_auth_login(text,text,boolean,boolean)
if to_regprocedure('public.try_auth_login(text,text,boolean,boolean)') is not null then
  execute 'revoke all on function public.try_auth_login(text,text,boolean,boolean) from public, anon, authenticated';
  execute 'grant execute on function public.try_auth_login(text,text,boolean,boolean) to service_role';
end if;

end $$;
-- 7. try_auth_otp_send(text,text,text,boolean)
if to_regprocedure('public.try_auth_otp_send(text,text,text,boolean)') is not null then
  execute 'revoke all on function public.try_auth_otp_send(text,text,text,boolean) from public, anon, authenticated';
  execute 'grant execute on function public.try_auth_otp_send(text,text,text,boolean) to service_role';
end if;

-- 8. get_revenue_metrics()
if to_regprocedure('public.get_revenue_metrics()') is not null then
  execute 'revoke all on function public.get_revenue_metrics() from public, anon, authenticated';
  execute 'grant execute on function public.get_revenue_metrics() to service_role';
end if;

-- 9. compute_mrr_snapshot(date)
if to_regprocedure('public.compute_mrr_snapshot(date)') is not null then
  execute 'revoke all on function public.compute_mrr_snapshot(date) from public, anon, authenticated';
  execute 'grant execute on function public.compute_mrr_snapshot(date) to service_role';
end if;

-- 10. get_paywall_funnel(timestamptz,timestamptz)
if to_regprocedure('public.get_paywall_funnel(timestamptz,timestamptz)') is not null then
  execute 'revoke all on function public.get_paywall_funnel(timestamptz,timestamptz) from public, anon, authenticated';
  execute 'grant execute on function public.get_paywall_funnel(timestamptz,timestamptz) to service_role';
end if;

-- 11. get_activity_kpis()
if to_regprocedure('public.get_activity_kpis()') is not null then
  execute 'revoke all on function public.get_activity_kpis() from public, anon, authenticated';
  execute 'grant execute on function public.get_activity_kpis() to service_role';
end if;

-- 12. get_profile_demand_matrix(text,text,integer,integer,boolean,timestamptz,timestamptz)
if to_regprocedure('public.get_profile_demand_matrix(text,text,integer,integer,boolean,timestamptz,timestamptz)') is not null then
  execute 'revoke all on function public.get_profile_demand_matrix(text,text,integer,integer,boolean,timestamptz,timestamptz) from public, anon, authenticated';
  execute 'grant execute on function public.get_profile_demand_matrix(text,text,integer,integer,boolean,timestamptz,timestamptz) to service_role';
end if;

-- 13. get_map_search_matrix(timestamptz,timestamptz,text,text,integer,integer,boolean,text)
if to_regprocedure('public.get_map_search_matrix(timestamptz,timestamptz,text,text,integer,integer,boolean,text)') is not null then
  execute 'revoke all on function public.get_map_search_matrix(timestamptz,timestamptz,text,text,integer,integer,boolean,text) from public, anon, authenticated';
  execute 'grant execute on function public.get_map_search_matrix(timestamptz,timestamptz,text,text,integer,integer,boolean,text) to service_role';
end if;

-- 14. get_city_growth_email_batches()
if to_regprocedure('public.get_city_growth_email_batches()') is not null then
  execute 'revoke all on function public.get_city_growth_email_batches() from public, anon, authenticated';
  execute 'grant execute on function public.get_city_growth_email_batches() to service_role';
end if;

-- 15. profile_has_paid_subscription(uuid)
if to_regprocedure('public.profile_has_paid_subscription(uuid)') is not null then
  execute 'revoke all on function public.profile_has_paid_subscription(uuid) from public, anon, authenticated';
  execute 'grant execute on function public.profile_has_paid_subscription(uuid) to service_role';
end if;

-- 16. prevent_banned_auth_signup() (уже закрыта, но на всякий случай)
if to_regprocedure('public.prevent_banned_auth_signup()') is not null then
  execute 'revoke all on function public.prevent_banned_auth_signup() from public, anon, authenticated';
end if;

end $$;

notify pgrst, 'reload schema';