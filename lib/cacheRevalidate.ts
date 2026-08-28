import { supabaseAdmin, getDefaultOrAuthUserId } from "./supabaseClient";

export interface CacheRevalidateResult {
  success: boolean;
  message: string;
  creditsDeducted?: number;
  error?: string;
}

/**
 * 5.3 クレジット消費型キャッシュパージ (manual_cache_revalidate RPC)
 * ユーザーが最新情報を取得するために意図的にキャッシュを破棄する場合、
 * 2クレジットを消費して Layer 0 (market_cache) のレコードを削除する。
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

    // 1. Supabase RPC manual_cache_revalidate を呼び出し
    const { data: isSuccess, error: rpcError } = await supabaseAdmin.rpc(
      "manual_cache_revalidate",
      {
        p_user_id: userId,
        p_genre_id: genreId,
      }
    );

    if (rpcError) {
      console.error("[executeManualCacheRevalidate] RPC Error:", rpcError);
      // RPCが未デプロイまたはエラー時のフォールバック処理 (ユーザー残高確認と直接DELETE)
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("credits_balance")
        .eq("id", userId)
        .single();

      const balance = userData?.credits_balance ?? 10;
      if (balance < 2) {
        return {
          success: false,
          message: "クレジット残高が不足しています（最低2クレジット必要）",
          error: "INSUFFICIENT_CREDITS",
        };
      }

      // クレジット消費 & キャッシュ削除
      await Promise.all([
        supabaseAdmin
          .from("users")
          .update({ credits_balance: balance - 2 })
          .eq("id", userId),
        supabaseAdmin.from("market_cache").delete().eq("genre_id", genreId),
      ]);

      return {
        success: true,
        message: "キャッシュを強制破棄しました（2クレジット消費）",
        creditsDeducted: 2,
      };
    }

    if (!isSuccess) {
      return {
        success: false,
        message: "クレジット残高が不足しているか、無効なジャンルIDです（最低2クレジット必要）",
        error: "INSUFFICIENT_CREDITS",
      };
    }

    return {
      success: true,
      message: "キャッシュを強制破棄しました（2クレジット消費）",
      creditsDeducted: 2,
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
