-- ============================================================
-- DevBlog Supabase Migration - Clean Start (Supabase-only)
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- WARNING: This WIPES all existing app data.
-- ============================================================

-- ------------------------------------------------------------
-- 1) WIPE ALL DATA (order matters - truncate children first)
-- ------------------------------------------------------------
TRUNCATE TABLE public.notifications,
  public.direct_messages,
  public.messages,
  public.follows,
  public.likes,
  public.comments,
  public.posts,
  public.channels
CASCADE;

-- Delete all auth users (profiles cascade via FK)
DELETE FROM auth.users;

-- ------------------------------------------------------------
-- 2) NOTIFY RPC - lets any authenticated client create a
--    notification for another user (bypasses RLS as definer)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify(
  p_user_id uuid,
  p_type text,
  p_message text,
  p_source_id text DEFAULT NULL,
  p_source_type text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ignore self-notifications
  IF p_actor_id IS NOT NULL AND p_actor_id = p_user_id THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (user_id, type, message, source_id, source_type, actor_id)
  VALUES (p_user_id, p_type, p_message, p_source_id, p_source_type, p_actor_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify(uuid, text, text, text, text, uuid)
  TO anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 3) SIGNUP TRIGGER - grant admin role to the admin email
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.email = 'sofcodestudio44@gmail.com' THEN 'admin' ELSE 'user' END
  );
  RETURN NEW;
END;
$$;

-- Trigger is already attached (on_auth_user_created), function is replaced in place.

-- ------------------------------------------------------------
-- 4) RLS POLICIES - admin / author delete coverage
-- ------------------------------------------------------------

-- Posts: author or admin can update/delete
DROP POLICY IF EXISTS "Authors can update own posts" ON public.posts;
DROP POLICY IF EXISTS "Authors can delete own posts" ON public.posts;

CREATE POLICY "Authors can update own posts"
  ON public.posts FOR UPDATE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Authors can delete own posts"
  ON public.posts FOR DELETE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Comments: author, post owner, or admin can delete
DROP POLICY IF EXISTS "Authors can delete own comments" ON public.comments;

CREATE POLICY "Authors can delete own comments"
  ON public.comments FOR DELETE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND author_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Messages: author or admin can delete
DROP POLICY IF EXISTS "Authors can delete own messages" ON public.messages;

CREATE POLICY "Authors can delete own messages"
  ON public.messages FOR DELETE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Direct messages: sender or admin can delete
DROP POLICY IF EXISTS "Users can delete own DMs" ON public.direct_messages;

CREATE POLICY "Users can delete own DMs"
  ON public.direct_messages FOR DELETE USING (
    auth.uid() = sender_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Channels: only admins can delete
DROP POLICY IF EXISTS "Admins can delete channels" ON public.channels;

CREATE POLICY "Admins can delete channels"
  ON public.channels FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ------------------------------------------------------------
-- 5) RE-SEED CHANNELS
-- ------------------------------------------------------------
INSERT INTO public.channels (name, topic) VALUES
  ('general', 'General discussion for all developers'),
  ('help-support', 'Get help with your code and projects'),
  ('showcase', 'Show off your projects and get feedback'),
  ('random', 'Off-topic conversations and fun')
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------
-- 6) REAL-TIME PUBLICATION (idempotent)
-- ------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['posts','comments','likes','messages','direct_messages','notifications','follows']
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
SELECT 'DevBlog migration complete. Channels reseeded, data wiped.' AS status;
