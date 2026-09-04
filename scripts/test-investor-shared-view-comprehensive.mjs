import assert from "node:assert/strict";

const BASE_URL = "http://localhost:3000";

console.log("================================================================================");
console.log("🔬 COMPREHENSIVE QA: INVESTOR SHARED VIEW PITCH DECK & TOGGLE DYNAMICS");
console.log("================================================================================\n");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runComprehensiveTest() {
  // 1. 新規アイデア作成
  console.log("▶ [1]: Creating Idea with custom visibility toggles...");
  const createRes = await fetch(`${BASE_URL}/api/ideas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "マルチモーダルAI営業議事録アシスタント (Pitch Deck Test)" }),
  });
  const createJson = await createRes.json();
  assert.equal(createJson.success, true);
  const ideaId = createJson.idea.id;

  // 2. コミット作成 (Q1=公開, Q2=公開, Q3=非公開, Q4=公開)
  console.log("▶ [2]: Committing with Q1=Public, Q2=Public, Q3=Confidential (Toggled)...");
  const painText = "営業担当者が毎日2時間かけて手動で議事録とCRMを入力し商談に集中できない。";
  const solutionText = "Zoom/Meetの商談音声をリアルタイム解析してCRMに自動マッピングするAIアシスタント。";
  const edgeText = "【極秘アルゴリズム】独自特許出願中の超低遅延ストリーミングパーサー技術。";

  const commitRes = await fetch(`${BASE_URL}/api/ideas/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ideaInput: {
        q1_target_pain: painText,
        q2_solution: solutionText,
        q3_core_edge: edgeText,
        q4_target_literacy: "intermediate",
        q4_monetization_model: "subscription",
        q4_supplementary_pains: [],
      },
      ideaId: ideaId,
      visibilityFlags: {
        q1_target_pain: true,   // 👁️ 公開
        q2_solution: true,      // 👁️ 公開 (トグルでユーザーが公開に変更)
        q3_core_edge: false,    // 🔒 非公開
        q4_supplementary_pains: true,
      },
      domain: "B2B_SME",
    }),
  });
  const commitJson = await commitRes.json();
  assert.equal(commitJson.success, true);
  const commitId = commitJson.commitId;
  const jobId = commitJson.jobId;

  // 3. Inngest 検証ジョブの完了を待機
  console.log("▶ [3]: Waiting for Inngest validation crash job to finish...");
  let isDone = false;
  let count = 0;
  while (!isDone && count < 60) {
    count++;
    await delay(1500);
    const statusRes = await fetch(`${BASE_URL}/api/market/status/${jobId}`);
    const statusJson = await statusRes.json();
    if (statusJson.success && statusJson.job) {
      if (statusJson.job.percentage >= 100 || statusJson.job.status.toUpperCase() === "COMPLETED") {
        isDone = true;
        console.log(`  [Poll #${count}] (100%) - COMPLETED`);
        break;
      }
    }
  }
  assert.equal(isDone, true, "Job must complete");

  // 4. 公開設定を ON にする
  console.log("▶ [4]: Enabling Public Sharing (PATCH /api/ideas/[id])...");
  const patchRes = await fetch(`${BASE_URL}/api/ideas/${ideaId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_public: true }),
  });
  const patchJson = await patchRes.json();
  assert.equal(patchJson.success, true);

  // 5. 投資家向け共有ビュー API からリッチデータを検証
  console.log("▶ [5]: Querying /api/share/[share_token] for Rich Pitch Deck Data...");
  const shareRes = await fetch(`${BASE_URL}/api/share/${ideaId}`);
  assert.equal(shareRes.status, 200);
  const shareData = await shareRes.json();
  assert.equal(shareData.success, true);

  const head = shareData.headCommit;
  console.log("  Project Title:", shareData.idea.title);
  console.log("  Emotional Score:", head.emotional_score);
  console.log("  Q1 (Target Pain):", head.q1_target_pain);
  console.log("  Q2 (Solution):", head.q2_solution);
  console.log("  Q3 (Core Edge):", head.q3_core_edge);

  // アサーション
  assert.equal(head.q1_target_pain, painText, "Q1 should be visible");
  assert.equal(head.q2_solution, solutionText, "Q2 was toggled to public, so it should be visible");
  assert.equal(head.q3_core_edge, "[🔒 共同創業者向けに非公開：NDAの締結が必要です]", "Q3 MUST be masked");
  assert.equal(JSON.stringify(shareData).includes("極秘アルゴリズム"), false, "No secret leakage in JSON!");

  // 客観的検証データが存在することの確認
  assert.ok(head.scores, "scores must be present");
  assert.ok(head.competitorProfile, "competitorProfile must be present");
  console.log("  Competitor Nemesis:", head.competitorProfile.incumbentName || "Leader");
  console.log("  Nutrition Metrics:", head.scores.nutritionMetrics || "OK");

  // 6. クリーンアップ
  console.log("▶ [6]: Cleaning up...");
  await fetch(`${BASE_URL}/api/ideas/${ideaId}`, { method: "DELETE" });
  console.log("  ✅ PASS: Cleanup completed");

  console.log("\n================================================================================");
  console.log("🎉 ALL COMPREHENSIVE PITCH DECK & TOGGLE DYNAMICS TESTS PASSED (100%)!");
  console.log("================================================================================\n");
}

runComprehensiveTest().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
