-- Тарифы Free / Pro / Pro+: subscription_plan, лимиты чата и избранного.
-- Self-hosted Timeweb:
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/2026-08-17-subscription-tiers.sql

-- ---------------------------------------------------------------------------
-- profiles.subscription_plan
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists subscription_plan text not null default 'free';

alter table public.profiles
  drop constraint if exists profiles_subscription_plan_check;

alter table public.profiles
  add constraint profiles_subscription_plan_check
  check (subscription_plan in ('free', 'pro', 'pro_plus'));

comment on column public.profiles.subscription_plan is
  'Тариф: free | pro | pro_plus. is_pro синхронизируется триггером.';

-- Миграция существующих Pro-пользователей
update public.profiles
set subscription_plan = 'pro'
where is_pro = true
  and coalesce(pro_expires_at, now() + interval '1 day') > now()
  and subscription_plan = 'free';

-- ---------------------------------------------------------------------------
-- sync is_pro from subscription_plan (+ pro_expires_at)
-- ---------------------------------------------------------------------------

create or replace function public.sync_is_pro_from_subscription_plan()
returns trigger
language plpgsql
as $$
declare
  active_paid boolean;
begin
  active_paid :=
    new.subscription_plan in ('pro', 'pro_plus')
    and (
      new.pro_expires_at is null
      or new.pro_expires_at > now()
    );

  new.is_pro := active_paid;
  return new;
end;
$$;

drop trigger if exists trg_profiles_sync_is_pro on public.profiles;
create trigger trg_profiles_sync_is_pro
  before insert or update of subscription_plan, pro_expires_at, is_pro
  on public.profiles
  for each row
  execute function public.sync_is_pro_from_subscription_plan();

-- ---------------------------------------------------------------------------
-- profile_views.last_opened_at (лимит просмотров Free: 5/сутки)
-- ---------------------------------------------------------------------------

alter table public.profile_views
  add column if not exists last_opened_at timestamptz not null default now();

update public.profile_views
set last_opened_at = coalesce(viewed_content_updated_at, created_at, now())
where last_opened_at is null;

-- ---------------------------------------------------------------------------
-- Helper: активный платный тариф
-- ---------------------------------------------------------------------------

create or replace function public.is_active_paid_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id
      and p.subscription_plan in ('pro', 'pro_plus')
      and (p.pro_expires_at is null or p.pro_expires_at > now())
      and coalesce(p.is_blocked, false) = false
  );
$$;

create or replace function public.profile_subscription_plan(p_profile_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_active_paid_profile(p_profile_id) then
      (select p.subscription_plan from public.profiles p where p.id = p_profile_id)
    else 'free'
  end;
$$;

-- ---------------------------------------------------------------------------
-- Лимиты: избранное, просмотры, посты в общем чате
-- ---------------------------------------------------------------------------

create or replace function public.count_profile_contacts(p_owner_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.profile_contacts pc
  where pc.owner_id = p_owner_id;
$$;

create or replace function public.count_today_profile_views(p_viewer_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct pv.viewed_profile_id)::integer
  from public.profile_views pv
  where pv.viewer_id = p_viewer_id
    and pv.last_opened_at >= date_trunc('day', now());
$$;

create or replace function public.count_today_chat_posts(p_author_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.posts po
  where po.author_id = p_author_id
    and po.created_at >= date_trunc('day', now());
$$;

-- ---------------------------------------------------------------------------
-- RLS: profile_contacts — Free максимум 5 контактов
-- ---------------------------------------------------------------------------

drop policy if exists profile_contacts_insert_owner on public.profile_contacts;

create policy profile_contacts_insert_owner
on public.profile_contacts
for insert
to authenticated
with check (
  owner_id in (
    select p.id from public.profiles p where p.auth_user_id = auth.uid()
  )
  and owner_id <> contact_profile_id
  and (
    public.profile_subscription_plan(owner_id) <> 'free'
    or public.count_profile_contacts(owner_id) < 5
  )
);

-- ---------------------------------------------------------------------------
-- RLS: posts — писать могут только Pro+ (до 10 постов/сутки)
-- ---------------------------------------------------------------------------

drop policy if exists posts_insert_not_blocked on public.posts;

create policy posts_insert_not_blocked
on public.posts
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = posts.author_id
      and p.auth_user_id = auth.uid()
      and coalesce(p.is_blocked, false) = false
      and public.profile_subscription_plan(p.id) = 'pro_plus'
      and public.count_today_chat_posts(p.id) < 10
  )
);

drop policy if exists posts_update_author_pro on public.posts;

create policy posts_update_author_pro
on public.posts
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = posts.author_id
      and p.auth_user_id = auth.uid()
      and coalesce(p.is_blocked, false) = false
      and public.profile_subscription_plan(p.id) = 'pro_plus'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = posts.author_id
      and p.auth_user_id = auth.uid()
      and coalesce(p.is_blocked, false) = false
      and public.profile_subscription_plan(p.id) = 'pro_plus'
  )
);

-- ---------------------------------------------------------------------------
-- RLS: profile_views insert — Free максимум 5 уникальных просмотров/сутки
-- ---------------------------------------------------------------------------

drop policy if exists profile_views_insert_viewer on public.profile_views;

create policy profile_views_insert_viewer
on public.profile_views
for insert
to authenticated
with check (
  viewer_id in (
    select p.id from public.profiles p where p.auth_user_id = auth.uid()
  )
  and viewer_id <> viewed_profile_id
  and (
    public.profile_subscription_plan(viewer_id) <> 'free'
    or public.count_today_profile_views(viewer_id) < 5
  )
);

drop policy if exists profile_views_update_viewer on public.profile_views;

create policy profile_views_update_viewer
on public.profile_views
for update
to authenticated
using (
  viewer_id in (
    select p.id from public.profiles p where p.auth_user_id = auth.uid()
  )
)
with check (
  viewer_id in (
    select p.id from public.profiles p where p.auth_user_id = auth.uid()
  )
  and viewer_id <> viewed_profile_id
);
