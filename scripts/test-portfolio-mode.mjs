// scripts/test-portfolio-mode.mjs
import assert from "node:assert/strict";

console.log("================================================================================");
console.log("🧪 PORTFOLIO MODE (DEMO MODE) VERIFICATION SUITE");
console.log("================================================================================\n");

// 1. 環境変数のテストセットアップ
process.env.NEXT_PUBLIC_PORTFOLIO_MODE = "true";

// モック用の簡易 localStorage 実装 (Node.js環境用)
const localStorageStore = new Map();
global.localStorage = {
  getItem: (key) => localStorageStore.get(key) || null,
  setItem: (key, value) => localStorageStore.set(key, String(value)),
  removeItem: (key) => localStorageStore.delete(key),
  clear: () => localStorageStore.clear(),
};
global.window = {};

async function runPortfolioTests() {
  // 1. ヘルパー関数の動作検証
  console.log("--------------------------------------------------------------------------------");
  console.log("▶ [TEST 1]: Portfolio Mode Helper & Storage Isolation");
  console.log("--------------------------------------------------------------------------------");
  const {
    isPortfolioMode,
    isLocalMarketUnlocked,
    addLocalUnlockedMarket,
    getLocalUnlockedMarkets,
    saveLocalBillingProfile,
    getLocalBillingProfile,
  } = await import("../lib/portfolio.ts");

  assert.strictEqual(isPortfolioMode(), true, "isPortfolioMode() must be true when NEXT_PUBLIC_PORTFOLIO_MODE=true");
  console.log("  ✓ isPortfolioMode() returned true");

  assert.strictEqual(isLocalMarketUnlocked("genre-test-1"), false, "genre-test-1 should not be unlocked yet");
  addLocalUnlockedMarket("genre-test-1");
  assert.strictEqual(isLocalMarketUnlocked("genre-test-1"), true, "genre-test-1 must be unlocked locally");
  assert.deepStrictEqual(getLocalUnlockedMarkets(), ["genre-test-1"], "unlocked markets list must contain genre-test-1");
  console.log("  ✓ LocalStorage Fog of War unlocked markets list verified");

  saveLocalBillingProfile({
    planTier: "founder",
    monthlyCredits: 200,
    purchasedCredits: 30,
    totalCredits: 230,
  });
  const savedProfile = getLocalBillingProfile();
  assert.deepStrictEqual(savedProfile, {
    planTier: "founder",
    monthlyCredits: 200,
    purchasedCredits: 30,
    totalCredits: 230,
  }, "Local billing profile must persist to localStorage");
  console.log("  ✓ LocalStorage Billing profile persistence verified");

  // 2. Auth Wall 無効化と完全ゲスト動作
  console.log("\n--------------------------------------------------------------------------------");
  console.log("▶ [TEST 2]: Auth Wall Bypass & Complete Guest Session");
  console.log("--------------------------------------------------------------------------------");
  const { sessionStore } = await import("../hooks/useUserSession.ts");

  // 初期状態
  sessionStore.setState({ showAuthWall: false, showMigrationModal: false, user: null });
  assert.strictEqual(sessionStore.getState().showAuthWall, false, "Initial showAuthWall must be false");

  // openAuthWall() 呼び出し -> ポートフォリオモードなので false のまま
  sessionStore.getState().openAuthWall();
  assert.strictEqual(sessionStore.getState().showAuthWall, false, "openAuthWall() must NOT open modal in portfolio mode");
  console.log("  ✓ openAuthWall() successfully bypassed (modal never opens)");

  // openMigrationModal() 呼び出し -> ポートフォリオモードなので false のまま
  sessionStore.getState().openMigrationModal();
  assert.strictEqual(sessionStore.getState().showMigrationModal, false, "openMigrationModal() must NOT open modal in portfolio mode");
  console.log("  ✓ openMigrationModal() successfully bypassed");

  // 3. Pricing Modal 擬似決済 (Zustand useBillingStore)
  console.log("\n--------------------------------------------------------------------------------");
  console.log("▶ [TEST 3]: Pricing Modal Mock Checkout & Credit Accumulation");
  console.log("--------------------------------------------------------------------------------");
  const { useBillingStore } = await import("../lib/store/useBillingStore.ts");

  // ローカルストレージをクリアして初期化
  localStorage.clear();
  await useBillingStore.getState().fetchCredits();

  assert.strictEqual(useBillingStore.getState().planTier, "free");
  assert.strictEqual(useBillingStore.getState().monthlyCredits, 25);
  assert.strictEqual(useBillingStore.getState().purchasedCredits, 0);
  assert.strictEqual(useBillingStore.getState().totalCredits, 25);
  console.log("  ✓ Initial guest credits: 25 pts (free tier)");

  // 買い切りクレジット追加パック (+30 pts) の擬似決済
  const currentPurchased = useBillingStore.getState().purchasedCredits;
  useBillingStore.getState().updateLocalCredits({
    purchasedCredits: currentPurchased + 30,
  });
  assert.strictEqual(useBillingStore.getState().purchasedCredits, 30, "purchasedCredits must be 30");
  assert.strictEqual(useBillingStore.getState().totalCredits, 55, "totalCredits must be 25 + 30 = 55");
  console.log("  ✓ Mock purchase (+30 pts) succeeded: totalCredits = 55 pts");

  // サブスクリプションアップグレード (Founder プラン: 200 pts/月) の擬似決済
  useBillingStore.getState().updateLocalCredits({
    planTier: "founder",
    monthlyCredits: 200,
  });
  assert.strictEqual(useBillingStore.getState().planTier, "founder", "planTier must be founder");
  assert.strictEqual(useBillingStore.getState().monthlyCredits, 200, "monthlyCredits must be 200");
  assert.strictEqual(useBillingStore.getState().purchasedCredits, 30, "purchasedCredits must remain 30");
  assert.strictEqual(useBillingStore.getState().totalCredits, 230, "totalCredits must be 200 + 30 = 230");
  console.log("  ✓ Mock subscription upgrade (Founder: 200 pts) succeeded: totalCredits = 230 pts");

  // fetchCredits() を再実行しても LocalStorage から復元されて維持されることを確認
  await useBillingStore.getState().fetchCredits();
  assert.strictEqual(useBillingStore.getState().planTier, "founder", "planTier must stay founder after fetchCredits");
  assert.strictEqual(useBillingStore.getState().totalCredits, 230, "totalCredits must stay 230 after fetchCredits");
  console.log("  ✓ Billing state persisted and rehydrated from localStorage successfully");

  // 4. 未踏市場アンロック (Fog of War) のローカル 1pt 消費
  console.log("\n--------------------------------------------------------------------------------");
  console.log("▶ [TEST 4]: Fog of War Local Unlock & 1pt Consumption");
  console.log("--------------------------------------------------------------------------------");
  const testSector = "crater-market-alpha";
  assert.strictEqual(isLocalMarketUnlocked(testSector), false, "Sector must be initially locked");

  // 1pt 消費シミュレーション
  const beforeMonthly = useBillingStore.getState().monthlyCredits;
  const beforeTotal = useBillingStore.getState().totalCredits;

  useBillingStore.getState().updateLocalCredits({
    monthlyCredits: beforeMonthly - 1,
  });
  addLocalUnlockedMarket(testSector);

  assert.strictEqual(useBillingStore.getState().monthlyCredits, beforeMonthly - 1, "monthlyCredits must decrease by 1");
  assert.strictEqual(useBillingStore.getState().totalCredits, beforeTotal - 1, "totalCredits must decrease by 1");
  assert.strictEqual(isLocalMarketUnlocked(testSector), true, "Sector must now be marked as unlocked in LocalStorage");
  console.log(`  ✓ Unlocked ${testSector} locally with 1 pt consumed (Balance: ${useBillingStore.getState().totalCredits} pts)`);

  console.log("\n================================================================================");
  console.log("🎉 ALL PORTFOLIO MODE UNIT & STORE TESTS PASSED SUCCESSFULLY!");
  console.log("================================================================================");
}

runPortfolioTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
