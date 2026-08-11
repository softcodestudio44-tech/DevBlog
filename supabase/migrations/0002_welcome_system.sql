-- ============================================================
-- 0002: Welcome system + polls + Betty AI conversation memory
-- Run via: supabase db query --linked -f supabase/migrations/0002_welcome_system.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1) POST WELCOMES (who welcomed a new member)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_welcomes (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_welcomes_post ON public.post_welcomes(post_id);

ALTER TABLE public.post_welcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read welcomes" ON public.post_welcomes;
CREATE POLICY "Anyone can read welcomes"
  ON public.post_welcomes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can welcome" ON public.post_welcomes;
CREATE POLICY "Authenticated users can welcome"
  ON public.post_welcomes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove own welcome" ON public.post_welcomes;
CREATE POLICY "Users can remove own welcome"
  ON public.post_welcomes FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 2) AUTO-CREATE A WELCOME POST FOR EVERY NEW MEMBER
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_welcome_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.posts (title, content, tags, images, is_draft, author_id)
  VALUES (
    '👋 ' || COALESCE(NEW.name, 'A new developer') || ' just joined DevBlog',
    '👋 Hi everyone! I''m ' || COALESCE(NEW.name, 'a new developer') || ', a developer. Excited to join DevBlog!',
    ARRAY['newmember'],
    '{}'::text[],
    false,
    NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_welcome_post();

-- ------------------------------------------------------------
-- 3) BETTY AI CONVERSATION MEMORY
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.betty_conversations (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  tech_stack TEXT[] NOT NULL DEFAULT '{}'::text[],
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.betty_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own betty conversations" ON public.betty_conversations;
CREATE POLICY "Users can read own betty conversations"
  ON public.betty_conversations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert own betty conversations" ON public.betty_conversations;
CREATE POLICY "Users can upsert own betty conversations"
  ON public.betty_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own betty conversations" ON public.betty_conversations;
CREATE POLICY "Users can update own betty conversations"
  ON public.betty_conversations FOR UPDATE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4) POLLS (busy feed engagement)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  created_by UUID,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)
);

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active polls" ON public.polls;
CREATE POLICY "Anyone can read active polls"
  ON public.polls FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read poll votes" ON public.poll_votes;
CREATE POLICY "Anyone can read poll votes"
  ON public.poll_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can vote" ON public.poll_votes;
CREATE POLICY "Authenticated users can vote"
  ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Seed the flagship poll
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.polls WHERE question = 'React or Vue?') THEN
    INSERT INTO public.polls (question, options, active)
    VALUES ('React or Vue?', ARRAY['React', 'Vue'], true);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 5) REAL-TIME PUBLICATION (idempotent)
-- ------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['post_welcomes', 'polls', 'poll_votes']::text[]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- DONE
-- ------------------------------------------------------------
SELECT 'Welcome system, polls, and Betty memory ready.' AS status;
