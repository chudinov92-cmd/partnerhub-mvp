-- paid_gate: one-time 3-day trial flag
alter table public.profiles
  add column if not exists trial_used boolean not null default false;

comment on column public.profiles.trial_used is
  'paid_gate: one-time 3-day trial already consumed';
