-- =============================================================================
-- Security Baseline: приведение базы к целевому защищённому состоянию.
-- Запускать ПОСЛЕ всех миграций (в deploy-app.sh — последним).
-- Идемпотентно: безопасно запускать повторно.
-- =============================================================================
-- Целевое состояние:
--   - Серверные функции (18 шт): EXECUTE только у service_role
--   - Триггерные функции: security definer
--   - RLS на messages/chat_members/chats: без INSERT-политик на чаты
--   - Минимальные гранты (колоночные update, табличные select/delete)
-- =============================================================================
-- Baseline НЕ трогает бизнес-логику: только revoke/grant, alter function, drop политик.
-- =============================================================================

begin;

-- =============================================================================
-- 1. Серверные функции (18 шт): revoke execute от public/anon/authenticated,
--    grant execute только service_role. Поиск по имени, без сигнатур.
-- =============================================================================

do $$
declare
  r record;
  n int;
  fns text[] := array[
    'admin_purge_account',
    'admin_lookup_account_for_purge',
    'admin_lookup_auth_user_id_by_email',
    'apply_robokassa_payment',
    'get_profiles_for_message_email',
    'try_auth_login',
    'try_auth_otp_send',
    'get_revenue_metrics',
    'compute_mrr_snapshot',
    'get_paywall_funnel',
    'get_activity_kpis',
    'get_profile_demand_matrix',
    'get_map_search_matrix',
    'get_city_growth_email_batches',
    'profile_has_paid_subscription',
    'award_daily',
    'apply_profile_rating',
    'mask_profanity'
  ];
begin
  select count(distinct p.proname) into n
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname = any (fns);
  if n <> 18 then
    raise exception 'security-baseline: найдено % из 18 серверных функций. Проверь список имён.', n;
  end if;

  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname = any (fns)
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end;
$$;


-- =============================================================================
-- 2. Триггерные функции: security definer
--    (после DROP+CREATE могли сброситься на invoker)
-- =============================================================================

do $$
declare
  r record;
  fn_list text[] := array[
    'trg_post_comments_mask_profanity',
    'trg_posts_mask_profanity',
    'trg_profiles_mask_profanity',
    'trg_profile_work_mask_profanity',
    'trg_profession_catalog_mask_profanity',
    'trg_industry_catalog_mask_profanity',
    'trg_subindustry_catalog_mask_profanity',
    'trg_messages_award_daily',
    'trg_posts_award_daily_send',
    'trg_profiles_apply_rating',
    'trg_locations_apply_rating'
  ];
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname = any (fn_list)
  loop
    execute format('alter function %s security definer set search_path = public', r.sig);
  end loop;
end;
$$;

-- =============================================================================
-- 3. is_blocked_pair: security definer, EXECUTE only authenticated
-- =============================================================================

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname = 'is_blocked_pair'
  loop
    execute format('alter function %s security definer set search_path = public', r.sig);
    execute format('revoke all on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end;
$$;

-- =============================================================================
-- 4. ensure_private_chat: EXECUTE only authenticated
-- =============================================================================

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname = 'ensure_private_chat'
  loop
    execute format('revoke all on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end;
$$;

-- =============================================================================
-- 5. chat_members: drop INSERT policies
-- =============================================================================

drop policy if exists chat_members_insert_private on public.chat_members;
drop policy if exists chat_members_insert_authenticated on public.chat_members;
revoke insert on table public.chat_members from authenticated;

-- =============================================================================
-- 6. chats: drop INSERT policies
-- =============================================================================

drop policy if exists chats_insert_private_own on public.chats;
drop policy if exists chats_insert_authenticated on public.chats;
revoke insert on table public.chats from authenticated;

-- =============================================================================
-- 7. messages: drop old dangerous policies
-- =============================================================================

drop policy if exists messages_insert_not_blocked on public.messages;

-- =============================================================================
-- 8. Enable RLS on all expected tables
-- =============================================================================

alter table public.messages enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.ratings enable row level security;
alter table public.rating_state enable row level security;
alter table public.rating_daily_events enable row level security;
alter table public.profanity_terms enable row level security;

-- =============================================================================
-- 9. Grants: messages — table-level select/delete, column-level insert/update
-- =============================================================================

revoke all on table public.messages from public, anon, authenticated;
grant select, delete on table public.messages to authenticated;
grant insert (chat_id, sender_id, content) on table public.messages to authenticated;
grant update (content) on table public.messages to authenticated;

-- =============================================================================
-- 10. Grants: chat_members — select + column-level update (last_read_at only)
-- =============================================================================

revoke all on table public.chat_members from public, anon, authenticated;
grant select on table public.chat_members to authenticated;
grant update (last_read_at) on table public.chat_members to authenticated;

-- =============================================================================
-- 11. Grants: chats — SELECT only for authenticated
-- =============================================================================

revoke all on table public.chats from public, anon, authenticated;
grant select on table public.chats to authenticated;

-- =============================================================================
-- 12. Internal tables: deny all roles
-- =============================================================================

revoke all on table public.ratings from public, anon, authenticated;
revoke all on table public.rating_state from public, anon, authenticated;
revoke all on table public.rating_daily_events from public, anon, authenticated;
revoke all on table public.profanity_terms from public, anon, authenticated;

commit;

notify pgrst, 'reload schema';