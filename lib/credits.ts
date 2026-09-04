import { supabaseAdmin } from "./supabaseClient";
import { Database } from "../types/database";

type ProfilesUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type PlanTier = "free" | "starter" | "founder" | "studio" | "pro";

export interface UserCreditsProfile {
  id: string;
  stripe_customer_id: string | null;
  plan_tier: PlanTier;
  monthly_credits: number;
  purchased_credits: number;
  total_credits: number;
}

export const PLAN_TIER_MONTHLY_CREDITS: Record<PlanTier, number> = {
  free: 25, // ゲスト10 + 初回ボーナス15 = 25 pts
  starter: 50, // $5 / 月
  founder: 200, // $19 / 月 (Most Popular)
  studio: 600, // $49 / 月 (Agency & Power Team)
  pro: 200, // 下位互換用エイリアス
};

// profiles 未作成環境のためのフォールバックストア (プロセス内フェイルソフト)
const memoryProfilesStore = new Map<string, UserCreditsProfile>();

/**
 * ユーザーのハイブリッド課金プロファイル (Wallet) をセットアップ
 */
export async function setUserCreditsProfile(
  userId: string,
  profile: Partial<UserCreditsProfile>
): Promise<UserCreditsProfile> {
  const current = await getUserCreditsProfile(userId);
  const updated: UserCreditsProfile = {
    ...current,
    ...profile,
    plan_tier: profile.plan_tier || current.plan_tier,
    monthly_credits: profile.monthly_credits !== undefined ? profile.monthly_credits : current.monthly_credits,
    purchased_credits: profile.purchased_credits !== undefined ? profile.purchased_credits : current.purchased_credits,
    total_credits: 0,
  };
  updated.total_credits = updated.monthly_credits + updated.purchased_credits;

  memoryProfilesStore.set(userId, updated);

  try {
    const { error } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        plan_tier: updated.plan_tier,
        monthly_credits: updated.monthly_credits,
        purchased_credits: updated.purchased_credits,
        stripe_customer_id: updated.stripe_customer_id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (!error) {
      return updated;
    }
  } catch (_e) {}

  // users テーブルフォールバック
  try {
    await supabaseAdmin
      .from("users")
      .update({
        credits_balance: updated.total_credits,
        plan_tier: updated.plan_tier,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  } catch (_e) {}

  return updated;
}

/**
 * ユーザーのハイブリッド課金プロファイル (Wallet) を取得
 * profiles テーブルを優先し、未作成の場合は自動初期化、さらに users テーブルとの下位互換を維持
 */
export async function getUserCreditsProfile(userId: string): Promise<UserCreditsProfile> {
  // 1. profiles テーブルから取得試行
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error && data) {
      const p: UserCreditsProfile = {
        id: data.id,
        stripe_customer_id: data.stripe_customer_id,
        plan_tier: (data.plan_tier as PlanTier) || "free",
        monthly_credits: data.monthly_credits,
        purchased_credits: data.purchased_credits,
        total_credits: data.monthly_credits + data.purchased_credits,
      };
      memoryProfilesStore.set(userId, p);
      return p;
    }

    // レコードが未作成の場合、自動作成を試みる
    if (error && error.code === "PGRST116") {
      const initialProfile = {
        id: userId,
        plan_tier: "free" as const,
        monthly_credits: PLAN_TIER_MONTHLY_CREDITS.free,
        purchased_credits: 0,
      };
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("profiles")
        .insert(initialProfile)
        .select()
        .single();

      if (!insertErr && inserted) {
        const p: UserCreditsProfile = {
          id: inserted.id,
          stripe_customer_id: inserted.stripe_customer_id,
          plan_tier: (inserted.plan_tier as PlanTier) || "free",
          monthly_credits: inserted.monthly_credits,
          purchased_credits: inserted.purchased_credits,
          total_credits: inserted.monthly_credits + inserted.purchased_credits,
        };
        memoryProfilesStore.set(userId, p);
        return p;
      }
    }
  } catch (_e) {
    // profiles テーブル自体が存在しない場合などのフェイルソフト
  }

  // 2. メモリストアにハイブリッド内訳があればそれを返却
  const mem = memoryProfilesStore.get(userId);
  if (mem) {
    if (mem.plan_tier === "free") {
      mem.monthly_credits = Math.min(mem.monthly_credits, PLAN_TIER_MONTHLY_CREDITS.free);
      mem.total_credits = mem.monthly_credits + mem.purchased_credits;
    }
    return mem;
  }

  // 3. 旧 users テーブルへのフォールバック (単一残高から初期化)
  try {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id, credits_balance, plan_tier")
      .eq("id", userId)
      .single();

    const tier = (userRow?.plan_tier as PlanTier) || "free";
    // Freeプランの場合は最大25pts (PLAN_TIER_MONTHLY_CREDITS.free) に正規化
    const rawBalance = userRow?.credits_balance ?? PLAN_TIER_MONTHLY_CREDITS.free;
    const balance = tier === "free" ? Math.min(rawBalance, PLAN_TIER_MONTHLY_CREDITS.free) : rawBalance;

    const p: UserCreditsProfile = {
      id: userId,
      stripe_customer_id: null,
      plan_tier: tier,
      monthly_credits: balance,
      purchased_credits: 0,
      total_credits: balance,
    };
    memoryProfilesStore.set(userId, p);
    return p;
  } catch (_e) {
    return {
      id: userId,
      stripe_customer_id: null,
      plan_tier: "free",
      monthly_credits: PLAN_TIER_MONTHLY_CREDITS.free,
      purchased_credits: 0,
      total_credits: PLAN_TIER_MONTHLY_CREDITS.free,
    };
  }
}

