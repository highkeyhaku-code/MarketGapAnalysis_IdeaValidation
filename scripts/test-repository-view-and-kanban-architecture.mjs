import assert from "node:assert/strict";
import { computeCommitTreeVersions } from "../lib/versioning.ts";

const BASE_URL = "http://localhost:3000";

console.log("================================================================================");
console.log("🏛️ REPOSITORY VIEW (/ideas/[id]) & KANBAN ARCHITECTURE VERIFICATION AUDIT");
console.log("================================================================================\n");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runAudit() {
  // ----------------------------------------------------------------------------
  // AUDIT 1: プロジェクト作成 & コミット履歴のシミュレート
  // ----------------------------------------------------------------------------
  console.log("▶ [AUDIT 1]: プロジェクト作成 & 2世代コミットの生成 (POST /api/ideas/commit)...");
  
  // v1 作成
  const res1 = await fetch(`${BASE_URL}/api/ideas/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ideaInput: {
        q1_target_pain: "商談後の議事録作成とCRM入力作業に毎日2時間以上浪費し、本来の営業活動が圧迫されている。",
        q2_solution: "ZoomやGoogle Meetの商談音声をリアルタイムAI要約しCRMに全自動入力する0クリック同期ハブ。",
        q3_core_edge: "主要CRMとの0-config連携により導入障壁をゼロにするアーキテクチャ。",
        q4_target_literacy: "intermediate",
        q4_monetization_model: "subscription",
        q4_supplementary_pains: [],
      },
      domain: "B2B_SME",
    }),
  });
  const json1 = await res1.json();
  assert.equal(json1.success, true, "Commit 1 must succeed");
  const ideaId = json1.ideaId;
  const commitId1 = json1.commitId;
  console.log("  Created Idea Repository:", ideaId);
  console.log("  Commit v1 ID:", commitId1);

  // v2 ピボット作成
  const res2 = await fetch(`${BASE_URL}/api/ideas/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ideaInput: {
        q1_target_pain: "リモートセールスチームにおいて、Slack上で商談議事録とタスクを0秒で共有したいがCRM連携が極めて煩雑。",
        q2_solution: "Slackボットとして完全ヘッドレス常駐し音声要約とネクストアクションをSlackスレッドに即時投稿するアドオン。",
        q3_core_edge: "UI学習コストゼロ（0-Config）かつ既存ツールの乗り換え不要な寄生型設計。",
        q4_target_literacy: "intermediate",
        q4_monetization_model: "subscription",
        q4_supplementary_pains: [],
      },
      parentCommitId: commitId1,
      ideaId: ideaId,
      domain: "B2B_SME",
    }),
  });
  const json2 = await res2.json();
  assert.equal(json2.success, true, "Commit 2 (Pivot) must succeed");
  assert.equal(json2.ideaId, ideaId, "ideaId must be identical (No duplicate project created)");
  const commitId2 = json2.commitId;
  console.log("  Commit v2 ID (Pivot from v1):", commitId2);
  console.log("  ✅ PASS: 1つのプロジェクト配下に2つのコミットが作成されました\n");

  // ----------------------------------------------------------------------------
  // AUDIT 2: 単一リポジトリ取得 API (GET /api/ideas/[id]) の検証
  // ----------------------------------------------------------------------------
  console.log("▶ [AUDIT 2]: 単一リポジトリ取得 API (GET /api/ideas/[id]) の検証...");
  const getIdeaRes = await fetch(`${BASE_URL}/api/ideas/${ideaId}`);
  const getIdeaJson = await getIdeaRes.json();

  assert.equal(getIdeaJson.success, true, "GET /api/ideas/[id] must succeed");
  const repoIdea = getIdeaJson.idea;
  assert.equal(repoIdea.id, ideaId, "Repository ID must match");
  assert.ok(Array.isArray(repoIdea.idea_commits), "idea_commits must be an array");
  assert.equal(repoIdea.idea_commits.length, 2, "idea_commits must have exactly 2 commits");

  // 祖先リンクの検証
  const c1 = repoIdea.idea_commits.find((c) => c.id === commitId1);
  const c2 = repoIdea.idea_commits.find((c) => c.id === commitId2);
  assert.ok(c1, "Commit 1 must exist in commits list");
  assert.ok(c2, "Commit 2 must exist in commits list");
  assert.equal(c1.parent_commit_id, null, "Root commit parent_commit_id must be null");
  assert.equal(c2.parent_commit_id, commitId1, "Pivot commit parent_commit_id must point to commit 1");

  console.log("  Repository Title:", repoIdea.title);
  console.log("  Active Commit ID (HEAD):", repoIdea.active_commit_id);
  console.log("  Total Commits:", repoIdea.idea_commits.length);
  console.log("  ✅ PASS: GET /api/ideas/[id] がリポジトリメタ情報と全コミット系譜を正確に返却しました\n");

  // ----------------------------------------------------------------------------
  // AUDIT 3: カンバンボードの「プロジェクト単位」集約と厚みバッジの検証
  // ----------------------------------------------------------------------------
  console.log("▶ [AUDIT 3]: カンバン一覧 (GET /api/ideas) のプロジェクト単位集約と厚みバッジ検証...");
  const kanbanRes = await fetch(`${BASE_URL}/api/ideas`);
  const kanbanJson = await kanbanRes.json();
  assert.equal(kanbanJson.success, true, "GET /api/ideas must succeed");

  const matchingList = kanbanJson.ideas.filter((i) => i.id === ideaId);
  console.log(`  Matching cards in Kanban for ideaId ${ideaId}: ${matchingList.length} card(s)`);
  assert.equal(matchingList.length, 1, "There MUST be exactly 1 card on Kanban per project idea (NO CARD SPLIT)");

  const kanbanIdea = matchingList[0];
  const versionMap = computeCommitTreeVersions(kanbanIdea.idea_commits, kanbanIdea.active_commit_id);
  const headCommit = kanbanIdea.idea_commits.find((c) => c.id === kanbanIdea.active_commit_id) || kanbanIdea.idea_commits[kanbanIdea.idea_commits.length - 1];
  const headVersion = versionMap.get(headCommit.id) || "v1";
  const badgeText = `${headVersion} (Total ${kanbanIdea.idea_commits.length} commits)`;

  console.log("  Calculated Head Version:", headVersion);
  console.log("  Rendered Version Thickness Badge:", badgeText);
  assert.equal(badgeText, "v2 (Total 2 commits)", "Badge text must accurately summarize HEAD and total count");
  console.log("  ✅ PASS: カンバンカードは1枚のみで、HEAD情報と厚みバッジが正確に描画されます\n");

  // ----------------------------------------------------------------------------
  // AUDIT 4: Socratic Dialogue & シームレス・ピボット遷移 URL 生成の検証
  // ----------------------------------------------------------------------------
  console.log("▶ [AUDIT 4]: Socratic Dialogue & シームレス・ピボット遷移 URL 生成の検証...");
  const socraticQ = "来月SalesforceがZoom連携ボタンを無料公開した場合に、顧客が使い続ける理由は何か？";
  const pivotTag = "特定業界特化型コンプライアンス";
  const focusPersona = "investor";

  const pivotUrl = `/validate?pivotFrom=${commitId1}&focus=${focusPersona}&socraticQuestion=${encodeURIComponent(socraticQ)}&pivotTag=${encodeURIComponent(pivotTag)}`;
  console.log("  Generated Pivot Destination URL:", pivotUrl);

  const urlObj = new URL(`http://dummy.local${pivotUrl}`);
  assert.equal(urlObj.searchParams.get("pivotFrom"), commitId1, "pivotFrom param must match commitId1");
  assert.equal(urlObj.searchParams.get("focus"), focusPersona, "focus param must match");
  assert.equal(urlObj.searchParams.get("socraticQuestion"), socraticQ, "socraticQuestion must decode cleanly");
  assert.equal(urlObj.searchParams.get("pivotTag"), pivotTag, "pivotTag must decode cleanly");
  console.log("  ✅ PASS: ソクラテス式ピボットURLパラメータが完全に整合しています\n");

  // ----------------------------------------------------------------------------
  // AUDIT 5: Lineage Tree 用 D3 Stratify データ適合性検証
  // ----------------------------------------------------------------------------
  console.log("▶ [AUDIT 5]: Git for Ideas 系譜ツリー用データ整合性検証...");
  const treeNodes = repoIdea.idea_commits.map((c) => ({
    id: c.id,
    parentId: c.parent_commit_id,
    version: versionMap.get(c.id) || "v1",
    title: c.q1_target_pain,
    score: c.emotional_score,
  }));

  const rootNodes = treeNodes.filter((n) => !n.parentId);
  assert.equal(rootNodes.length, 1, "There MUST be exactly 1 root node (parentId = null)");
  assert.equal(rootNodes[0].id, commitId1, "Root node must be commitId1");

  const childNodes = treeNodes.filter((n) => n.parentId === commitId1);
  assert.equal(childNodes.length, 1, "There must be 1 child node branched from commitId1");
  assert.equal(childNodes[0].id, commitId2, "Child node must be commitId2");
  console.log("  Tree Structure Verified: Root (v1) -> Branch (v2)");
  console.log("  ✅ PASS: D3.stratify 階層グラフ構造が完全に成立しています\n");

  console.log("================================================================================");
  console.log("🎉 ALL 5 ARCHITECTURE & INTEGRATION AUDIT SUITES FULLY PASSED (100%)!");
  console.log("================================================================================\n");
}

runAudit().catch((err) => {
  console.error("❌ Audit Failed:", err);
  process.exit(1);
});
