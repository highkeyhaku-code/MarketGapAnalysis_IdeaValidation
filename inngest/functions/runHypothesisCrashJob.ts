import { inngest, HypothesisCrashEventData } from "../client";
import { supabaseAdmin } from "../../lib/supabaseClient";
import { searchArchivedGithubProjects } from "../../lib/githubSearch";
import { calculateDomainWeightedScores } from "../../lib/domainWeights";
import {
  generateThreeSkepticalPersonasFeedback,
  formatTribunalFeedbackForUI,
} from "../../lib/ai/personas";
import { fetchProductHuntDetails } from "../../lib/api/producthunt";
import { fetchFrictionCorpusFromTavily } from "../../lib/api/tavily";
import { compressFrictionCorpus } from "../../lib/compressFrictionCorpus";
import { callGemini } from "../../lib/ai/gemini";
import { PhysicalElement, DomainType, TribunalFeedback } from "../../schemas/zod";
import { Json } from "../../types/database";

/**
 * 非同期ジョブ: 仮説クラッシュ検証 (runHypothesisCrashJob)
 * 設計書 5.1 & 2.4.1 / 2.7 準拠
 * - 429レート制限対策: concurrency limit = 10
 * - 自動リトライ: retries = 3
 * - 競合スペック解析 & GitHub 死骸検索 & 3xペナルティスコア計算 & バイリンガル3ペルソナ審査 (TribunalFeedback)
 * - 最終ステップ (save-final-results-and-checkout-head) で正常完了時のみ HEAD を安全に更新 (Checkout)
 */
