-- Настройки аккаунта: soft delete + видимость на карте.
-- Запуск: SQL Editor supabase.zeip.ru
-- На VPS подхватывается deploy/timeweb/deploy-app.sh

alter table public.profiles
  add column if not exists deleted_at timestamptz null;

alter table public.profiles
  add column if not exists map_visible boolean not null default true;

comment on column public.profiles.deleted_at is
  'Soft delete: профиль скрыт; auth удалён отдельно. В чатах отображается как «Удалённый пользователь».';

comment on column public.profiles.map_visible is
  'Если false — пин и профиль скрыты с карты/ленты карты (аккаунт живой).';

create index if not exists idx_profiles_deleted_at
  on public.profiles (deleted_at)
  where deleted_at is not null;

create index if not exists idx_profiles_map_visible
  on public.profiles (map_visible)
  where map_visible = true and deleted_at is null;

-- Soft-deleted строки должны пережить удаление auth.users
alter table public.profiles
  alter column auth_user_id drop not null;

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.profiles'::regclass
      and c.contype = 'f'
      and c.confrelid = 'auth.users'::regclass
  loop
    execute format('alter table public.profiles drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.profiles
  drop constraint if exists profiles_auth_user_id_fkey;

alter table public.profiles
  add constraint profiles_auth_user_id_fkey
  foreign key (auth_user_id)
  references auth.users (id)
  on delete set null;

notify pgrst, 'reload schema';