/**
 * ハイブリッドクレジットの減算処理
 * 仕様: 「monthly_credits を優先消費し、足りなければ purchased_credits から減算する」
 */
export async function deductCredits(
  userId: string,
  amount: number
): Promise<{
  success: boolean;
  error?: string;
  remaining?: { monthly: number; purchased: number; total: number };
}> {
  if (amount <= 0) {
    const p = await getUserCreditsProfile(userId);
    return { success: true, remaining: { monthly: p.monthly_credits, purchased: p.purchased_credits, total: p.total_credits } };
  }

  // 1. profiles テーブルでの優先減算
  try {
    const { data: profile, error: fetchErr } = await supabaseAdmin
      .from("profiles")
      .select("monthly_credits, purchased_credits")
      .eq("id", userId)
      .single();

    if (!fetchErr && profile) {
      let monthly = profile.monthly_credits;
      let purchased = profile.purchased_credits;
      const total = monthly + purchased;

      if (total < amount) {
        return {
          success: false,
          error: `Insufficient credits. Required: ${amount}, available: ${total}`,
          remaining: { monthly, purchased, total },
        };
      }

      // monthly_credits を優先消費
      if (monthly >= amount) {
        monthly -= amount;
      } else {
        const needed = amount - monthly;
        monthly = 0;
        purchased -= needed;
      }

      const { error: updateErr } = await supabaseAdmin
        .from("profiles")
        .update({
          monthly_credits: monthly,
          purchased_credits: purchased,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateErr) {
        return { success: false, error: updateErr.message };
      }

      return {
        success: true,
        remaining: { monthly, purchased, total: monthly + purchased },
      };
    }
  } catch (_e) {}

  // 2. メモリストアまたは users テーブルへのフォールバック減算
  const memProfile = memoryProfilesStore.get(userId);
  if (memProfile) {
    let monthly = memProfile.monthly_credits;
    let purchased = memProfile.purchased_credits;
    const total = monthly + purchased;

    if (total < amount) {
      return {
        success: false,
        error: `Insufficient credits. Required: ${amount}, available: ${total}`,
        remaining: { monthly, purchased, total },
      };
    }

    if (monthly >= amount) {
      monthly -= amount;
    } else {
      const needed = amount - monthly;
      monthly = 0;
      purchased -= needed;
    }

    memProfile.monthly_credits = monthly;
    memProfile.purchased_credits = purchased;
    memProfile.total_credits = monthly + purchased;
    memoryProfilesStore.set(userId, memProfile);

    // users テーブルにも残高同期
    try {
      await supabaseAdmin
        .from("users")
        .update({ credits_balance: memProfile.total_credits, updated_at: new Date().toISOString() })
        .eq("id", userId);
    } catch (_e) {}

    return {
      success: true,
      remaining: { monthly, purchased, total: monthly + purchased },
    };
  }

  // 3. users テーブルのみへのフォールバック減算
  try {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("credits_balance")
      .eq("id", userId)
      .single();

    const currentBalance = userRow?.credits_balance ?? 0;
    if (currentBalance < amount) {
      return {
        success: false,
        error: `Insufficient credits. Required: ${amount}, available: ${currentBalance}`,
        remaining: { monthly: currentBalance, purchased: 0, total: currentBalance },
      };
    }

    const newBalance = currentBalance - amount;
    await supabaseAdmin
      .from("users")
      .update({ credits_balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", userId);

    return {
      success: true,
      remaining: { monthly: newBalance, purchased: 0, total: newBalance },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 買い切りクレジットの追加 (Stripe checkout.session.completed 等)
 * purchased_credits に加算
 */
export async function addPurchasedCredits(
  userId: string,
  addedCredits: number,
  stripeCustomerId?: string
): Promise<{ success: boolean; newPurchased: number; total: number; error?: string }> {
  try {
    const profile = await getUserCreditsProfile(userId);
    const newPurchased = profile.purchased_credits + addedCredits;

    const updatePayload: ProfilesUpdate = {
      purchased_credits: newPurchased,
      updated_at: new Date().toISOString(),
    };
    if (stripeCustomerId) {
      updatePayload.stripe_customer_id = stripeCustomerId;
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId);

    if (error) {
      // profiles がない場合は users に加算
      await supabaseAdmin
        .from("users")
        .update({
          credits_balance: profile.total_credits + addedCredits,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }

    return {
      success: true,
      newPurchased,
      total: profile.monthly_credits + newPurchased,
    };
  } catch (err: any) {
    return { success: false, newPurchased: 0, total: 0, error: err.message };
  }
}

const stripeCustomerToUserMap = new Map<string, string>();

/**
 * サブスクリプション月次更新 (Stripe invoice.payment_succeeded 等)
 * monthly_credits をプラン規定枠にリセット（purchased_credits は維持）
 */
export async function resetMonthlyCredits(
  userId: string,
  tierCredits: number,
  planTier?: PlanTier,
  stripeCustomerId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (stripeCustomerId) {
      stripeCustomerToUserMap.set(stripeCustomerId, userId);
    }

    const current = await getUserCreditsProfile(userId);
    const updated: UserCreditsProfile = {
      ...current,
      plan_tier: planTier || current.plan_tier,
      monthly_credits: tierCredits,
      stripe_customer_id: stripeCustomerId || current.stripe_customer_id,
      total_credits: tierCredits + current.purchased_credits,
    };
    memoryProfilesStore.set(userId, updated);

    const updatePayload: ProfilesUpdate = {
      monthly_credits: tierCredits,
      updated_at: new Date().toISOString(),
    };
    if (planTier) {
      updatePayload.plan_tier = planTier;
    }
    if (stripeCustomerId) {
      updatePayload.stripe_customer_id = stripeCustomerId;
    }

    await supabaseAdmin
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId);

    // users テーブルにも plan_tier とクレジットを必ず同期
    await supabaseAdmin
      .from("users")
      .update({
        credits_balance: tierCredits,
        plan_tier: planTier || "free",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * サブスクリプション解約 / free へのダウングレード (資産・アンロック市場は保持)
 */
export async function downgradeSubscriptionByCustomerId(stripeCustomerId: string): Promise<boolean> {
  // 1. stripeCustomerToUserMap から userId を特定
  const mappedUserId = stripeCustomerToUserMap.get(stripeCustomerId);
  if (mappedUserId) {
    const mem = memoryProfilesStore.get(mappedUserId);
    if (mem) {
      mem.plan_tier = "free";
      mem.monthly_credits = PLAN_TIER_MONTHLY_CREDITS.free;
      mem.total_credits = mem.monthly_credits + mem.purchased_credits;
      memoryProfilesStore.set(mappedUserId, mem);
    }
    try {
      await supabaseAdmin
        .from("users")
        .update({
          plan_tier: "free",
          credits_balance: PLAN_TIER_MONTHLY_CREDITS.free,
          updated_at: new Date().toISOString(),
        })
        .eq("id", mappedUserId);
    } catch (_u) {}
  }

  // 2. profiles 更新
  try {
    const { data: updatedProfiles } = await supabaseAdmin
      .from("profiles")
      .update({
        plan_tier: "free",
        monthly_credits: PLAN_TIER_MONTHLY_CREDITS.free,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_customer_id", stripeCustomerId)
      .select("id");

    if (updatedProfiles && updatedProfiles.length > 0) {
      for (const p of updatedProfiles) {
        const mem = memoryProfilesStore.get(p.id);
        if (mem) {
          mem.plan_tier = "free";
          mem.monthly_credits = PLAN_TIER_MONTHLY_CREDITS.free;
          mem.total_credits = mem.monthly_credits + mem.purchased_credits;
          memoryProfilesStore.set(p.id, mem);
        }
      }
      return true;
    }
  } catch (_e) {}

  // 3. memoryProfilesStore フォールバック
  for (const [userId, profile] of memoryProfilesStore.entries()) {
    if (profile.stripe_customer_id === stripeCustomerId) {
      profile.plan_tier = "free";
      memoryProfilesStore.set(userId, profile);
      try {
        await supabaseAdmin
          .from("users")
          .update({
            plan_tier: "free",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      } catch (_u) {}
      return true;
    }
  }

  return true;
}

// user_unlocked_markets 未作成環境のためのフォールバックストア (user_id -> Set<genre_id>)
const memoryUnlockedMarkets = new Map<string, Set<string>>();

/**
 * 市場アンロック (ダウングレード時の資産維持用)
 */
export async function unlockMarket(userId: string, genreId: string): Promise<boolean> {
  // メモリストアに記録 (フェイルソフト)
  if (!memoryUnlockedMarkets.has(userId)) {
    memoryUnlockedMarkets.set(userId, new Set());
  }
  memoryUnlockedMarkets.get(userId)!.add(genreId);

  try {
    const { error } = await supabaseAdmin
      .from("user_unlocked_markets")
      .upsert({
        user_id: userId,
        genre_id: genreId,
        unlocked_at: new Date().toISOString(),
      }, { onConflict: "user_id,genre_id" });

    return true;
  } catch (_e) {
    return true;
  }
}

/**
 * 市場が既にアンロックされているか判定
 */
export async function isMarketUnlocked(userId: string, genreId: string): Promise<boolean> {
  // メモリストアの確認
  if (memoryUnlockedMarkets.get(userId)?.has(genreId)) {
    return true;
  }

  try {
    const { data } = await supabaseAdmin
      .from("user_unlocked_markets")
      .select("id")
      .eq("user_id", userId)
      .eq("genre_id", genreId)
      .single();

    return !!data;
  } catch (_e) {
    return false;
  }
}

/**
 * ユーザーがアンロックした全市場リストを取得
 */
export async function getUnlockedMarketsList(userId: string): Promise<Array<{ genre_id: string; unlocked_at: string }>> {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_unlocked_markets")
      .select("genre_id, unlocked_at")
      .eq("user_id", userId);

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (_e) {}

  const memSet = memoryUnlockedMarkets.get(userId);
  if (memSet && memSet.size > 0) {
    return Array.from(memSet).map((genre_id) => ({
      genre_id,
      unlocked_at: new Date().toISOString(),
    }));
  }

  return [];
}
