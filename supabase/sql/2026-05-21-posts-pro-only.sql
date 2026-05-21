-- Общий чат: писать и редактировать посты могут только активные Pro.
-- Self-hosted:
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < /root/zeip/my-app/supabase/sql/2026-05-21-posts-pro-only.sql

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
      and p.is_pro = true
      and (p.pro_expires_at is null or p.pro_expires_at > now())
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
      and p.is_pro = true
      and (p.pro_expires_at is null or p.pro_expires_at > now())
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = posts.author_id
      and p.auth_user_id = auth.uid()
      and coalesce(p.is_blocked, false) = false
      and p.is_pro = true
      and (p.pro_expires_at is null or p.pro_expires_at > now())
  )
);
