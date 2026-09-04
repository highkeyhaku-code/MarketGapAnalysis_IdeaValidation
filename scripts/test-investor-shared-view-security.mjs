import assert from "node:assert/strict";

const BASE_URL = "http://localhost:3000";

console.log("================================================================================");
console.log("🛡️ SECURITY & QA SUITE: INVESTOR SHARED VIEW & ZERO-DATA-LEAKAGE MASKING");
console.log("================================================================================\n");

async function runSecurityTest() {
  // 1. 新規アイデア作成
  console.log("▶ [1]: Creating new project repository...");
  const createRes = await fetch(`${BASE_URL}/api/ideas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "【極秘案件】AI自動商談CRMハブ (Security Test)" }),
  });
  const createJson = await createRes.json();
  assert.equal(createJson.success, true, "Idea creation must succeed");
  const ideaId = createJson.idea.id;
  console.log("  Created Idea ID:", ideaId);

  // 2. 機密情報を含んだコミットを Secure by Default で送信
  console.log("\n▶ [2]: Committing hypothesis with confidential Q2 & Q3 (Secure by Default)...");
  const secretSolution = "【極秘コア技術】独自LLMと音声波形解析による0クリックCRM自動同期エンジン";
  const secretEdge = "【特許出願中】独自ゼロコンフィグ連携アルゴリズムにより導入工数をゼロにする";
  const publicPain = "中小企業の営業チームがCRM入力に毎日2時間浪費し商談機会を大幅に損失している。";

  const commitRes = await fetch(`${BASE_URL}/api/ideas/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ideaInput: {
        q1_target_pain: publicPain,
        q2_solution: secretSolution,
        q3_core_edge: secretEdge,
        q4_target_literacy: "intermediate",
        q4_monetization_model: "subscription",
        q4_supplementary_pains: [],
      },
      ideaId: ideaId,
      visibilityFlags: {
        q1_target_pain: true,   // 公開
        q2_solution: false,    // 🔒 非公開
        q3_core_edge: false,   // 🔒 非公開
        q4_supplementary_pains: true,
      },
      domain: "B2B_SME",
    }),
  });
  const commitJson = await commitRes.json();
  assert.equal(commitJson.success, true, "Commit creation must succeed");
  const commitId = commitJson.commitId;
  console.log("  Created Commit ID:", commitId);

  // リポジトリ情報を取得して share_token を確認
  const getIdeaRes = await fetch(`${BASE_URL}/api/ideas/${ideaId}`);
  const getIdeaJson = await getIdeaRes.json();
  const shareToken = getIdeaJson.idea.share_token || ideaId;
  console.log("  Share Token:", shareToken);
  console.log("  Initial is_public status:", getIdeaJson.idea.is_public);

  // 3. 非公開時のアクセス制限テスト (is_public = false)
  console.log("\n▶ [3]: Testing Access Control when is_public = false...");
  const privateShareRes = await fetch(`${BASE_URL}/api/share/${shareToken}`);
  console.log("  HTTP Status code for private project:", privateShareRes.status);
  assert.equal(privateShareRes.status, 404, "Private project must return 404/Access Denied");
  const privateJson = await privateShareRes.json();
  assert.equal(privateJson.success, false, "Private project response success must be false");
  console.log("  ✅ PASS: 非公開リポジトリへの外部アクセスは確実に遮断されました (404 Not Found)");

  // 4. 公開切り替え (is_public = true)
  console.log("\n▶ [4]: Updating project to public (PATCH /api/ideas/[id])...");
  const patchRes = await fetch(`${BASE_URL}/api/ideas/${ideaId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_public: true }),
  });
  const patchJson = await patchRes.json();
  assert.equal(patchJson.success, true, "PATCH is_public must succeed");
  console.log("  Project is now PUBLIC:", patchJson.is_public);

  // 5. 共有ビュー API の取得と動的データマスク検証
  console.log("\n▶ [5]: Querying GET /api/share/[share_token] & Testing Zero-Data-Leakage...");
  const shareRes = await fetch(`${BASE_URL}/api/share/${shareToken}`);
  assert.equal(shareRes.status, 200, "Public share endpoint must return 200 OK");
  const shareData = await shareRes.json();
  assert.equal(shareData.success, true, "Response must be success");

  const head = shareData.headCommit;
  console.log("  Returned Q1 (Target Pain):", head.q1_target_pain);
  console.log("  Returned Q2 (Solution):", head.q2_solution);
  console.log("  Returned Q3 (Core Edge):", head.q3_core_edge);

  // フィールドごとのアサーション
  assert.equal(head.q1_target_pain, publicPain, "Q1 should be fully visible");
  assert.equal(head.q2_solution, "[🔒 共同創業者向けに非公開：NDAの締結が必要です]", "Q2 MUST BE MASKED");
  assert.equal(head.q3_core_edge, "[🔒 共同創業者向けに非公開：NDAの締結が必要です]", "Q3 MUST BE MASKED");

  // ★ ゼロ・データ漏洩 (Zero Raw Leakage) セキュリティアサーション
  const rawResponseString = JSON.stringify(shareData);
  assert.equal(
    rawResponseString.includes("極秘コア技術"),
    false,
    "🚨 CRITICAL SECURITY FAULT: Raw secret text for Q2 leaked in response payload!"
  );
  assert.equal(
    rawResponseString.includes("特許出願中"),
    false,
    "🚨 CRITICAL SECURITY FAULT: Raw secret text for Q3 leaked in response payload!"
  );
  console.log("  🔒 ZERO RAW LEAKAGE: 秘密データ「極秘コア技術」「特許出願中」はネットワークレスポンス内に一切存在しません！");
  console.log("  ✅ PASS: サーバーサイド動的データマスクが完璧に機能しています");

  // 6. クリーンアップ
  console.log("\n▶ [6]: Cleaning up test repository...");
  const delRes = await fetch(`${BASE_URL}/api/ideas/${ideaId}`, { method: "DELETE" });
  const delJson = await delRes.json();
  assert.equal(delJson.success, true, "Delete must succeed");
  console.log("  ✅ PASS: テストデータのクリーンアップ完了");

  console.log("\n================================================================================");
  console.log("🏆 ALL INVESTOR SHARED VIEW & ZERO-DATA-LEAKAGE TESTS PASSED (100%)!");
  console.log("================================================================================\n");
}

runSecurityTest().catch((err) => {
  console.error("❌ Security Test Failed:", err);
  process.exit(1);
});
