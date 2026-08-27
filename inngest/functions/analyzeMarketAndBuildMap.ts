import { inngest, AnalyzeMarketEventData } from "../client";
import { supabaseAdmin } from "../../lib/supabaseClient";

/**
 * 非同期ジョブ: 市場分析＆マップ構築 (analyzeMarketAndBuildMap)
 * - 429レート制限対策: concurrency limit = 12
 * - 自動リトライ: retries = 3 (指数バックオフ)
 * - フェイルソフト機構: Promise.allSettledで取得企業数5社未満ならリトライエラーを送出
 * - job_status テーブルを逐次更新
 */
export const analyzeMarketAndBuildMap = inngest.createFunction(
  {
    id: "analyze-market-and-build-map",
    name: "Analyze Market and Build Gap Map",
    triggers: [{ event: "market/analyze.requested" }],
    concurrency: {
      limit: 12,
    },
    retries: 3,
  },
  async ({ event, step }) => {
    const { jobId, genreId, genreName, userId } = event.data as AnalyzeMarketEventData;

    // Step 1: ジョブ開始ステータスを更新 (10%)
    await step.run("initialize-job-status", async () => {
      await supabaseAdmin.from("job_status").upsert({
        id: jobId,
        user_id: userId,
        status: "fetching_market_sources",
        percentage: 10,
        error_message: null,
      });
      return { status: "initialized" };
    });

    // Step 2: 外部データソース（Tavily, ProductHunt, GitHub等）からの並列フェッチ (フェイルソフト機構)
    const fetchedCompanies = await step.run("fetch-source-data-fail-soft", async () => {
      await supabaseAdmin.from("job_status").update({
        percentage: 35,
        status: "querying_multi_sources",
      }).eq("id", jobId);

      // TODO: 実際の外部API（ProductHunt, Tavily, GitHub）フェッチロジック
      type SourceResult = { source: string; count: number; items: unknown[] };
      const sources: Promise<SourceResult>[] = [
        Promise.resolve({ source: "producthunt", count: 3, items: [] }),
        Promise.resolve({ source: "tavily", count: 4, items: [] }),
        Promise.resolve({ source: "github", count: 2, items: [] }),
      ];

      const results = await Promise.allSettled(sources);
      const successfulFetches = results.filter(
        (r): r is PromiseFulfilledResult<SourceResult> => r.status === "fulfilled"
      );

      const totalRetrievedCount = successfulFetches.reduce((acc, curr) => acc + curr.value.count, 0);

      // 取得企業数が5社未満の場合はエラーとしてリトライキューへ回す
      if (totalRetrievedCount < 5) {
        throw new Error(
          `Fail-soft trigger: Only ${totalRetrievedCount} companies retrieved (minimum 5 required). Moving to retry queue.`
        );
      }

      return {
        totalRetrievedCount,
        sourcesCount: successfulFetches.length,
      };
    });

    // Step 3: Borda Count集計 & 物理スコア計算 (70%)
    await step.run("calculate-physical-scores-and-coordinates", async () => {
      await supabaseAdmin.from("job_status").update({
        percentage: 70,
        status: "calculating_scores_and_coordinates",
      }).eq("id", jobId);

      // TODO: calculate_borda_top10 RPC呼び出し & LLMによる特徴量抽出
      return { calculated: true };
    });

    // Step 4: market_cache 保存 & 完了通知 (100%)
    const finalResult = await step.run("save-market-cache-and-complete", async () => {
      const mockMaterializedJson = {
        genreId,
        genreName,
        generatedAt: new Date().toISOString(),
        coordinates: [],
        craters: [],
      };

      // market_cache に Upsert
      await supabaseAdmin.from("market_cache").upsert({
        genre_id: genreId,
        materialized_json: mockMaterializedJson,
        updated_at: new Date().toISOString(),
      });

      // job_status を completed に更新
      await supabaseAdmin.from("job_status").update({
        percentage: 100,
        status: "completed",
        result_data: mockMaterializedJson,
      }).eq("id", jobId);

      return { success: true, genreId };
    });

    return { jobId, result: finalResult, fetchedCompanies };
  }
);
