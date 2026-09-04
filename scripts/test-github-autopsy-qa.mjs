// scripts/test-github-autopsy-qa.mjs
import assert from "node:assert/strict";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

console.log("================================================================================");
console.log("💀 GITHUB AUTOPSY & AI CAUSE OF DEATH QA VERIFICATION SUITE");
console.log("================================================================================\n");

const TEST_SCENARIOS = [
  {
    name: "ToDoアプリ",
    targetPain: "個人のタスク管理が散らばり、優先順位が分からなくなって締め切りを落とす",
    solution: "Notionのように直感的にドラッグ＆ドロップで操作でき、AIが自動でタスクを優先順位付けしてくれるToDoアプリ",
    coreEdge: "自然言語でのタスク入力から緊急度・重要度マトリクスを即座に再配置する独自AIエンジン",
    keywords: ["ToDoアプリ", "task management", "todo app"],
  },
  {
    name: "CRM",
    targetPain: "顧客情報がスプレッドシートやチャットに散在し、過去の商談履歴を誰も把握できていない",
    solution: "HubSpotよりもシンプルで、LINEやSlackと連携して会話から顧客カルテを自動生成する軽量CRM",
    coreEdge: "対話型AIによるゼロ入力CRM。商談後の会話を要約して自動でパイプラインに登録する",
    keywords: ["CRM", "sales crm", "customer management"],
  },
  {
    name: "営業支援",
    targetPain: "営業担当が商談後のCRM入力と日報作成に毎日2時間以上奪われ、新規テレアポができない",
    solution: "ZoomやGoogle Meetの商談音声をリアルタイム解析し、Salesforceに自動転記する営業支援ツール",
    coreEdge: "顧客の感情変化と成約確度スコアを独自アルゴリズムで算出し、次のアクションを自動提案",
    keywords: ["営業支援", "sales automation", "SFA"],
  },
];

async function pollJobStatus(jobId, timeoutMs = 70000) {
  const start = Date.now();
  let lastStatus = "";
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${BASE_URL}/api/market/status/${jobId}`);
    const json = await res.json();
    if (json.success && json.job) {
      if (json.job.status !== lastStatus) {
        lastStatus = json.job.status;
        console.log(`     [${json.job.percentage}%] ${json.job.status}`);
      }
      if (json.job.status === "COMPLETED" || json.job.percentage >= 100) {
        return json.job;
      }
      if (json.job.status === "FAILED") {
        throw new Error(`Job failed: ${json.job.error_message}`);
      }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Job timed out after ${timeoutMs / 1000}s. Last status: ${lastStatus}`);
}

async function runQA() {
  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n▶ [SCENARIO]: 「${scenario.name}」のInngest検証パイプライン実行...`);

    // 1. コミット作成 & Inngest ジョブ発火
    const commitRes = await fetch(`${BASE_URL}/api/ideas/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ideaInput: {
          q1_target_pain: scenario.targetPain,
          q2_solution: scenario.solution,
          q3_core_edge: scenario.coreEdge,
          q4_target_literacy: "intermediate",
          q4_monetization_model: "subscription",
          q4_supplementary_pains: ["競合との機能重複", "スイッチングコスト"],
        },
        domain: "B2B_SME",
        keywords: scenario.keywords,
      }),
    });

    const commitJson = await commitRes.json();
    assert.ok(commitJson.success, `Commit failed for ${scenario.name}`);
    const { jobId, commitId, ideaId } = commitJson;
    console.log(`  ✓ Commit Created: ${commitId} (Job: ${jobId})`);

    // 2. ジョブ完了ポーリング
    console.log(`  ⏳ ジョブ完了を待機中...`);
    await pollJobStatus(jobId);

    // 3. コミット詳細取得 (インスペクターUIのデータソース検証)
    const detailRes = await fetch(`${BASE_URL}/api/ideas/commit/${commitId}`);
    const detailJson = await detailRes.json();
    assert.ok(detailJson.success, "Must fetch commit details");

    const payload = detailJson.commit?.q4_supplementary_pains;
    const autopsy = payload?.githubAutopsy;

    console.log(`  🔍 GitHub 死骸報告書 (Autopsy) 検証:`);
    console.log(`     Total Count: ${autopsy?.totalCount}`);
    console.log(`     Items Count: ${autopsy?.items?.length}`);

    assert.ok(autopsy, "githubAutopsy payload must exist");
    assert.ok(autopsy.items && autopsy.items.length >= 1, `Must find at least 1 archived repo for 「${scenario.name}」`);
    assert.ok(autopsy.totalCount >= 1, "totalCount must be at least 1");

    // 各アイテムのAI死因分析の検証
    for (let i = 0; i < autopsy.items.length; i++) {
      const item = autopsy.items[i];
      const cause = item.death_cause || item.autopsy_reason || item.causeOfDeath;
      console.log(`     [${i + 1}] ${item.name || item.repo_name} (★${item.stargazers_count ?? item.stars})`);
      console.log(`         URL: ${item.html_url}`);
      console.log(`         💀 死因: ${cause}`);

      assert.ok(item.name || item.repo_name, "Repo must have a name");
      assert.ok(item.html_url || item.url, "Repo must have a URL");
      assert.ok(cause && cause.length > 5, "Repo must have a valid AI generated death cause");
    }

    // 4. AI審査員 (Tribunal) の検証
    assert.ok(payload?.tribunal?.overall_verdict, "Must have tribunal verdict");
    console.log(`  ⚖️ AI Tribunal Verdict: ${payload.tribunal.overall_verdict}`);
    console.log(`  ✅ PASS: 「${scenario.name}」のGitHub死骸報告書 & AI死因分析が完全稼働\n`);
  }

  console.log("================================================================================");
  console.log("🎉 ALL 3 QA SCENARIOS PASSED WITH >= 1 ARCHIVED REPOS & AI AUTOPSY CAUSES!");
  console.log("================================================================================");
}

runQA().catch((err) => {
  console.error("\n❌ QA Verification Failed:", err);
  process.exit(1);
});
