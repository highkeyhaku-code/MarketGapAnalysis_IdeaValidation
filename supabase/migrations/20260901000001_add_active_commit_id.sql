-- ==============================================================================
-- 📄 Step 1: Database Migration Schema Extension (Git for Ideas HEAD pointer)
-- Adds active_commit_id to ideas table and creates foreign key / index
-- ==============================================================================

-- 1. ideas テーブルに active_commit_id (HEAD) カラムを追加
ALTER TABLE public.ideas
ADD COLUMN IF NOT EXISTS active_commit_id UUID REFERENCES public.idea_commits(id) ON DELETE SET NULL;

-- 2. active_commit_id インデックス作成
CREATE INDEX IF NOT EXISTS idx_ideas_active_commit_id ON public.ideas(active_commit_id);

-- 3. 既存データのバックフィル (各 idea の最新 commit_id を active_commit_id に設定)
UPDATE public.ideas i
SET active_commit_id = (
    SELECT id
    FROM public.idea_commits c
    WHERE c.idea_id = i.id
    ORDER BY c.created_at DESC
    LIMIT 1
)
WHERE i.active_commit_id IS NULL;
