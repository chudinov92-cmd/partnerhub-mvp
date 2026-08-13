-- Onboarding step 3: what user is seeking and what they already have

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS seeking text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS has_resources text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.profiles.seeking IS
  'What user is looking for: ideas | project | team';
COMMENT ON COLUMN public.profiles.has_resources IS
  'What user already has: ideas | project | motivation';

CREATE INDEX IF NOT EXISTS profiles_seeking_gin
  ON public.profiles USING GIN (seeking);

CREATE INDEX IF NOT EXISTS profiles_has_resources_gin
  ON public.profiles USING GIN (has_resources);
