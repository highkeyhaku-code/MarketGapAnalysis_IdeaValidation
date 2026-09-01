// scripts/test-git-for-ideas-audit.mjs
import assert from "node:assert/strict";
import {
  determineNextVersion,
  computeCommitTreeVersions,
  getCommitVersionString,
} from "../lib/versioning.ts";
import { useIdeaStore } from "../lib/store/useIdeaStore.ts";

console.log("================================================================================");
console.log("🛠️ GIT FOR IDEAS & LIFE-CYCLE ARCHITECTURE VERIFICATION AUDIT");
console.log("================================================================================\n");

async function runGitForIdeasAudit() {
  // ----------------------------------------------------------------------------
  // 1. バージョン採番アルゴリズムの検証 (要件2, 設計書 2.1)
  // ----------------------------------------------------------------------------
  console.log("▶ [AUDIT 1]: バージョン採番アルゴリズム (Versioning Engine) の検証...");

  // 1-1. ルートコミット
  const rootVer = determineNextVersion(null, false, 0);
  assert.equal(rootVer, "v1", "Root commit version must be 'v1'");

  // 1-2. 直列の進化 (Sequential Evolution: v1 -> v2 -> v3)
  const v2 = determineNextVersion("v1", false, 0);
  assert.equal(v2, "v2", "Sequential step from v1 must be 'v2'");

  const v3 = determineNextVersion("v2", false, 0);
  assert.equal(v3, "v3", "Sequential step from v2 must be 'v3'");

  const v4 = determineNextVersion("v3", false, 0);
  assert.equal(v4, "v4", "Sequential step from v3 must be 'v4'");

  // 1-3. 過去コミットからの分岐 (Branching from past commit: Detached HEAD)
  // v2 からの第1分岐 -> v2.1
  const v2Branch1 = determineNextVersion("v2", true, 0);
  assert.equal(v2Branch1, "v2.1", "Branching from v2 (1st branch) must be 'v2.1'");

  // v2 からの第2分岐 -> v2.2
  const v2Branch2 = determineNextVersion("v2", true, 1);
  assert.equal(v2Branch2, "v2.2", "Branching from v2 (2nd branch) must be 'v2.2'");

  // サブブランチ v2.1 からの直列進化 -> v2.2 (またはサブレベル)
  const v21Next = determineNextVersion("v2.1", false, 0);
  assert.equal(v21Next, "v2.2", "Sequential evolution from v2.1 must be 'v2.2'");

  // サブブランチ v2.1 からの更なる分岐 -> v2.1.1
  const v21Branch = determineNextVersion("v2.1", true, 0);
  assert.equal(v21Branch, "v2.1.1", "Branching from sub-branch v2.1 must be 'v2.1.1'");

  console.log("  1-1. Root Commit Version:", rootVer);
  console.log("  1-2. Sequential Evolution:", `${rootVer} -> ${v2} -> ${v3} -> ${v4}`);
  console.log("  1-3. Detached HEAD Branching:", `v2 -> ${v2Branch1} (branch 1), ${v2Branch2} (branch 2)`);
  console.log("  1-4. Sub-branch Branching:", `v2.1 -> ${v21Branch}`);
  console.log("  ✅ PASS: バージョン採番アルゴリズムが直列進化・過去分岐ともに完全適合\n");

  // ----------------------------------------------------------------------------
  // 2. コミットツリー全体の動的バージョン計算の検証 (要件2)
  // ----------------------------------------------------------------------------
  console.log("▶ [AUDIT 2]: コミットツリー全体の動的バージョン計算 (computeCommitTreeVersions) の検証...");

  // サンプルツリー:
  // c1 (root) -> c2 -> c3 (active)
  //             └-> c4 (branch from c2)
  //                 └-> c5 (branch from c4)
  const sampleCommits = [
    { id: "c1", parent_commit_id: null, created_at: "2026-09-01T00:00:00Z" },
    { id: "c2", parent_commit_id: "c1", created_at: "2026-09-01T01:00:00Z" },
    { id: "c3", parent_commit_id: "c2", created_at: "2026-09-01T02:00:00Z" },
    { id: "c4", parent_commit_id: "c2", created_at: "2026-09-01T03:00:00Z" },
    { id: "c5", parent_commit_id: "c4", created_at: "2026-09-01T04:00:00Z" },
  ];

  const versionMap = computeCommitTreeVersions(sampleCommits, "c3");

  assert.equal(versionMap.get("c1"), "v1", "c1 must be v1");
  assert.equal(versionMap.get("c2"), "v2", "c2 must be v2");
  assert.equal(versionMap.get("c3"), "v3", "c3 (main sequential) must be v3");
  assert.equal(versionMap.get("c4"), "v2.1", "c4 (branch from c2) must be v2.1");
  assert.equal(versionMap.get("c5"), "v2.2", "c5 (sequential from c4) must be v2.2");

  console.log("  2-1. Computed Tree Versions:", Object.fromEntries(versionMap));
  console.log("  ✅ PASS: 階層ツリー全体のバージョンマッピングが正確に算出\n");

  // ----------------------------------------------------------------------------
  // 3. Zustand ストアと Detached HEAD 制御の検証 (要件4)
  // ----------------------------------------------------------------------------
  console.log("▶ [AUDIT 3]: Zustand ストアと Detached HEAD 制御の検証...");

  const store = useIdeaStore.getState();

  // 3-1. 初期コンテキストセット (active = c3)
  store.setIdeaContext("idea-repo-100", "c3", [
    {
      id: "c1",
      idea_id: "idea-repo-100",
      parent_commit_id: null,
      q1_target_pain: "Pain 1",
      q2_solution: "Solution 1",
      q3_core_edge: "Edge 1",
      status: "completed",
      emotional_score: 42,
      created_at: "2026-09-01T00:00:00Z",
    },
    {
      id: "c2",
      idea_id: "idea-repo-100",
      parent_commit_id: "c1",
      q1_target_pain: "Pain 2",
      q2_solution: "Solution 2",
      q3_core_edge: "Edge 2",
      status: "completed",
      emotional_score: 68,
      created_at: "2026-09-01T01:00:00Z",
    },
    {
      id: "c3",
      idea_id: "idea-repo-100",
      parent_commit_id: "c2",
      q1_target_pain: "Pain 3 (Active HEAD)",
      q2_solution: "Solution 3",
      q3_core_edge: "Edge 3",
      status: "completed",
      emotional_score: 82,
      created_at: "2026-09-01T02:00:00Z",
    },
  ]);

  const state1 = useIdeaStore.getState();
  assert.equal(state1.active_commit_id, "c3");
  assert.equal(state1.viewing_commit_id, "c3");
  assert.equal(state1.isDetachedHead, false, "Initial active state must NOT be detached head");
  assert.equal(state1.activeVersion, "v3");
  assert.equal(state1.viewingVersion, "v3");

  // 3-2. 過去バージョン c2 (v2) へのタイムトラベル
  store.setViewingCommit("c2");
  const state2 = useIdeaStore.getState();
  assert.equal(state2.viewing_commit_id, "c2");
  assert.equal(state2.active_commit_id, "c3");
  assert.equal(state2.isDetachedHead, true, "Viewing past commit c2 must trigger isDetachedHead=true");
  assert.equal(state2.viewingVersion, "v2");
  assert.equal(state2.activeVersion, "v3");

  // 3-3. フォーム値の復元確認
  const restoredValues = store.getRestoredInputValues("c2");
  assert.ok(restoredValues, "Must return restored values");
  assert.equal(restoredValues.q1_target_pain, "Pain 2");
  assert.equal(restoredValues.q2_solution, "Solution 2");

  // 3-4. 最新への復帰 (Checkout HEAD)
  store.checkoutLatest();
  const state3 = useIdeaStore.getState();
  assert.equal(state3.viewing_commit_id, "c3");
  assert.equal(state3.active_commit_id, "c3");
  assert.equal(state3.isDetachedHead, false, "Checkout HEAD must clear isDetachedHead");
  assert.equal(state3.viewingVersion, "v3");

  console.log("  3-1. Initial Context: HEAD =", state1.activeVersion, "Detached =", state1.isDetachedHead);
  console.log("  3-2. Time-Travel to c2: Viewing =", state2.viewingVersion, "HEAD =", state2.activeVersion, "Detached =", state2.isDetachedHead);
  console.log("  3-3. Restored Form Values from c2:", restoredValues.q1_target_pain);
  console.log("  3-4. Checkout Latest: Viewing =", state3.viewingVersion, "Detached =", state3.isDetachedHead);
  console.log("  ✅ PASS: Zustand Detached HEAD 制御と Checkout 復帰が完全適合\n");

  // ----------------------------------------------------------------------------
  // 4. カンバンボード HEAD 参照と厚みバッジの計算ロジック検証 (要件3)
  // ----------------------------------------------------------------------------
  console.log("▶ [AUDIT 4]: カンバンボード HEAD 参照と厚みバッジ (Thickness Badge) の検証...");

  const testIdea = {
    id: "idea-repo-100",
    title: "AI CRM Automation",
    active_commit_id: "c3",
    idea_commits: sampleCommits,
  };

  const ideaVersionMap = computeCommitTreeVersions(testIdea.idea_commits, testIdea.active_commit_id);
  const headCommit = testIdea.idea_commits.find((c) => c.id === testIdea.active_commit_id);
  assert.ok(headCommit, "HEAD commit must be found");
  assert.equal(headCommit.id, "c3", "HEAD commit must match active_commit_id");

  const headVer = ideaVersionMap.get(headCommit.id);
  const badge = `${headVer} (Total ${testIdea.idea_commits.length} commits)`;
  assert.equal(headVer, "v3");
  assert.equal(badge, "v3 (Total 5 commits)");

  console.log("  4-1. Idea Repository Title:", testIdea.title);
  console.log("  4-2. Active HEAD Commit ID:", headCommit.id);
  console.log("  4-3. Generated Version Thickness Badge:", badge);
  console.log("  ✅ PASS: カンバンボード用 HEAD 参照と厚みバッジ描画ロジックが完全適合\n");

  console.log("================================================================================");
  console.log("🎉 ALL 4 AUDIT SUITES FULLY VERIFIED & PASSED (100% COMPLIANT)!");
  console.log("================================================================================\n");
}

runGitForIdeasAudit().catch((err) => {
  console.error("❌ Git for Ideas audit failed:", err);
  process.exit(1);
});
