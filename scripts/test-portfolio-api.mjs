// scripts/test-portfolio-api.mjs
import assert from "node:assert/strict";

console.log("================================================================================");
console.log("🧪 PORTFOLIO MODE API ROUTE (FOG OF WAR UNLOCK) AUDIT");
console.log("================================================================================\n");

// 環境変数セットアップ
process.env.NEXT_PUBLIC_PORTFOLIO_MODE = "true";

async function runApiAudit() {
  const { supabaseAdmin } = await import("../lib/supabaseClient.ts");
  const { GET: getMarketMap } = await import("../app/api/market/map/[genreId]/route.ts");
  const { NextRequest } = await import("next/server");

  // 1. 実在ジャンルの取得
  const { data: realGenres } = await supabaseAdmin.from("genres").select("id, canonical_name").limit(1);
  assert.ok(realGenres && realGenres.length > 0, "Requires at least 1 real genre in database");
  const testGenre = realGenres[0];
  console.log(`📋 Test Target Genre: ${testGenre.id} (${testGenre.canonical_name})`);

  // 2. unlocked=true なしでリクエスト (未アンロック状態)
  const reqLocked = new NextRequest(`http://localhost:3000/api/market/map/${testGenre.id}`);
  const resLocked = await getMarketMap(reqLocked, {
    params: Promise.resolve({ genreId: testGenre.id }),
  });
  const jsonLocked = await resLocked.json();
  assert.ok(jsonLocked.success, "Locked request must return success");
  assert.strictEqual(jsonLocked.isUnlocked, false, "Should be locked when no unlock param and guest");
  assert.strictEqual(jsonLocked.isLocked, true, "isLocked must be true");
  console.log("  ✓ GET /api/market/map/[genreId] correctly locked (Fog of War active)");

  // 3. unlocked=true を付与してリクエスト (ポートフォリオモード時のローカルアンロック)
  const reqUnlocked = new NextRequest(`http://localhost:3000/api/market/map/${testGenre.id}?unlocked=true`);
  const resUnlocked = await getMarketMap(reqUnlocked, {
    params: Promise.resolve({ genreId: testGenre.id }),
  });
  const jsonUnlocked = await resUnlocked.json();
  assert.ok(jsonUnlocked.success, "Unlocked request must return success");
  assert.strictEqual(jsonUnlocked.isUnlocked, true, "Should be isUnlocked: true via portfolio mode unlock");
  assert.strictEqual(jsonUnlocked.isLocked, false, "isLocked must be false");
  assert.ok(jsonUnlocked.mapData, "Must return mapData");
  assert.ok(Array.isArray(jsonUnlocked.mapData.companies), "Companies must be returned");
  console.log("  ✓ GET /api/market/map/[genreId]?unlocked=true correctly unlocked with full topological lattice");

  // 4. ポートフォリオモード無効時の挙動 (本番環境の安全性検証)
  process.env.NEXT_PUBLIC_PORTFOLIO_MODE = "false";
  const reqTampered = new NextRequest(`http://localhost:3000/api/market/map/${testGenre.id}?unlocked=true`);
  const resTampered = await getMarketMap(reqTampered, {
    params: Promise.resolve({ genreId: testGenre.id }),
  });
  const jsonTampered = await resTampered.json();
  assert.ok(jsonTampered.success);
  assert.strictEqual(jsonTampered.isUnlocked, false, "When PORTFOLIO_MODE=false, ?unlocked=true must be completely ignored!");
  assert.strictEqual(jsonTampered.isLocked, true, "Security check: must remain locked in production mode");
  console.log("  ✓ Production Security Verified: ?unlocked=true is strictly ignored when PORTFOLIO_MODE is not true");

  console.log("\n================================================================================");
  console.log("🎉 ALL PORTFOLIO API AUDITS PASSED SUCCESSFULLY!");
  console.log("================================================================================");
}

runApiAudit().catch((err) => {
  console.error("❌ API Audit failed:", err);
  process.exit(1);
});
