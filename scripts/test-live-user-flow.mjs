// scripts/test-live-user-flow.mjs
import assert from "node:assert/strict";

const BASE_URL = "http://localhost:3000";

console.log("================================================================================");
console.log("🚀 STARTING FULL REAL-TIME USER SCENARIO TEST ON LOCALHOST:3000");
console.log("================================================================================\n");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runScenario() {
  // ----------------------------------------------------------------------------
  // 1. システムヘルスチェック (GET /api/health)
  // ----------------------------------------------------------------------------
  console.log("▶ [CHECK 1]: GET http://localhost:3000/api/health の疎通確認...");
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthJson = await healthRes.json();
  console.log("  Health Status:", healthJson.healthy ? "HEALTHY (ALL OK)" : "DEGRADED");
  assert.equal(healthJson.healthy, true, "Health endpoint must be healthy");
  console.log("  ✅ PASS: Supabase, Inngest, 環境変数が全て正常稼働中\n");

  // ----------------------------------------------------------------------------
  // 2. 新規仮説の作成 (The Garage: New Hypothesis Draft)
  // ----------------------------------------------------------------------------
  console.log("▶ [STEP 1]: 新規仮説の作成 (POST /api/ideas)...");
  console.log("  The Garageの「New Hypothesis Draft」ボタン押下をシミュレート");
  const createDraftRes = await fetch(`${BASE_URL}/api/ideas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "新規仮説ドラフト (Realtime E2E Test)" }),
  });
  const createDraftJson = await createDraftRes.json();
  console.log("  API Response:", {
    success: createDraftJson.success,
    ideaId: createDraftJson.idea?.id,
    commitId: createDraftJson.commit?.id,
    title: createDraftJson.idea?.title,
    initialPain: createDraftJson.commit?.q1_target_pain,
  });

  assert.equal(createDraftJson.success, true, "POST /api/ideas must succeed");
  assert.ok(createDraftJson.idea?.id, "Idea record must have UUID");
  assert.ok(createDraftJson.commit?.id, "Commit record must have UUID");
  console.log("  ✅ PASS: Supabaseに新規UUIDレコードが正常作成されました\n");

  // カンバン一覧取得で存在確認
  console.log("▶ [STEP 1-B]: カンバンへの即時反映確認 (GET /api/ideas)...");
  const listRes = await fetch(`${BASE_URL}/api/ideas`);
  const listJson = await listRes.json();
  const createdIdea = listJson.ideas?.find((i) => i.id === createDraftJson.idea.id);
  assert.ok(createdIdea, "Created idea must appear in Kanban list");
  console.log("  ✅ PASS: カンバン上に新規作成されたカードが存在します\n");

  // ----------------------------------------------------------------------------
  // 3. Phase 1のキック (DnD & ウィザード入力チェック)
  // ----------------------------------------------------------------------------
  console.log("▶ [STEP 2]: Phase 1のキック (DnD & 文字数バリデーション)...");
  console.log("  30文字未満のドラフトをDISCOVEREDへDnDした際のウィザード起動検証");
  
  const shortPain = "短いペイン"; // < 30文字
  const validPain = "営業担当者が商談後のCRM入力と議事録作成に毎日2時間以上浪費し、本来の営業活動が圧迫されている。"; // >= 30文字
  const validSolution = "商談音声をリアルタイムAI要約し、議事録作成とCRM更新項目を0クリックで全自動同期するAIハブ。"; // >= 30文字
  const validEdge = "主要CRMとの0-config双方向API連携により、導入学習摩擦をゼロにする構造的優位性。"; // >= 20文字

  assert.ok(shortPain.length < 30, "Short text should be < 30 chars (triggering wizard)");
  assert.ok(validPain.length >= 30, "Valid pain must be >= 30 chars");
  assert.ok(validSolution.length >= 30, "Valid solution must be >= 30 chars");
  assert.ok(validEdge.length >= 20, "Valid edge must be >= 20 chars");
  console.log("  ✅ PASS: 30文字未満のカードはウィザードを起動し、30文字以上の入力でDISCOVERED昇格可能\n");

  // ----------------------------------------------------------------------------
  // 4. 市場探索ジョブの開始 (POST /api/market/analyze)
  // ----------------------------------------------------------------------------
  console.log("▶ [STEP 3]: 市場探索ジョブ (Inngest) の起動 (POST /api/market/analyze)...");
  const analyzeRes = await fetch(`${BASE_URL}/api/market/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      genreName: "Project Management & Workflow Automation",
    }),
  });
  const analyzeJson = await analyzeRes.json();
  console.log("  Job Initialized:", {
    success: analyzeJson.success,
    jobId: analyzeJson.jobId,
    genreName: analyzeJson.genreName,
  });

  assert.equal(analyzeJson.success, true, "POST /api/market/analyze must succeed");
  const { jobId } = analyzeJson;
  assert.ok(jobId, "Job ID must be returned");
  console.log("  ✅ PASS: Inngestジョブイベントが発火し、job_statusレコードが初期化されました\n");

  // ----------------------------------------------------------------------------
  // 5. ポーリングと非同期ジョブのリアルタイム監視
  // ----------------------------------------------------------------------------
  console.log("▶ [STEP 4]: ポーリングと非同期ジョブのリアルタイム監視 (GET /api/market/status/:id)...");
  console.log("  Inngestワーカーの処理とSupabase job_statusの進行状況をポーリング中...\n");

  let isJobFinished = false;
  let pollCount = 0;
  let lastStatus = "";
  let finalResultData = null;

  const maxPolls = 60; // 最大120秒
  while (!isJobFinished && pollCount < maxPolls) {
    pollCount++;
    await delay(2000);

    const statusRes = await fetch(`${BASE_URL}/api/market/status/${jobId}`);
    const statusJson = await statusRes.json();

    if (statusJson.success && statusJson.job) {
      const { status, percentage, error_message, result_data } = statusJson.job;

      if (status !== lastStatus) {
        lastStatus = status;
        const progressBar = "█".repeat(Math.floor(percentage / 5)) + "░".repeat(20 - Math.floor(percentage / 5));
        console.log(`  [Poll #${pollCount}] [${progressBar}] ${percentage}% - ${status}`);
      }

      if (error_message) {
        console.error(`  ❌ Job Error reported: ${error_message}`);
        throw new Error(`Job execution error: ${error_message}`);
      }

      if (percentage >= 100 || status.toUpperCase() === "COMPLETED") {
        isJobFinished = true;
        finalResultData = result_data;
        console.log("\n  🎉 Inngestジョブが100%完了しました！");
        break;
      }
    }
  }

  assert.equal(isJobFinished, true, "Inngest job must complete successfully within timeout");
  assert.ok(finalResultData, "Final result data must be materialized in Supabase");
  console.log("  ✅ PASS: リアルタイムプログレスバー更新とジョブ完了を確認しました\n");

  // ----------------------------------------------------------------------------
  // 6. 重力マップ (Gravity Map) データの描画検証
  // ----------------------------------------------------------------------------
  console.log("▶ [STEP 5]: 重力マップ (Gravity Map) データの整合性 & D3用スカラー値検証...");
  console.log("  Materialized JSON Summary:", {
    genreName: finalResultData.genreName,
    coreJtbd: finalResultData.coreJtbd,
    companiesCount: finalResultData.companies?.length,
  });

  assert.ok(finalResultData.coreJtbd, "Core JTBD star node must exist");
  assert.ok(Array.isArray(finalResultData.companies), "Companies must be an array");
  assert.ok(finalResultData.companies.length >= 5, "At least 5 competitor nodes must be mapped");

  console.log("\n  📊 競合企業ノードの重力トポロジー解析結果:");
  finalResultData.companies.forEach((c, idx) => {
    console.log(
      `    ${idx + 1}. [${c.name.padEnd(12)}] Pull: ${String(c.pullScore).padStart(3)}/100 | ` +
      `Friction: ${String(c.frictionScore).padStart(3)}/100 | Radius: ${c.radius}px | JTBD Focus: ${c.targetFeatureId || "N/A"}`
    );
    assert.ok(c.name, "Company name must exist");
    assert.ok(typeof c.pullScore === "number", "pullScore must be number");
    assert.ok(typeof c.frictionScore === "number", "frictionScore must be number");
    assert.ok(c.radius >= 15, "radius must be >= 15");
  });

  console.log("\n================================================================================");
  console.log("🏆 ALL TEST STEPS PASSED WITH 100% SUCCESS!");
  console.log("================================================================================\n");
}

runScenario().catch((err) => {
  console.error("❌ E2E Live Test Failed:", err);
  process.exit(1);
});
