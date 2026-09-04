import assert from "node:assert/strict";

const BASE_URL = "http://localhost:3000";

console.log("================================================================================");
console.log("🚀 PHASE 2 CORE LOOP & REPOSITORY INTEGRITY VERIFICATION TEST");
console.log("================================================================================\n");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runCoreLoopTest() {
  // ----------------------------------------------------------------------------
  // STEP 1: 初回アイデアの作成 & 検証リクエスト (POST /api/ideas/commit)
  // ----------------------------------------------------------------------------
  console.log("▶ [STEP 1]: 初回アイデア作成 & 仮説クラッシュ検証キック...");
  const initialInput = {
    q1_target_pain: "リモートセールスチームにおいてHubSpotの入力作業に1日2時間以上浪費し、商談記録が形骸化している。",
    q2_solution: "ZoomやGoogle Meetの商談音声をリアルタイムAI解析し、CRM項目を0クリックで全自動入力・同期するAIハブ。",
    q3_core_edge: "主要CRMとの0-config連携により初期導入コストをゼロにし、ローカル実行で超低遅延を実現する。",
    q4_target_literacy: "intermediate",
    q4_monetization_model: "subscription",
    q4_supplementary_pains: [],
  };

  const commitRes1 = await fetch(`${BASE_URL}/api/ideas/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ideaInput: initialInput,
      domain: "B2B_SME",
    }),
  });

  const commitJson1 = await commitRes1.json();
  console.log("  Response 1:", {
    success: commitJson1.success,
    ideaId: commitJson1.ideaId,
    commitId: commitJson1.commitId,
    jobId: commitJson1.jobId,
  });

  assert.equal(commitJson1.success, true, "First commit must succeed");
  const ideaId = commitJson1.ideaId;
  const commitId1 = commitJson1.commitId;
  const jobId1 = commitJson1.jobId;
  assert.ok(ideaId, "ideaId must be generated");
  assert.ok(commitId1, "commitId1 must be generated");
  assert.ok(jobId1, "jobId1 must be generated");
  console.log("  ✅ PASS: 初回アイデア & コミット v1 が作成されました\n");

  // ----------------------------------------------------------------------------
  // STEP 2: ジョブポーリングとステータス進行の一貫性検証 (/api/market/status/:id)
  // ----------------------------------------------------------------------------
  console.log("▶ [STEP 2]: JobPollingTracker による進行ステータス追跡 (GET /api/market/status/:id)...");
  
  let isJobFinished1 = false;
  let pollCount1 = 0;
  let lastStatus1 = "";
  const maxPolls = 60;

  while (!isJobFinished1 && pollCount1 < maxPolls) {
    pollCount1++;
    await delay(1500);

    const statusRes = await fetch(`${BASE_URL}/api/market/status/${jobId1}`);
    const statusJson = await statusRes.json();

    if (statusJson.success && statusJson.job) {
      const { status, percentage } = statusJson.job;
      if (status !== lastStatus1) {
        lastStatus1 = status;
        console.log(`  [Poll #${pollCount1}] (${percentage}%) - ${status}`);
      }

      if (percentage >= 100 || status.toUpperCase() === "COMPLETED") {
        isJobFinished1 = true;
        console.log("  🎉 初回検証ジョブが COMPLETED に達しました！");
        break;
      }
    }
  }

  assert.equal(isJobFinished1, true, "Job 1 must complete successfully");
  console.log("  ✅ PASS: 共通進行ステータス（🔎, 💀, ⚖️, 🔥, COMPLETED）が正常に更新されました\n");

  // ----------------------------------------------------------------------------
  // STEP 3: 初回コミット検証結果の確認 & バイリンガルスキーマ検証
  // ----------------------------------------------------------------------------
  console.log("▶ [STEP 3]: コミット v1 の検証結果とバイリンガルZod構造の確認...");
  const getCommitRes1 = await fetch(`${BASE_URL}/api/ideas/commit/${commitId1}`);
  const getCommitJson1 = await getCommitRes1.json();
  assert.equal(getCommitJson1.success, true, "Fetching commit 1 must succeed");
  const c1 = getCommitJson1.commit;
  assert.equal(c1.status, "completed", "Commit status must be completed");
  assert.ok(typeof c1.emotional_score === "number", "Emotional score must be calculated");

  const tribunal1 = c1.q4_supplementary_pains?.tribunal;
  assert.ok(tribunal1, "Tribunal feedback must exist in payload");
  assert.ok(tribunal1.investor.harsh_critique_ja, "investor harsh_critique_ja must exist");
  assert.ok(tribunal1.investor.socratic_question_ja, "investor socratic_question_ja must exist");
  assert.ok(tribunal1.investor.pivot_hint_tag_ja, "investor pivot_hint_tag_ja must exist");
  assert.ok(tribunal1.competitor.harsh_critique_ja, "competitor harsh_critique_ja must exist");
  assert.ok(tribunal1.skeptical_user.harsh_critique_ja, "skeptical_user harsh_critique_ja must exist");
  assert.ok(["KILL", "PIVOT", "SURVIVED"].includes(tribunal1.overall_verdict), "Overall verdict must be valid enum");
  console.log("  Verdict:", tribunal1.overall_verdict);
  console.log("  Investor Socratic Q (JA):", tribunal1.investor.socratic_question_ja);
  console.log("  Investor Pivot Tag (JA):", tribunal1.investor.pivot_hint_tag_ja);
  console.log("  ✅ PASS: TribunalFeedbackSchema バイリンガル構造が完全に格納されています\n");

  // ----------------------------------------------------------------------------
  // STEP 4: ピボット実行 (POST /api/ideas/commit with parentCommitId = commitId1)
  // ----------------------------------------------------------------------------
  console.log("▶ [STEP 4]: ピボット実行 (親コミット v1 からの分岐)...");
  console.log("  【重要検証】アイデアは新規作成されず、既存 ideaId にコミット v2 のみが追加されること");

  const pivotInput = {
    q1_target_pain: "リモートセールスチームにおいて、Slack上で商談議事録とタスクを0秒で共有したいがCRM連携が煩雑。",
    q2_solution: "Slackボットとして完全ヘッドレス常駐し、音声から要約とネクストアクションをSlackスレッドに即時投稿するアドオン。",
    q3_core_edge: "UI学習コストゼロ（0-Config）かつ既存ツールの乗り換え不要（アドオン寄生型アーキテクチャ）。",
    q4_target_literacy: "intermediate",
    q4_monetization_model: "subscription",
    q4_supplementary_pains: [],
  };

  const commitRes2 = await fetch(`${BASE_URL}/api/ideas/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ideaInput: pivotInput,
      parentCommitId: commitId1,
      ideaId: ideaId,
      domain: "B2B_SME",
    }),
  });

  const commitJson2 = await commitRes2.json();
  console.log("  Response 2 (Pivot):", {
    success: commitJson2.success,
    ideaId: commitJson2.ideaId,
    commitId: commitJson2.commitId,
    parentCommitId: commitJson2.parentCommitId,
    jobId: commitJson2.jobId,
  });

  assert.equal(commitJson2.success, true, "Pivot commit must succeed");
  assert.equal(commitJson2.ideaId, ideaId, "ideaId MUST be identical to parent ideaId (NO NEW IDEA CREATED)");
  assert.equal(commitJson2.parentCommitId, commitId1, "parentCommitId MUST match commitId1");
  const commitId2 = commitJson2.commitId;
  const jobId2 = commitJson2.jobId;
  console.log("  ✅ PASS: 既存 ideaId に属する新規コミット v2 が作成され、ideas の二重作成はゼロです\n");

  // ----------------------------------------------------------------------------
  // STEP 5: ピボットジョブのポーリング & 完了待ち
  // ----------------------------------------------------------------------------
  console.log("▶ [STEP 5]: ピボット検証ジョブのポーリング...");
  let isJobFinished2 = false;
  let pollCount2 = 0;
  while (!isJobFinished2 && pollCount2 < maxPolls) {
    pollCount2++;
    await delay(1500);

    const statusRes = await fetch(`${BASE_URL}/api/market/status/${jobId2}`);
    const statusJson = await statusRes.json();

    if (statusJson.success && statusJson.job) {
      const { status, percentage } = statusJson.job;
      if (percentage >= 100 || status.toUpperCase() === "COMPLETED") {
        isJobFinished2 = true;
        console.log("  🎉 ピボット検証ジョブが COMPLETED に達しました！");
        break;
      }
    }
  }

  assert.equal(isJobFinished2, true, "Pivot job must complete successfully");
  console.log("  ✅ PASS: ピボット検証ジョブが正常完了しました\n");

  // ----------------------------------------------------------------------------
  // STEP 6: カンバンボードのカード分裂バグ解消 & HEAD最新化の検証
  // ----------------------------------------------------------------------------
  console.log("▶ [STEP 6]: カンバンボード検証 (GET /api/ideas)...");
  console.log("  【重要検証】対象プロジェクトのカードは1枚のみで、HEADが v2 に更新されていること");

  const ideasRes = await fetch(`${BASE_URL}/api/ideas`);
  const ideasJson = await ideasRes.json();
  assert.equal(ideasJson.success, true, "GET /api/ideas must succeed");

  const matchingIdeas = ideasJson.ideas.filter((i) => i.id === ideaId);
  console.log(`  Matching ideas in DB for ideaId ${ideaId}: ${matchingIdeas.length}`);
  assert.equal(matchingIdeas.length, 1, "There MUST be exactly 1 idea project (NO CARD SPLIT BUG)");

  const projectIdea = matchingIdeas[0];
  console.log("  Project Idea State:", {
    id: projectIdea.id,
    title: projectIdea.title,
    active_commit_id: projectIdea.active_commit_id,
    totalCommits: projectIdea.idea_commits?.length,
  });

  assert.equal(projectIdea.active_commit_id, commitId2, "active_commit_id (HEAD) must point to commitId2 (v2)");
  assert.equal(projectIdea.idea_commits.length, 2, "idea_commits must contain exactly 2 commits (v1 and v2)");

  console.log("  ✅ PASS: カンバンカードは分裂せず1枚のみ存在し、HEADは最新の v2 を指しています！\n");

  console.log("================================================================================");
  console.log("🏆 ALL PHASE 2 CORE LOOP TESTS PASSED WITH 100% PERFECTION!");
  console.log("================================================================================\n");
}

runCoreLoopTest().catch((err) => {
  console.error("❌ Phase 2 Core Loop Test Failed:", err);
  process.exit(1);
});
