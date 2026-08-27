-- ==============================================================================
-- 📄 Step 1: Database Migration Schema (Supabase / PostgreSQL)
-- 5 Logical Layers, Private Layer (Git for Ideas), Operational Tables & RPCs
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- [市場データキャッシュ・レイヤー: Layer 4 〜 Layer 0]
-- ==============================================================================

-- Layer 4: 内部ジャンル辞書 (genres)
CREATE TABLE IF NOT EXISTS public.genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level INT NOT NULL CHECK (level IN (1, 2, 3)),
    parent_id UUID REFERENCES public.genres(id) ON DELETE SET NULL,
    canonical_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stagnant', 'deprecated')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Layer 3: 情報源マッピング (source_topic_mappings)
CREATE TABLE IF NOT EXISTS public.source_topic_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name VARCHAR(100) NOT NULL,
    source_topic_key VARCHAR(255) NOT NULL,
    genre_id UUID NOT NULL REFERENCES public.genres(id) ON DELETE CASCADE,
    last_fetched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_source_topic UNIQUE (source_name, source_topic_key)
);

-- Layer 2: ソーストピック・ランキングキャッシュ (rankings)
CREATE TABLE IF NOT EXISTS public.rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    genre_id UUID NOT NULL REFERENCES public.genres(id) ON DELETE CASCADE,
    rank_list JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ "app_id": "UUID", "rank": number }]
    last_computed_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Layer 1: 企業Rawデータ (apps)
CREATE TABLE IF NOT EXISTS public.apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    tagline TEXT,
    description TEXT,
    homepage_url TEXT,
    logo_url TEXT,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    raw_reviews_count INT NOT NULL DEFAULT 0,
    physical_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- app_genres (多対多中間テーブル)
