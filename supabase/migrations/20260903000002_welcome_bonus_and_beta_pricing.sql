-- ==============================================================================
-- 🎁 Step 2: Welcome Bonus & Beta Pricing Architecture Migration
-- Updates profiles plan_tier check constraint (adds 'studio')
-- Updates handle_new_user() trigger function to grant 25 monthly_credits (10 base + 15 bonus)
-- ==============================================================================

-- 1. profiles の plan_tier CHECK 制約に 'studio' を追加
DO $$
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_tier_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_tier_check 
        CHECK (plan_tier IN ('free', 'starter', 'founder', 'studio', 'pro'));
EXCEPTION
    WHEN undefined_table THEN
        NULL;
END $$;

-- 2. profiles の monthly_credits デフォルト値を 25 に更新
DO $$
BEGIN
    ALTER TABLE public.profiles ALTER COLUMN monthly_credits SET DEFAULT 25;
EXCEPTION
    WHEN undefined_table THEN
        NULL;
END $$;

-- 3. 新規ユーザー登録トリガー関数 handle_new_user() の改修: 25 クレジット付与
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, plan_tier, monthly_credits, purchased_credits)
    VALUES (NEW.id, 'free', 25, 0)
    ON CONFLICT (id) DO UPDATE SET
        monthly_credits = GREATEST(public.profiles.monthly_credits, 25);

    -- 旧 users テーブルへの同期・フォールバック (存在する場合)
    BEGIN
        UPDATE public.users SET
            credits_balance = GREATEST(credits_balance, 25)
        WHERE id = NEW.id;
    EXCEPTION
        WHEN undefined_table THEN
            NULL;
    END;

    RETURN NEW;
END;
$$;

-- トリガーの再登録
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. 既存の free プランユーザーにも Welcome Bonus (最大25pts) を反映
DO $$
BEGIN
    UPDATE public.profiles
    SET monthly_credits = 25
    WHERE plan_tier = 'free' AND monthly_credits = 10;
EXCEPTION
    WHEN undefined_table THEN
        NULL;
END $$;
