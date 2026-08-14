-- ============================================================
-- 0006: Allow a profile owner to remove their own followers
-- The existing "Users can delete own follows" policy only lets
-- auth.uid() = follower_id delete, so profile owners could not
-- remove a follower from their own Followers list. This policy
-- permits deleting a follows row when the viewer is the
-- following_id (the profile owner).
-- Run via: supabase db query --linked -f supabase/migrations/0006_profile_owner_remove_follower.sql
-- ============================================================

DROP POLICY IF EXISTS "Profile owners can remove followers" ON public.follows;
CREATE POLICY "Profile owners can remove followers"
  ON public.follows FOR DELETE USING (auth.uid() = following_id);

SELECT 'Profile owner remove-follower policy ready.' AS status;