CREATE TABLE IF NOT EXISTS public.app_genres (
    app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
    genre_id UUID NOT NULL REFERENCES public.genres(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (app_id, genre_id)
);

-- Layer 0: 文脈依存キャッシュ (market_cache)
CREATE TABLE IF NOT EXISTS public.market_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    genre_id UUID NOT NULL UNIQUE REFERENCES public.genres(id) ON DELETE CASCADE,
    materialized_json JSONB NOT NULL, -- D3.js用座標・クレーターデータ
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- [プライベートレイヤー: Git for Ideas & 認証]
-- ==============================================================================

-- ユーザー情報・クレジット管理 (users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    credits_balance INT NOT NULL DEFAULT 10,
    plan_tier VARCHAR(50) NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'bootstrapper', 'founder', 'studio')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ideas (アイデアプロジェクト親)
CREATE TABLE IF NOT EXISTS public.ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- idea_commits (イミュータブルな検証コミット履歴)
CREATE TABLE IF NOT EXISTS public.idea_commits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
    parent_commit_id UUID REFERENCES public.idea_commits(id) ON DELETE SET NULL,
    -- ユーザー入力
    q1_target_pain TEXT,
    q2_solution TEXT,
    q3_core_edge TEXT,
    q4_target_literacy TEXT,
    q4_monetization_model TEXT,
    q4_supplementary_pains JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- 検証メタデータ
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    emotional_score INT,
    semantic_diff TEXT,
    target_coordinates JSONB,
    share_token UUID UNIQUE DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- [運用・管理テーブル]
-- ==============================================================================

-- job_status (Inngest 非同期ジョブ進捗)
CREATE TABLE IF NOT EXISTS public.job_status (
    id UUID PRIMARY KEY, -- Inngest jobId
    user_id UUID,
    status VARCHAR(100) NOT NULL,
    percentage INT NOT NULL DEFAULT 0,
    error_message TEXT,
    result_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- [インデックス]
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_genres_parent_id ON public.genres(parent_id);
CREATE INDEX IF NOT EXISTS idx_genres_level ON public.genres(level);
CREATE INDEX IF NOT EXISTS idx_source_topic_genre ON public.source_topic_mappings(genre_id);
CREATE INDEX IF NOT EXISTS idx_rankings_genre_id ON public.rankings(genre_id);
CREATE INDEX IF NOT EXISTS idx_app_genres_genre_id ON public.app_genres(genre_id);
CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON public.ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_idea_commits_idea_id ON public.idea_commits(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_commits_share_token ON public.idea_commits(share_token);
CREATE INDEX IF NOT EXISTS idx_job_status_user_id ON public.job_status(user_id);

-- ==============================================================================
-- [Row Level Security (RLS) ポリシー]
-- ==============================================================================

-- 1. RLS 有効化
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_topic_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_status ENABLE ROW LEVEL SECURITY;

-- 2. 公開・キャッシュレイヤー (SELECT 許可)
CREATE POLICY "Allow read genres to all" ON public.genres FOR SELECT USING (true);
CREATE POLICY "Allow read source_topic_mappings to all" ON public.source_topic_mappings FOR SELECT USING (true);
CREATE POLICY "Allow read rankings to all" ON public.rankings FOR SELECT USING (true);
CREATE POLICY "Allow read apps to all" ON public.apps FOR SELECT USING (true);
CREATE POLICY "Allow read app_genres to all" ON public.app_genres FOR SELECT USING (true);
CREATE POLICY "Allow read market_cache to all" ON public.market_cache FOR SELECT USING (true);

-- 3. ユーザープロファイル
CREATE POLICY "Users can read own profile" ON public.users FOR SELECT USING (auth.uid() = id);

-- 4. アイデア (ideas) - 所有者のみ全操作可能
CREATE POLICY "Users can manage own ideas" ON public.ideas FOR ALL USING (auth.uid() = user_id);

-- 5. アイデアコミット (idea_commits)
-- 所有者: 全操作可能
CREATE POLICY "Users can manage own idea commits" ON public.idea_commits FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.ideas
        WHERE ideas.id = idea_commits.idea_id
        AND ideas.user_id = auth.uid()
    )
);

-- 投資家共有ビュー用: share_token 一致で未認証・認証ユーザーに SELECT 許可
CREATE POLICY "Allow public read idea commits via share_token" ON public.idea_commits FOR SELECT USING (
    share_token IS NOT NULL
);

-- 6. 非同期ジョブ (job_status) - 所有者は SELECT 可能
CREATE POLICY "Users can read own job status" ON public.job_status FOR SELECT USING (
    auth.uid() = user_id OR user_id IS NULL
);

-- ==============================================================================
-- [PostgreSQL ストアドファンクション (RPC)]
-- ==============================================================================

-- 1. manual_cache_revalidate
-- ユーザーのクレジット残高が2以上あるか確認し、2ポイント減算のうえ market_cache の該当レコードを強制削除して TRUE を返す
CREATE OR REPLACE FUNCTION public.manual_cache_revalidate(
    p_user_id UUID,
    p_genre_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_credits INT;
BEGIN
    -- クレジット確認（行ロック）
    SELECT credits_balance INTO v_current_credits
    FROM public.users
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_current_credits IS NULL OR v_current_credits < 2 THEN
        RETURN FALSE;
    END IF;

    -- クレジット減算 (2ポイント)
    UPDATE public.users
    SET credits_balance = credits_balance - 2,
        updated_at = now()
    WHERE id = p_user_id;

    -- market_cache の該当レコードを強制削除
    DELETE FROM public.market_cache
    WHERE genre_id = p_genre_id;

    RETURN TRUE;
END;
$$;

-- 2. calculate_borda_top10
-- 複数ソースのランキングJSONを受け取り、「11 - rank」の計算式でスコア化し、10位以内の企業を対象に合算して上位10社の company_id を返す
CREATE OR REPLACE FUNCTION public.calculate_borda_top10(
    rankings_jsonb JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH flattened_ranks AS (
        SELECT
            item->>'app_id' AS company_id,
            (item->>'rank')::INT AS rank_num
        FROM (
            SELECT jsonb_array_elements(
                CASE 
                    WHEN jsonb_typeof(rankings_jsonb->0) = 'array' THEN (
                        SELECT jsonb_agg(sub_item) 
                        FROM jsonb_array_elements(rankings_jsonb) arr, 
                             jsonb_array_elements(arr) sub_item
                    )
                    ELSE rankings_jsonb
                END
            ) AS item
        ) sub
        WHERE (item->>'rank')::INT BETWEEN 1 AND 10
    ),
    scored_companies AS (
        SELECT
            company_id,
            SUM(11 - rank_num) AS borda_score
        FROM flattened_ranks
        WHERE company_id IS NOT NULL AND company_id <> ''
        GROUP BY company_id
        ORDER BY borda_score DESC
        LIMIT 10
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'company_id', company_id,
            'score', borda_score
        )
    ) INTO v_result
    FROM scored_companies;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
