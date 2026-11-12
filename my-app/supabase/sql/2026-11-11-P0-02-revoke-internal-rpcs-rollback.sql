-- =============================================================================
-- M2-ROLLBACK. Вернуть публичный доступ к функциям (только для отладки!).
-- **ВНИМАНИЕ:** этот скрипт ВОЗВРАЩАЕТ уязвимости P0.
-- Применять ТОЛЬКО на тестовом стенде или при аварийном откате
-- вместе с `git revert` коммита M2 и последующим деплоем.
-- =============================================================================

do $$ begin

if to_regprocedure('public.admin_purge_account(uuid)') is not null then
  execute 'grant execute on function public.admin_purge_account(uuid) to public';
end if;

if to_regprocedure('public.admin_lookup_account_for_purge(uuid)') is not null then
  execute 'grant execute on function public.admin_lookup_account_for_purge(uuid) to public';
end if;

if to_regprocedure('public.admin_lookup_auth_user_id_by_email(text)') is not null then
  execute 'grant execute on function public.admin_lookup_auth_user_id_by_email(text) to public';
end if;

if to_regprocedure('public.apply_robokassa_payment(bigint,timestamptz)') is not null then
  execute 'grant execute on function public.apply_robokassa_payment(bigint,timestamptz) to public';
end if;

if to_regprocedure('public.get_profiles_for_message_email()') is not null then
  execute 'grant execute on function public.get_profiles_for_message_email() to public';
end if;

if to_regprocedure('public.try_auth_login(text,text,boolean,boolean)') is not null then
  execute 'grant execute on function public.try_auth_login(text,text,boolean,boolean) to public';
end if;

if to_regprocedure('public.try_auth_otp_send(text,text,text,boolean)') is not null then
  execute 'grant execute on function public.try_auth_otp_send(text,text,text,boolean) to public';
end if;

if to_regprocedure('public.get_revenue_metrics()') is not null then
  execute 'grant execute on function public.get_revenue_metrics() to public';
end if;

if to_regprocedure('public.compute_mrr_snapshot(date)') is not null then
  execute 'grant execute on function public.compute_mrr_snapshot(date) to public';
end if;

if to_regprocedure('public.get_paywall_funnel(timestamptz,timestamptz)') is not null then
  execute 'grant execute on function public.get_paywall_funnel(timestamptz,timestamptz) to public';
end if;

if to_regprocedure('public.get_activity_kpis()') is not null then
  execute 'grant execute on function public.get_activity_kpis() to public';
end if;

if to_regprocedure('public.get_profile_demand_matrix(text,text,integer,integer,boolean,timestamptz,timestamptz)') is not null then
  execute 'grant execute on function public.get_profile_demand_matrix(text,text,integer,integer,boolean,timestamptz,timestamptz) to public';
end if;

if to_regprocedure('public.get_map_search_matrix(timestamptz,timestamptz,text,text,integer,integer,boolean,text)') is not null then
  execute 'grant execute on function public.get_map_search_matrix(timestamptz,timestamptz,text,text,integer,integer,boolean,text) to public';
end if;

if to_regprocedure('public.get_city_growth_email_batches()') is not null then
  execute 'grant execute on function public.get_city_growth_email_batches() to public';
end if;

if to_regprocedure('public.profile_has_paid_subscription(uuid)') is not null then
  execute 'grant execute on function public.profile_has_paid_subscription(uuid) to public';
end if;

end $$;

notify pgrst, 'reload schema';