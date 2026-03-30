-- Комментарии к постам общего чата (public.posts).
-- Чтение: все (anon + authenticated). Вставка: только authenticated, не заблокированный профиль.
-- Запуск: Supabase SQL Editor.

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint post_comments_body_len check (char_length(body) <= 1000)
);

create index if not exists post_comments_post_id_idx
  on public.post_comments (post_id);

create index if not exists post_comments_created_at_idx
  on public.post_comments (post_id, created_at);

alter table public.post_comments enable row level security;

-- SELECT: как у постов — все читают
drop policy if exists post_comments_select_all on public.post_comments;
create policy post_comments_select_all
on public.post_comments
for select
using (true);

-- INSERT: только авторизованный, author_id = свой профиль, не заблокирован
drop policy if exists post_comments_insert_not_blocked on public.post_comments;
create policy post_comments_insert_not_blocked
on public.post_comments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = post_comments.author_id
      and p.auth_user_id = auth.uid()
      and coalesce(p.is_blocked, false) = false
  )
);

grant select on public.post_comments to anon, authenticated;
grant insert on public.post_comments to authenticated;

-- Маска мата (та же функция, что для posts)
create or replace function public.trg_post_comments_mask_profanity()
returns trigger
language plpgsql
as $$
begin
  new.body := public.mask_profanity(new.body);
  return new;
end;
$$;

drop trigger if exists post_comments_mask_profanity on public.post_comments;
create trigger post_comments_mask_profanity
before insert or update
on public.post_comments
for each row
execute function public.trg_post_comments_mask_profanity();
