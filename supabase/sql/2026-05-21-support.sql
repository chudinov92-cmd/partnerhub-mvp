-- Поддержка: профиль, флаг закрытия обращения, RPC переоткрытия.
-- Запуск: Supabase SQL Editor (полный скрипт целиком).
-- После INSERT скопируйте id из результата в NEXT_PUBLIC_SUPPORT_PROFILE_ID (.env.local и deploy/timeweb/.env.app).

-- 1. Профиль поддержки (auth.users уже создан: support@zeip.ru)
INSERT INTO profiles (auth_user_id, full_name)
VALUES ('d469c17a-4756-45a3-a1a6-0487b7a8a7e0', 'Поддержка')
ON CONFLICT (auth_user_id) DO UPDATE
  SET full_name = EXCLUDED.full_name
RETURNING id;

-- Если RETURNING пустой (конфликт без UPDATE в старых PG), получить id вручную:
-- SELECT id FROM profiles WHERE auth_user_id = 'd469c17a-4756-45a3-a1a6-0487b7a8a7e0';

-- 2. Флаг закрытия обращения в чате поддержки
ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_closed boolean NOT NULL DEFAULT false;

-- 3. RPC: пользователь может только снять is_closed (новое обращение после закрытия)
CREATE OR REPLACE FUNCTION public.reopen_support_chat(p_chat_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_profile_id uuid;
  support_profile_id uuid;
BEGIN
  SELECT id INTO caller_profile_id FROM profiles WHERE auth_user_id = auth.uid();
  IF caller_profile_id IS NULL THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT id INTO support_profile_id FROM profiles
    WHERE auth_user_id = 'd469c17a-4756-45a3-a1a6-0487b7a8a7e0';

  IF support_profile_id IS NULL THEN
    RAISE EXCEPTION 'support_profile_missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM chat_members WHERE chat_id = p_chat_id AND user_id = caller_profile_id
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM chat_members WHERE chat_id = p_chat_id AND user_id = support_profile_id
  ) THEN
    RAISE EXCEPTION 'not_a_support_chat';
  END IF;

  UPDATE chats SET is_closed = false WHERE id = p_chat_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reopen_support_chat(uuid) TO authenticated;

-- Если при открытии поддержки ошибка RLS на chats — выполните также:
-- supabase/sql/2026-05-21-chats-insert-rls.sql
