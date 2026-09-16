-- profession_catalog: canonical label_key for case-insensitive dedup
-- Run in Supabase SQL Editor or via deploy/timeweb/deploy-app.sh

alter table public.profession_catalog
  add column if not exists label_key text;

update public.profession_catalog
set label_key = lower(btrim(label))
where label_key is null;

-- Dedupe: keep one row per label_key (is_stock first, then oldest)
create temp table _profession_catalog_dedup on commit drop as
with ranked as (
  select
    id,
    label,
    label_key,
    row_number() over (
      partition by label_key
      order by coalesce(is_stock, false) desc, created_at asc, id asc
    ) as rn
  from public.profession_catalog
  where label_key is not null and label_key <> ''
)
select id, label, label_key, rn
from ranked;

update public.profiles p
set role_title = w.label
from _profession_catalog_dedup l
join _profession_catalog_dedup w on l.label_key = w.label_key and w.rn = 1
where l.rn > 1
  and p.role_title = l.label;

do $$
begin
  if to_regclass('public.profile_work') is not null then
    update public.profile_work pw
    set role_title = w.label
    from _profession_catalog_dedup l
    join _profession_catalog_dedup w on l.label_key = w.label_key and w.rn = 1
    where l.rn > 1
      and pw.role_title = l.label;
  end if;
end $$;

delete from public.profession_catalog pc
using _profession_catalog_dedup l
where pc.id = l.id
  and l.rn > 1;

alter table public.profession_catalog
  alter column label_key set not null;

create unique index if not exists profession_catalog_label_key_unique
  on public.profession_catalog (label_key);

create or replace function public.trg_profession_catalog_set_label_key()
returns trigger
language plpgsql
as $$
begin
  new.label_key := lower(btrim(new.label));
  return new;
end;
$$;

drop trigger if exists profession_catalog_set_label_key on public.profession_catalog;
create trigger profession_catalog_set_label_key
  before insert or update of label
  on public.profession_catalog
  for each row
  execute function public.trg_profession_catalog_set_label_key();
