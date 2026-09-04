import { supabaseAdmin, getDefaultOrAuthUserId } from "./supabaseClient";
import { deductCredits, unlockMarket } from "./credits";

export interface CacheRevalidateResult {
  success: boolean;
  message: string;
  creditsDeducted?: number;
  error?: string;
  remainingCredits?: { monthly: number; purchased: number; total: number };
}

/**
 * 5.3 クレジット消費型キャッシュパージ (manual_cache_revalidate RPC)
 * ユーザーが最新情報を取得するために意図的にキャッシュを破棄する場合、
 * ペナルティとして「3クレジット」を消費して Layer 0 (market_cache) のレコードを削除する。
 * ハイブリッド課金仕様: monthly_credits を優先消費し、不足分を purchased_credits から減算。
 *
 * @param genreId - 対象ジャンルID (UUID)
 * @param providedUserId - 実行ユーザーID (オプション)
 * @returns CacheRevalidateResult
 */
export async function executeManualCacheRevalidate(
  genreId: string,
  providedUserId?: string
): Promise<CacheRevalidateResult> {
  try {
    const userId = await getDefaultOrAuthUserId(providedUserId);

    // 1. ハイブリッドウォレットからの 3 クレジット優先減算 (monthly優先、不足分purchased)
    const deductResult = await deductCredits(userId, 3);
    if (!deductResult.success) {
      return {
        success: false,
        message: "クレジット残高が不足しています（最低3クレジット必要）",
        error: "INSUFFICIENT_CREDITS",
        remainingCredits: deductResult.remaining,
      };
    }

    // 2. market_cache の該当レコードを強制パージ & 市場アンロック
    await Promise.all([
      supabaseAdmin.from("market_cache").delete().eq("genre_id", genreId),
      unlockMarket(userId, genreId),
    ]);

    return {
      success: true,
      message: "キャッシュを強制破棄しました（3クレジット消費）",
      creditsDeducted: 3,
      remainingCredits: deductResult.remaining,
    };
  } catch (err: any) {
    console.error("[executeManualCacheRevalidate] Exception:", err);
    return {
      success: false,
      message: err.message || "Failed to revalidate cache",
      error: err.message,
    };
  }
}
