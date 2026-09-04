-- ==============================================================================
-- 💳 Step 1: Hybrid Billing & Progressive Signup Migration
-- Creates profiles, user_unlocked_markets, and updates manual_cache_revalidate RPC
-- ==============================================================================

-- 1. profiles テーブル構築 (auth.users に紐づくハイブリッド課金用ウォレット)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255) UNIQUE,
    plan_tier VARCHAR(50) DEFAULT 'free' CHECK (plan_tier IN ('free', 'starter', 'pro', 'founder')),
    monthly_credits INT DEFAULT 10 NOT NULL CHECK (monthly_credits >= 0),
    purchased_credits INT DEFAULT 0 NOT NULL CHECK (purchased_credits >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_tier ON public.profiles(plan_tier);

-- 2. user_unlocked_markets テーブル構築 (ダウングレード時の資産維持用交差テーブル)
CREATE TABLE IF NOT EXISTS public.user_unlocked_markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    genre_id UUID NOT NULL REFERENCES public.genres(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_user_unlocked_genre UNIQUE (user_id, genre_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_unlocked_markets_user ON public.user_unlocked_markets(user_id);
CREATE INDEX IF NOT EXISTS idx_unlocked_markets_genre ON public.user_unlocked_markets(genre_id);

-- 3. 行レベルセキュリティ (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_unlocked_markets ENABLE ROW LEVEL SECURITY;

-- profiles: ユーザー自身は閲覧可能 (他人のプロファイルは不可)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

-- profiles: 一般ユーザーによるクレジット直接改ざんを禁止 (Service Role のみ書き込み可)
-- ※ Service Role は RLS をバイパスするため、明示的ポリシーなしで書き込み可能

-- user_unlocked_markets: ユーザー自身は閲覧可能 (他人のアンロック市場は不可)
DROP POLICY IF EXISTS "Users can read own unlocked markets" ON public.user_unlocked_markets;
CREATE POLICY "Users can read own unlocked markets" ON public.user_unlocked_markets
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- user_unlocked_markets: ユーザー自身のみアンロック記録可能
DROP POLICY IF EXISTS "Users can insert own unlocked markets" ON public.user_unlocked_markets;
CREATE POLICY "Users can insert own unlocked markets" ON public.user_unlocked_markets
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 4. 新規ユーザー作成時の自動 profile 生成トリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, plan_tier, monthly_credits, purchased_credits)
    VALUES (NEW.id, 'free', 10, 0)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. RPC関数の改修: manual_cache_revalidate
-- ペナルティを「3クレジット」に変更し、monthly_credits を優先消費、不足分を purchased_credits から減算するトランザクション
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
    v_monthly INT;
    v_purchased INT;
    v_total INT;
    v_needed INT;
    v_user_credits INT;
BEGIN
    -- 1. profiles テーブルでの確認 (行ロック)
    SELECT monthly_credits, purchased_credits INTO v_monthly, v_purchased
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF FOUND THEN
        v_total := v_monthly + v_purchased;
        -- 3クレジット以上必要
        IF v_total < 3 THEN
            RETURN FALSE;
        END IF;

        -- monthly_credits を優先消費
        IF v_monthly >= 3 THEN
            v_monthly := v_monthly - 3;
        ELSE
            v_needed := 3 - v_monthly;
            v_monthly := 0;
            v_purchased := v_purchased - v_needed;
        END IF;

        -- 残高更新
        UPDATE public.profiles
        SET monthly_credits = v_monthly,
            purchased_credits = v_purchased,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_user_id;

    ELSE
        -- 2. 旧 users テーブルへのフォールバック (移行期間保護)
        SELECT credits_balance INTO v_user_credits
        FROM public.users
        WHERE id = p_user_id
        FOR UPDATE;

        IF v_user_credits IS NULL OR v_user_credits < 3 THEN
            RETURN FALSE;
        END IF;

        UPDATE public.users
        SET credits_balance = credits_balance - 3,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_user_id;
    END IF;

    -- 3. market_cache の該当レコードを強制パージ
    DELETE FROM public.market_cache
    WHERE genre_id = p_genre_id;

    -- 4. user_unlocked_markets にアンロック記録 (ダウングレード時の資産維持)
    INSERT INTO public.user_unlocked_markets (user_id, genre_id, unlocked_at)
    VALUES (p_user_id, p_genre_id, timezone('utc'::text, now()))
    ON CONFLICT (user_id, genre_id) DO NOTHING;

    RETURN TRUE;
END;
$$;
