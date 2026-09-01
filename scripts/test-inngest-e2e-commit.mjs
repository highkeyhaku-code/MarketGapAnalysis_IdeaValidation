// scripts/test-inngest-e2e-commit.mjs
import assert from "node:assert/strict";

console.log("================================================================================");
console.log("🧪 INNGEST E2E COMMIT & REALITY CRASH TRIGGER TEST");
console.log("================================================================================\n");

async function testCommitAndInngestJob() {
  console.log("▶ [STEP 1]: POST /api/ideas/commit をリクエスト...");

  const commitRes = await fetch("http://localhost:3000/api/ideas/commit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ideaInput: {
        q1_target_pain: "E2E Test: 営業チームが日報と議事録作成に毎日3時間拘束される摩擦",
        q2_solution: "Zoom録画から自動要約してCRMとSlackにワンクリック同期するAI",
        q3_core_edge: "自社独自辞書と感情トーン解析による超高精度要約エンジン",
        q4_target_literacy: "intermediate",
        q4_monetization_model: "subscription",
        q4_supplementary_pains: ["セキュリティ審査の長期化", "社内定着の難しさ"],
      },
      domain: "B2B_SME",
    }),
  });

  const commitJson = await commitRes.json();
  console.log("  Commit API Response:", JSON.stringify(commitJson, null, 2));

  assert.ok(commitJson.success, "Commit API must return success: true");
  assert.ok(commitJson.commitId, "Must return commitId");
  assert.ok(commitJson.jobId, "Must return jobId");

  const { jobId, commitId } = commitJson;

  console.log(`\n▶ [STEP 2]: Job ${jobId} のステータスをポーリング監視 (最大60秒)...`);

  const startTime = Date.now();
  let lastStatus = "";

  while (Date.now() - startTime < 60000) {
    const statusRes = await fetch(`http://localhost:3000/api/market/status/${jobId}`);
    const statusJson = await statusRes.json();

    if (statusJson.success && statusJson.job) {
      const job = statusJson.job;
      if (job.status !== lastStatus) {
        lastStatus = job.status;
        console.log(`  [${new Date().toLocaleTimeString()}] Progress: ${job.percentage}% | Status: ${job.status}`);
      }

      if (job.status === "COMPLETED" || job.percentage >= 100) {
        console.log("\n  🎉 Job successfully completed in", Math.round((Date.now() - startTime) / 1000), "seconds!");
        console.log("  Result Data Keys:", Object.keys(job.result_data || {}));
        return;
      }

      if (job.status === "FAILED" || job.error_message) {
        console.error("\n  ❌ Job failed with error:", job.error_message);
        process.exit(1);
      }
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  console.error("\n❌ Test timed out after 60 seconds. Last status:", lastStatus);
  process.exit(1);
}

testCommitAndInngestJob().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
