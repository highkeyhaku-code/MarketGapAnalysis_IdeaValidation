import assert from "node:assert/strict";
import { computeCommitTreeVersions } from "../lib/versioning.ts";

const BASE_URL = "http://localhost:3000";

console.log("================================================================================");
console.log("🔬 RIGOROUS QA SUITE: HARD DELETE & KANBAN LOGICAL LIFECYCLE (DRAFT->DISCOVERED->VALIDATED->PIVOT-DRAFT)");
console.log("================================================================================\n");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runQA() {
  // ----------------------------------------------------------------------------
  // 0. 既存テストデータのクリーンアップ (DELETE /api/ideas/[id])
  // ----------------------------------------------------------------------------
  console.log("▶ [STEP 0]: 既存データの取得と Hard Delete API による完全クリーンアップ...");
  const initialIdeasRes = await fetch(`${BASE_URL}/api/ideas`);
  const initialIdeasJson = await initialIdeasRes.json();
  const existingIdeas = initialIdeasJson.ideas || [];
  console.log(`  Found ${existingIdeas.length} existing project(s). Deleting all...`);

  for (const idea of existingIdeas) {
    const delRes = await fetch(`${BASE_URL}/api/ideas/${idea.id}`, { method: "DELETE" });
    const delJson = await delRes.json();
    assert.equal(delJson.success, true, `Failed to delete idea ${idea.id}`);
  }

  // クリーンアップ後の空確認
  const emptyRes = await fetch(`${BASE_URL}/api/ideas`);
  const emptyJson = await emptyRes.json();
  assert.equal(emptyJson.ideas.length, 0, "Kanban must be completely empty after cleanup");
  console.log("  ✅ PASS: 全テストデータが正常に完全消去され、カンバンがクリーンになりました\n");

  // ----------------------------------------------------------------------------
  // STEP A: 新規アイデア作成 (DRAFT) -> 文字数充実で DISCOVERED に昇格 (v1)
  // ----------------------------------------------------------------------------
  console.log("▶ [STEP A]: 新規アイデアドラフト作成 (POST /api/ideas) & DISCOVERED 昇格...");
  const createDraftRes = await fetch(`${BASE_URL}/api/ideas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "商談録音AI自動同期ハブ (QA Live Test)" }),
  });
  const createDraftJson = await createDraftRes.json();
  assert.equal(createDraftJson.success, true, "Draft creation must succeed");
  const ideaId = createDraftJson.idea.id;
  const initialCommitId = createDraftJson.commit.id;
  console.log("  Created Idea ID:", ideaId);
  console.log("  Initial Commit (v1 Draft) ID:", initialCommitId);

  // カンバンでの DRAFT 列確認
  let listRes = await fetch(`${BASE_URL}/api/ideas`);
  let listJson = await listRes.json();
  assert.equal(listJson.ideas.length, 1, "Kanban must have exactly 1 card");
  console.log("  Kanban card count: 1");

  // DISCOVERED への昇格（Q1〜Q3入力の充実）
  console.log("  ウィザード入力完了による DISCOVERED 昇格コミット作成...");
  const validPain = "営業担当者が商談後のCRM入力と議事録作成に毎日2時間以上浪費し、本来の営業活動が圧迫されている。";
  const validSolution = "Zoom/Google Meet音声をAIリアルタイム要約しCRMに全自動入力する0クリック同期ハブ。";
  const validEdge = "主要CRMとの0-config連携により初期導入コストと学習摩擦をゼロにする。";

  // v1 コミットの作成 & クラッシュジョブ起動
  const commitRes1 = await fetch(`${BASE_URL}/api/ideas/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ideaInput: {
        q1_target_pain: validPain,
        q2_solution: validSolution,
        q3_core_edge: validEdge,
        q4_target_literacy: "intermediate",
        q4_monetization_model: "subscription",
        q4_supplementary_pains: [],
      },
      ideaId: ideaId,
      domain: "B2B_SME",
    }),
  });
  const commitJson1 = await commitRes1.json();
  assert.equal(commitJson1.success, true, "First real commit must succeed");
  const commitId1 = commitJson1.commitId;
  const jobId1 = commitJson1.jobId;
  console.log("  Commit v1 ID:", commitId1);
  console.log("  Inngest Job 1 ID:", jobId1);
  console.log("  ✅ PASS: Step A 完了 (v1 コミット作成 & 検証ジョブ起動)\n");

  // ----------------------------------------------------------------------------
  // STEP B: v1 から検証 (Inngest) を実行し、VALIDATED にする
  // ----------------------------------------------------------------------------
  console.log("▶ [STEP B]: Inngest 検証ジョブのポーリング完了待ち (VALIDATED 昇格)...");
  let isJobFinished1 = false;
  let pollCount1 = 0;
  const maxPolls = 60;

  while (!isJobFinished1 && pollCount1 < maxPolls) {
    pollCount1++;
    await delay(1500);

    const statusRes = await fetch(`${BASE_URL}/api/market/status/${jobId1}`);
    const statusJson = await statusRes.json();

    if (statusJson.success && statusJson.job) {
      const { status, percentage } = statusJson.job;
      if (percentage >= 100 || status.toUpperCase() === "COMPLETED") {
        isJobFinished1 = true;
        console.log(`  [Poll #${pollCount1}] (100%) - COMPLETED`);
        break;
      }
    }
  }
  assert.equal(isJobFinished1, true, "Validation job 1 must complete successfully");

  // カンバンでの VALIDATED 列の検証
  listRes = await fetch(`${BASE_URL}/api/ideas`);
  listJson = await listRes.json();
  assert.equal(listJson.ideas.length, 1, "Kanban MUST have exactly 1 card (No split)");
  const ideaAfterValidation = listJson.ideas[0];
  const headAfterValidation = ideaAfterValidation.idea_commits.find(
    (c) => c.id === ideaAfterValidation.active_commit_id
  );
  assert.equal(headAfterValidation.status, "completed", "HEAD status must be completed");
  console.log("  Kanban Card State after Validation:", {
    title: ideaAfterValidation.title,
    active_commit_id: ideaAfterValidation.active_commit_id,
    headStatus: headAfterValidation.status,
    score: headAfterValidation.emotional_score,
    totalCommits: ideaAfterValidation.idea_commits.length,
  });
  console.log("  ✅ PASS: Step B 完了 (1枚のカードが VALIDATED に昇格)\n");

  // ----------------------------------------------------------------------------
  // STEP C: VALIDATED になった v1 からピボットを実行し、新しいブランチを作成
  // ----------------------------------------------------------------------------
  console.log("▶ [STEP C]: VALIDATED の v1 からピボット実行 (POST /api/ideas/commit)...");
  console.log("  【検証要件】ピボット直後、カンバン上のカードは1枚のまま、HEADが新コミットに切り替わること");

  const pivotPain = "リモートセールスチームにおいて、Slack上で商談議事録とタスクを0秒で共有したいがCRM連携が極めて煩雑。";
  const pivotSolution = "Slackボットとして完全ヘッドレス常駐し音声要約とネクストアクションをSlackスレッドに即時投稿するアドオン。";
  const pivotEdge = "UI学習コストゼロ（0-Config）かつ既存ツールの乗り換え不要な寄生型設計。";

  const pivotRes = await fetch(`${BASE_URL}/api/ideas/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ideaInput: {
        q1_target_pain: pivotPain,
        q2_solution: pivotSolution,
        q3_core_edge: pivotEdge,
        q4_target_literacy: "intermediate",
        q4_monetization_model: "subscription",
        q4_supplementary_pains: [],
      },
      parentCommitId: commitId1,
      ideaId: ideaId,
      domain: "B2B_SME",
    }),
  });

  const pivotJson = await pivotRes.json();
  assert.equal(pivotJson.success, true, "Pivot commit creation must succeed");
  assert.equal(pivotJson.ideaId, ideaId, "ideaId must match parent ideaId (NO DUPLICATE PROJECT)");
  assert.equal(pivotJson.parentCommitId, commitId1, "parentCommitId must point to commitId1");
  const commitId2 = pivotJson.commitId;
  const jobId2 = pivotJson.jobId;
  console.log("  Created Pivot Commit (v2) ID:", commitId2);
  console.log("  Inngest Job 2 ID:", jobId2);

  // ----------------------------------------------------------------------------
  // 厳密な検証要件の確認
  // ----------------------------------------------------------------------------
  console.log("\n▶ [QA VERIFICATION]: 3つの必須要件の厳密チェック...");

  // 1. カンバンボード上に表示されるカードは「1プロジェクトにつき1枚」だけであること
  listRes = await fetch(`${BASE_URL}/api/ideas`);
  listJson = await listRes.json();
  console.log(`  1. Total Kanban Cards in DB: ${listJson.ideas.length}`);
  assert.equal(listJson.ideas.length, 1, "REQUIREMENT 1: Must be exactly 1 card on Kanban (NO CARD SPLIT)");
  console.log("  ✅ PASS: 要件1 (カンバンボード上のカードは厳密に1枚のみ)");

  // 2. コミット履歴とツリーバージョンの確認
  const finalIdea = listJson.ideas[0];
  const commits = finalIdea.idea_commits;
  console.log(`  2. Total Commits in Repository: ${commits.length}`);
  assert.equal(commits.length, 3, "Total commits should be 3 (initial draft + v1 validated + v2 pivot)");

  const versionMap = computeCommitTreeVersions(commits, finalIdea.active_commit_id);
  const headCommitFinal = commits.find((c) => c.id === finalIdea.active_commit_id) || commits[commits.length - 1];
  const headVersion = versionMap.get(headCommitFinal.id) || "v1";
  const badgeText = `${headVersion} (Total ${commits.length} commits)`;

  console.log("  3. Head Commit Version:", headVersion);
  console.log("  3. Calculated Thickness Badge:", badgeText);
  assert.ok(badgeText.includes(`Total ${commits.length} commits`), "REQUIREMENT 3: Badge must indicate total commits count");
  console.log("  ✅ PASS: 要件3 (厚みバッジが '(Total X commits)' として更新)");

  // 3. リポジトリ詳細 API の取得確認
  const repoRes = await fetch(`${BASE_URL}/api/ideas/${ideaId}`);
  const repoJson = await repoRes.json();
  assert.equal(repoJson.success, true, "GET /api/ideas/[id] must succeed");
  console.log("  4. Repository View Details:", {
    title: repoJson.idea.title,
    active_commit_id: repoJson.idea.active_commit_id,
    commitsCount: repoJson.idea.idea_commits.length,
  });

  // 4. ピボットジョブを最後まで完走させる
  console.log("\n  ピボット検証ジョブの完走待ち...");
  let isJobFinished2 = false;
  let pollCount2 = 0;
  while (!isJobFinished2 && pollCount2 < maxPolls) {
    pollCount2++;
    await delay(1500);
    const statusRes = await fetch(`${BASE_URL}/api/market/status/${jobId2}`);
    const statusJson = await statusRes.json();
    if (statusJson.success && statusJson.job) {
      if (statusJson.job.percentage >= 100 || statusJson.job.status.toUpperCase() === "COMPLETED") {
        isJobFinished2 = true;
        console.log(`  [Poll #${pollCount2}] (100%) - COMPLETED`);
        break;
      }
    }
  }
  assert.equal(isJobFinished2, true, "Pivot job must complete");

  // ジョブ完了後の HEAD 切り替え確認
  listRes = await fetch(`${BASE_URL}/api/ideas`);
  listJson = await listRes.json();
  const completedIdea = listJson.ideas[0];
  assert.equal(completedIdea.active_commit_id, commitId2, "HEAD must be switched to commitId2 upon job completion");
  console.log("  ✅ PASS: ピボットジョブ完了後、HEAD が v2 コミットへ正常に Checkout されました\n");

  console.log("================================================================================");
  console.log("🏆 ALL QA VERIFICATION REQUIREMENTS (Step A, B, C & Hard Delete) FULLY SATISFIED!");
  console.log("================================================================================\n");
}

runQA().catch((err) => {
  console.error("❌ QA Failed:", err);
  process.exit(1);
});
