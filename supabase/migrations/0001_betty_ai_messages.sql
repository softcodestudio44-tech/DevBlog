-- ============================================================
-- Betty AI chat history + default demo user
-- Run via: supabase db query --linked -f supabase/migrations/0001_betty_ai_messages.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1) BETTY AI MESSAGE STORAGE TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.betty_ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'ai')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_betty_ai_messages_user_created
  ON public.betty_ai_messages(user_id, created_at);

ALTER TABLE public.betty_ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own betty messages" ON public.betty_ai_messages;
CREATE POLICY "Users can read own betty messages"
  ON public.betty_ai_messages FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own betty messages" ON public.betty_ai_messages;
CREATE POLICY "Users can insert own betty messages"
  ON public.betty_ai_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own betty messages" ON public.betty_ai_messages;
CREATE POLICY "Users can delete own betty messages"
  ON public.betty_ai_messages FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 2) WIPE ALL EXISTING BETTY AI HISTORY (fresh start)
-- ------------------------------------------------------------
DELETE FROM public.betty_ai_messages;

-- ------------------------------------------------------------
-- 3) REAL-TIME PUBLICATION (idempotent)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'betty_ai_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.betty_ai_messages;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4) DEFAULT DEMO ACCOUNT (non-admin)
-- Name: Demo User | Email: demo@devblog.com | Password: demo123
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo@devblog.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change_confirm_status,
      is_sso_user,
      is_anonymous,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'demo@devblog.com',
      crypt('demo123', gen_salt('bf', 10)),
      now(),
      md5('demo@devblog.com' || now()::text),
      md5('recovery-demo@devblog.com' || now()::text),
      0,
      false,
      false,
      '{"provider":"email","providers":["email"]}',
      '{"name":"Demo User"}',
      now(),
      now()
    );

    -- Ensure the profile exists with role 'user' (never admin)
    INSERT INTO public.profiles (id, email, name, role)
    SELECT id, email, 'Demo User', 'user'
    FROM auth.users
    WHERE email = 'demo@devblog.com'
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ------------------------------------------------------------
-- DONE
-- ------------------------------------------------------------
SELECT 'Betty AI storage ready. Demo user created.' AS status;
