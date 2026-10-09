/**
 * ポートフォリオモード（デモモード）管理ユーティリティ
 * 
 * 環境変数 NEXT_PUBLIC_PORTFOLIO_MODE=true の場合のみ有効化されます。
 * 採用担当者や一般ユーザーがログイン不要（完全ゲスト）で
 * 全機能を安全かつ自由に体験できるように、ローカルストレージベースの
 * 権限管理とモック決済フォールバックを提供します。
 */

export const isPortfolioMode = (): boolean => {
  return process.env.NEXT_PUBLIC_PORTFOLIO_MODE === "true";
};

const UNLOCKED_MARKETS_STORAGE_KEY = "portfolio_unlocked_markets";
const BILLING_STORAGE_KEY = "portfolio_billing_profile";

/**
 * ローカルストレージに保存されたアンロック済み市場 genreId 一覧を取得
 */
export function getLocalUnlockedMarkets(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(UNLOCKED_MARKETS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("[portfolio] Failed to read local unlocked markets:", err);
    return [];
  }
}

/**
 * 特定のジャンルがローカルでアンロック済みか判定
 */
export function isLocalMarketUnlocked(genreId: string): boolean {
  if (!genreId) return false;
  const markets = getLocalUnlockedMarkets();
  return markets.includes(genreId);
}

/**
 * 特定のジャンルをローカルストレージ上でアンロック済みとして記録
 */
export function addLocalUnlockedMarket(genreId: string): void {
  if (typeof window === "undefined" || !genreId) return;
  try {
    const markets = getLocalUnlockedMarkets();
    if (!markets.includes(genreId)) {
      markets.push(genreId);
      localStorage.setItem(UNLOCKED_MARKETS_STORAGE_KEY, JSON.stringify(markets));
    }
  } catch (err) {
    console.warn("[portfolio] Failed to save local unlocked market:", err);
  }
}

export interface LocalBillingProfile {
  planTier: "free" | "starter" | "founder" | "studio" | "pro";
  monthlyCredits: number;
  purchasedCredits: number;
  totalCredits: number;
}

/**
 * ポートフォリオモード用のローカル課金・クレジットプロファイルを取得
 */
export function getLocalBillingProfile(): LocalBillingProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BILLING_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalBillingProfile;
  } catch (err) {
    console.warn("[portfolio] Failed to read local billing profile:", err);
    return null;
  }
}

/**
 * ポートフォリオモード用のローカル課金・クレジットプロファイルを保存
 */
export function saveLocalBillingProfile(profile: LocalBillingProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.warn("[portfolio] Failed to save local billing profile:", err);
  }
}