export const runHypothesisCrashJob = inngest.createFunction(
  {
    id: "run-hypothesis-crash-job",
    name: "Run Hypothesis Crash and Reality Validation",
    triggers: [{ event: "hypothesis/crash.requested" }],
    concurrency: {
      limit: 10,
      key: "event.data.userId",
    },
    retries: 3,
  },
  async ({ event, step }) => {
    const { jobId, commitId, userId, domain, coreEdge, solution, targetPain } =
      event.data as HypothesisCrashEventData;

    // (1) ジョブ初期化 & 標的競合スペック解析 (15%)
    const competitorProfile = await step.run("analyze-target-incumbent", async () => {
      await supabaseAdmin.from("job_status").upsert({
        id: jobId,
        user_id: userId,
        status: "倒すべき最大の標的のスペックを解析中...",
        percentage: 15,
        error_message: null,
      });

      // アイデアのキーワードからターゲット競合を特定
      const incumbentName = solution.toLowerCase().includes("crm")
        ? "HubSpot"
        : solution.toLowerCase().includes("dev") || solution.toLowerCase().includes("code")
        ? "GitHub"
        : "Notion";

      const [phDetails, tavilyResult] = await Promise.all([
        fetchProductHuntDetails(incumbentName),
        fetchFrictionCorpusFromTavily(incumbentName),
      ]);

      const compressedFriction = compressFrictionCorpus(tavilyResult.rawFrictionCorpus, 2, 400);

      return {
        incumbentName,
        phDetails,
        compressedFriction,
      };
    });

    // (2) GitHub 死骸（Autopsy）レポート検索 (40%)
    const githubCorpseResult = await step.run("search-github-corpses", async () => {
      await supabaseAdmin.from("job_status").update({
        percentage: 40,
        status: "💀 過去の類似死骸プロジェクト（Autopsy）を追跡中...",
      }).eq("id", jobId);

      const searchResult = await searchArchivedGithubProjects(solution || coreEdge, 6);
      return searchResult;
    });

    // (3) Gemini による9要素評価 & 3xペナルティスコア計算 (65%)
    const penaltyScoreResult = await step.run("calculate-3x-penalty-scores", async () => {
      await supabaseAdmin.from("job_status").update({
        percentage: 65,
        status: "⚡ 3xペナルティスコアと感情負荷を精密計算中...",
      }).eq("id", jobId);

      const prompt = `
Analyze the startup idea against the incumbent "${competitorProfile.incumbentName}".
Score the difference (diff) for each of the 9 physical elements between the idea and the incumbent.
Diff scale: -3 (Severe disadvantage for startup) to +3 (Significant advantage for startup).

Idea Details:
- Target Pain: ${targetPain}
- Solution: ${solution}
- Core Edge: ${coreEdge}

Return a valid JSON object with the integer score for each key:
{
  "integration_cost": number (-3 to 3),
  "switching_barrier": number (-3 to 3),
  "learning_curve": number (-3 to 3),
  "security_compliance": number (-3 to 3),
  "customizability": number (-3 to 3),
  "realtime_performance": number (-3 to 3),
  "price_sensitivity": number (-3 to 3),
  "ui_simplicity": number (-3 to 3),
  "network_effect": number (-3 to 3)
}
`;

      let elementDiffs: Partial<Record<PhysicalElement, number>> = {
        switching_barrier: -2,
        integration_cost: 1,
        learning_curve: 0,
        ui_simplicity: 2,
        security_compliance: -2,
        customizability: -1,
        realtime_performance: 1,
        price_sensitivity: 1,
        network_effect: -2,
      };

      try {
        const rawJson = await callGemini(prompt, { temperature: 0.1 });
        const parsed = JSON.parse(rawJson.replace(/```(?:json)?/g, "").trim());
        elementDiffs = parsed;
      } catch (_e) {
        // フォールバック
      }

      const activeDomain: DomainType = domain || "B2B_SME";
      const domainScore = calculateDomainWeightedScores(elementDiffs, activeDomain);

      // 感情スコア・認知負荷の計算
      const cognitiveLoad = Math.min(100, Math.max(15, 50 - domainScore.totalScore * 1.5));
      const statusQuoGravity = Math.min(100, Math.max(20, 60 + domainScore.penalizedCount * 8));
      const anxietyLevel = Math.min(100, Math.max(10, 45 + (domainScore.penalizedCount > 2 ? 25 : 0)));
      const emotionalScore = Math.max(0, Math.min(100, Math.round(100 - (cognitiveLoad * 0.4 + statusQuoGravity * 0.4 + anxietyLevel * 0.2))));

      return {
        elementDiffs,
        domainScore,
        emotionalScore,
        nutritionMetrics: {
          cognitiveLoad,
          statusQuoGravity,
          anxietyLevel,
          totalScore: domainScore.totalScore,
          penalizedCount: domainScore.penalizedCount,
        },
      };
    });

    // (4) 3人の懐疑的なペルソナによるバイリンガル審査員フィードバック (85%) [設計書 2.4 / 2.4.1]
    const tribunalFeedback = await step.run("gemini-step2-pro-critique", async () => {
      await supabaseAdmin.from("job_status").update({
        percentage: 85,
        status: "🔥 冷徹な3人のAI審査員（投資家・競合・顧客）による審査中...",
      }).eq("id", jobId);

      const feedback = await generateThreeSkepticalPersonasFeedback({
        q1_target_pain: targetPain,
        q2_solution: solution,
        q3_core_edge: coreEdge,
        domain,
        totalScore: penaltyScoreResult.emotionalScore,
        autopsyResults: githubCorpseResult,
      });

      return feedback;
    });

    // (5) DBへの書き込み、完了ステータス反映、および HEAD の自動Checkout (100%) [設計書 5.1 & 要件2]
    const completionResult = await step.run("save-final-results-and-checkout-head", async () => {
      const formattedPersonas = formatTribunalFeedbackForUI(tribunalFeedback);

      const fullValidationPayload = {
        competitorProfile,
        githubAutopsy: githubCorpseResult,
        scores: penaltyScoreResult,
        tribunal: tribunalFeedback, // TribunalFeedbackSchema 準拠のバイリンガル審査結果
        critique: tribunalFeedback, // 互換性エイリアス
        personas: formattedPersonas, // UI表示用配列
        validatedAt: new Date().toISOString(),
      };

      // ① idea_commits のメタデータを更新
      const { error: commitError } = await supabaseAdmin.from("idea_commits").update({
        status: "completed",
        emotional_score: penaltyScoreResult.emotionalScore,
        semantic_diff: `Autopsy identified ${githubCorpseResult.totalCount} failed projects. 3x penalty net score: ${penaltyScoreResult.domainScore.totalScore}. Verdict: ${tribunalFeedback.overall_verdict}`,
        target_coordinates: {
          x: 50,
          y: 50,
          nutritionMetrics: penaltyScoreResult.nutritionMetrics,
        } as unknown as Json,
        q4_supplementary_pains: fullValidationPayload as unknown as Json,
      }).eq("id", commitId);

      if (commitError) {
        console.error("[Inngest save-final-results-and-checkout-head] Commit update error:", commitError);
        throw new Error(`Failed to save commit results: ${commitError.message}`);
      }

      // ② 親IdeaのIDを取得
      const { data: commitData, error: lookupErr } = await supabaseAdmin
        .from("idea_commits")
        .select("idea_id")
        .eq("id", commitId)
        .single();

      const targetIdeaId = commitData?.idea_id || (event.data as any).ideaId;

      // ③ 【重要・フェイルセーフ】検証が正常終了した場合のみ、リポジトリの HEAD (active_commit_id) を新コミットに切り替える
      if (targetIdeaId) {
        try {
          const { error: updateHeadErr } = await supabaseAdmin
            .from("ideas")
            .update({
              active_commit_id: commitId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetIdeaId);

          if (updateHeadErr) {
            console.warn(
              `[Inngest save-final-results-and-checkout-head] Warning updating ideas.active_commit_id:`,
              updateHeadErr.message
            );
          }
        } catch (headErr) {
          console.warn("[Inngest] Safe HEAD checkout fallback:", headErr);
        }
      }

      // ④ job_status を COMPLETED に更新 (ユーザー向けポーリング完了通知)
      await supabaseAdmin.from("job_status").update({
        percentage: 100,
        status: "COMPLETED",
        result_data: fullValidationPayload as unknown as Json,
        updated_at: new Date().toISOString(),
      }).eq("id", jobId);

      return {
        success: true,
        commitId,
        ideaId: targetIdeaId,
        emotionalScore: penaltyScoreResult.emotionalScore,
        verdict: tribunalFeedback.overall_verdict,
      };
    });

    return { jobId, result: completionResult };
  }
);

