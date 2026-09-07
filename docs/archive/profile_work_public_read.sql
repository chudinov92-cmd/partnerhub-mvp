-- Public read for profile_work + stable block ordering.
-- Run in Supabase SQL editor (self-host / Timeweb).

alter table public.profile_work
  add column if not exists sort_order integer not null default 0;

-- Backfill sort_order from created_at (stable tie-break by id).
with ranked as (
  select
    id,
    row_number() over (
      partition by profile_id
      order by created_at asc, id asc
    ) - 1 as rn
  from public.profile_work
)
update public.profile_work pw
set sort_order = ranked.rn
from ranked
where pw.id = ranked.id;

grant select on table public.profile_work to anon, authenticated;

-- Replace owner-only FOR ALL with split policies so public SELECT works.
drop policy if exists profile_work_rw_own on public.profile_work;

drop policy if exists profile_work_select_public on public.profile_work;
create policy profile_work_select_public
  on public.profile_work
  for select
  to anon, authenticated
  using (true);

drop policy if exists profile_work_insert_own on public.profile_work;
create policy profile_work_insert_own
  on public.profile_work
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_work.profile_id
        and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists profile_work_update_own on public.profile_work;
create policy profile_work_update_own
  on public.profile_work
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_work.profile_id
        and p.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_work.profile_id
        and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists profile_work_delete_own on public.profile_work;
create policy profile_work_delete_own
  on public.profile_work
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_work.profile_id
        and p.auth_user_id = auth.uid()
    )
  );
