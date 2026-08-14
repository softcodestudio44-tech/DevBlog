-- ============================================================
-- 0005: Add missing DELETE policy on betty_conversations
-- Fixes "Delete history" failing for Betty AI chat memory
-- Run via: supabase db query --linked -f supabase/migrations/0005_betty_conversations_delete.sql
-- ============================================================

ALTER TABLE public.betty_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete own betty conversations" ON public.betty_conversations;
CREATE POLICY "Users can delete own betty conversations"
  ON public.betty_conversations FOR DELETE USING (auth.uid() = user_id);

SELECT 'Betty conversations DELETE policy ready.' AS status;
