import { inngest, HypothesisCrashEventData } from "../client";
import { supabaseAdmin } from "../../lib/supabaseClient";
import { searchArchivedGithubProjects } from "../../lib/githubSearch";
import { calculateDomainWeightedScores } from "../../lib/domainWeights";
import { PhysicalElement } from "../../schemas/zod";

/**
 * 非同期ジョブ: 仮説クラッシュ検証 (runHypothesisCrashJob)
 * - 429レート制限対策: concurrency limit = 10
 * - 自動リトライ: retries = 3
 * - GitHub 死骸リポジトリ検索 & 3xペナルティスコア計算
 * - job_status テーブルと idea_commits テーブルを更新
 */
export const runHypothesisCrashJob = inngest.createFunction(
  {
    id: "run-hypothesis-crash-job",
    name: "Run Hypothesis Crash and Reality Validation",
    triggers: [{ event: "hypothesis/crash.requested" }],
    concurrency: {
      limit: 10,
    },
    retries: 3,
  },
  async ({ event, step }) => {
    const { jobId, commitId, userId, domain, coreEdge, solution } =
      event.data as HypothesisCrashEventData;

    // Step 1: ジョブ初期化 (10%)
    await step.run("initialize-crash-status", async () => {
      await supabaseAdmin.from("job_status").upsert({
        id: jobId,
        user_id: userId,
        status: "analyzing_hypothesis",
        percentage: 10,
        error_message: null,
      });
      return { status: "initialized" };
    });

    // Step 2: GitHub 死骸検索 (40%)
    const githubCorpseResult = await step.run("search-github-corpses", async () => {
      await supabaseAdmin.from("job_status").update({
        percentage: 40,
        status: "searching_dead_repositories",
      }).eq("id", jobId);

      const searchResult = await searchArchivedGithubProjects(solution || coreEdge, 5);
      return searchResult;
    });

    // Step 3: 3xペナルティスコア計算 & 摩擦分析 (70%)
    const scoreResult = await step.run("calculate-scores", async () => {
      await supabaseAdmin.from("job_status").update({
        percentage: 70,
        status: "calculating_penalty_and_emotional_score",
      }).eq("id", jobId);

      // TODO: LLMによる物理要素差分の動的抽出
      const mockDiffs: Partial<Record<PhysicalElement, number>> = {
        switching_barrier: -2,
        integration_cost: 1,
        learning_curve: 0,
        ui_simplicity: 2,
        security_compliance: -1,
      };

      const domainScore = calculateDomainWeightedScores(mockDiffs, domain || "B2B_SME");
      // 感情スコア (モック計算)
      const emotionalScore = Math.max(0, Math.min(100, 70 + domainScore.totalScore));

      return {
        domainScore,
        emotionalScore,
      };
    });

    // Step 4: idea_commits および job_status の更新 (100%)
    const completionResult = await step.run("save-commit-results", async () => {
      // idea_commits のメタデータを更新
      await supabaseAdmin.from("idea_commits").update({
        status: "validated",
        emotional_score: scoreResult.emotionalScore,
        semantic_diff: `Validated with ${githubCorpseResult.totalCount} archived repos and domain penalty analysis.`,
        target_coordinates: { x: 50, y: 50 },
      }).eq("id", commitId);

      // job_status を completed に更新
      await supabaseAdmin.from("job_status").update({
        percentage: 100,
        status: "completed",
        result_data: {
          emotionalScore: scoreResult.emotionalScore,
          githubCorpsesCount: githubCorpseResult.totalCount,
          domainScore: scoreResult.domainScore,
        },
      }).eq("id", jobId);

      return { success: true, commitId };
    });

    return { jobId, result: completionResult };
  }
);
