-- ============================================================
-- 0007: Admin channel management, group rules, presence,
--      soft-delete messages, and admin email fix
-- Run via: supabase db query --linked -f supabase/migrations/0007_admin_rules_presence_deletemsg.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1) PROFILES: online presence (last_seen)
-- ------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

-- ------------------------------------------------------------
-- 2) CHANNELS: creator + editable rules
-- ------------------------------------------------------------
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS rules TEXT;

-- ------------------------------------------------------------
-- 3) MESSAGES / DIRECT_MESSAGES: soft delete (deleted_at)
-- ------------------------------------------------------------
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ------------------------------------------------------------
-- 4) CHANNEL_BANS: admin "remove user" = ban from posting
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.channel_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  banned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_bans_channel ON public.channel_bans(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_bans_user ON public.channel_bans(user_id);

ALTER TABLE public.channel_bans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Channel bans are viewable by everyone" ON public.channel_bans;
CREATE POLICY "Channel bans are viewable by everyone"
  ON public.channel_bans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert channel bans" ON public.channel_bans;
CREATE POLICY "Admins can insert channel bans"
  ON public.channel_bans FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete channel bans" ON public.channel_bans;
CREATE POLICY "Admins can delete channel bans"
  ON public.channel_bans FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ------------------------------------------------------------
-- 5) TRIGGER: block banned users from posting in a channel
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_banned_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.channel_bans
    WHERE channel_id = NEW.channel_id AND user_id = NEW.author_id
  ) THEN
    RAISE EXCEPTION 'You have been removed from this channel and cannot post.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_banned_messages_trigger ON public.messages;
CREATE TRIGGER prevent_banned_messages_trigger
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.prevent_banned_messages();

-- ------------------------------------------------------------
-- 6) UPDATE POLICIES: soft delete + mark-as-read
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can update own sent DMs" ON public.direct_messages;
CREATE POLICY "Users can update own sent DMs"
  ON public.direct_messages FOR UPDATE USING (
    auth.uid() = sender_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "DM recipients can mark DMs as read" ON public.direct_messages;
CREATE POLICY "DM recipients can mark DMs as read"
  ON public.direct_messages FOR UPDATE USING (auth.uid() = recipient_id);

-- ------------------------------------------------------------
-- 7) ADMIN EMAIL FIX (softcodestudio44@gmail.com)
--    Also keep the previous typo'd email as an admin fallback
--    so no existing admin account loses powers.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
  _name text;
  _avatar text;
  _role text;
BEGIN
  _email := COALESCE(
    NULLIF(NEW.email, ''),
    NULLIF(NEW.raw_user_meta_data->>'email', ''),
    NULLIF(NEW.raw_user_meta_data->>'user_name', '') || '@devblog.local',
    NEW.id::text || '@devblog.local'
  );

  _name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'user_name', ''),
    split_part(_email, '@', 1)
  );

  _avatar := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
    NULLIF(NEW.raw_user_meta_data->>'picture', '')
  );

  IF _email = 'softcodestudio44@gmail.com' OR _email = 'sofcodestudio44@gmail.com' THEN
    _role := 'admin';
  ELSE
    _role := 'user';
  END IF;

  INSERT INTO public.profiles (id, email, name, avatar, role, last_seen)
  VALUES (NEW.id, _email, _name, _avatar, _role, now())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    avatar = COALESCE(public.profiles.avatar, EXCLUDED.avatar),
    role = CASE WHEN public.profiles.role = 'admin' THEN 'admin' ELSE EXCLUDED.role END;
  RETURN NEW;
END;
$$;

-- Promote any existing profile matching the admin emails
UPDATE public.profiles
SET role = 'admin'
WHERE email IN ('softcodestudio44@gmail.com', 'sofcodestudio44@gmail.com');

-- ------------------------------------------------------------
-- 8) DEFAULT RULES for existing channels
-- ------------------------------------------------------------
UPDATE public.channels
SET rules = 'Be respectful to all members\nNo spam or self-promotion\nKeep discussions tech-related\nNo sharing of private information\nAdmin decisions are final'
WHERE rules IS NULL;

-- ------------------------------------------------------------
-- DONE
-- ------------------------------------------------------------
SELECT 'Admin channel management, rules, presence, soft-delete ready.' AS status;
