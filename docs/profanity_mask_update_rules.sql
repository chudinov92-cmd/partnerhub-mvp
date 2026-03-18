-- Update profanity masking rules:
-- 1) Mask profile fields: skills/looking_for/can_help_with/interested_in
-- 2) Do NOT mask personal messages (public.messages)

-- profiles trigger function (recreate with extra fields)
create or replace function public.trg_profiles_mask_profanity()
returns trigger
language plpgsql
as $$
begin
  new.full_name := public.mask_profanity(new.full_name);
  new.role_title := public.mask_profanity(new.role_title);
  new.industry_other := public.mask_profanity(new.industry_other);
  new.subindustry := public.mask_profanity(new.subindustry);

  new.skills := public.mask_profanity(new.skills);
  new.looking_for := public.mask_profanity(new.looking_for);
  new.can_help_with := public.mask_profanity(new.can_help_with);
  new.interested_in := public.mask_profanity(new.interested_in);
  return new;
end;
$$;

drop trigger if exists profiles_mask_profanity on public.profiles;
create trigger profiles_mask_profanity
before insert or update
on public.profiles
for each row
execute function public.trg_profiles_mask_profanity();

-- remove messages profanity trigger (if it exists)
drop trigger if exists messages_mask_profanity on public.messages;
-- optional: keep function, but drop it to avoid confusion
drop function if exists public.trg_messages_mask_profanity();

