import { inngest, AnalyzeMarketEventData } from "../client";
import { supabaseAdmin } from "../../lib/supabaseClient";
import { fetchProductHuntDetails, ProductHuntAppDetails } from "../../lib/api/producthunt";
import { fetchFrictionCorpusFromTavily } from "../../lib/api/tavily";
import { compressFrictionCorpus } from "../../lib/compressFrictionCorpus";
import { evaluateMarketBatch, MarketEvaluationResult, CompanyMarketInput } from "../../lib/ai/evaluateMarket";
import { evaluateDeltaSyncPipeline, DeltaSyncDecision } from "../../lib/deltaSync";
import { resolveTopCompaniesViaBorda } from "../../lib/borda";
import { Json } from "../../types/database";

/**
 * 非同期ジョブ: 市場分析＆重力マップ構築 (analyzeMarketAndBuildMap)
 * - 設計書 2.3 準拠: 時間正規化差分更新 (Delta Sync) による LLM 実行制御 (Level 1/2/3)
 * - 設計書 2.7 準拠: Supabase calculate_borda_top10 RPC による上位10社数理選定
 * - 429レート制限対策: concurrency limit = 5 (Inngest Free プラン上限準拠)
 * - 自動リトライ: retries = 3 (指数バックオフ)
 * - フェイルソフト機構: Promise.allSettledで取得企業数5社未満ならリトライキューへ回す
 */
export const analyzeMarketAndBuildMap = inngest.createFunction(
  {
    id: "analyze-market-and-build-map",
    name: "Analyze Market and Build Gap Map",
    triggers: [{ event: "market/analyze.requested" }],
    concurrency: {
      limit: 5,
      key: "event.data.userId",
    },
    retries: 3,
  },
  async ({ event, step }) => {
    const { jobId, genreId, genreName, userId } = event.data as AnalyzeMarketEventData;

    // 1. 進捗の初期化 & Delta Sync 差分判定 (10%)
    const deltaDecision: DeltaSyncDecision = await step.run("check-delta-sync-pipeline", async () => {
      await supabaseAdmin.from("job_status").upsert({
        id: jobId,
        user_id: userId,
        status: "⏱️ 差分更新パイプライン (Delta Sync) の評価中...",
        percentage: 10,
        error_message: null,
      });

      const decision = await evaluateDeltaSyncPipeline(genreId, genreName);
      return decision;
    });

    // 2. Level 1 または Level 2 で閾値未達の場合: LLMをスキップしてキャッシュを即時返却 (リソース保護)
    if (!deltaDecision.shouldRunLlm && deltaDecision.cachedData) {
      await step.run("return-cached-materialized-map", async () => {
        await supabaseAdmin.from("job_status").update({
          percentage: 100,
          status: "COMPLETED",
          result_data: deltaDecision.cachedData as unknown as Json,
        }).eq("id", jobId);
      });

      return {
        success: true,
        isCacheHit: true,
        level: deltaDecision.level,
        reason: deltaDecision.reason,
        result: deltaDecision.cachedData,
      };
    }

    // 3. データフェッチ: Supabase Borda RPC で複数ソースの Top 10 社を数理算出し、データを取得 (40%)
    const rawFetchedData = await step.run("fetch-source-data-via-borda-rpc", async () => {
      await supabaseAdmin.from("job_status").update({
        percentage: 30,
        status: "📊 Bordaカウント(RPC)による上位10社の選定とデータ取得中...",
      }).eq("id", jobId);

      // 設計書 2.7 & 3.6 準拠: Supabase calculate_borda_top10 RPC 経由で合意形成 Top 15 社を決定
      const { topCompanyNames } = await resolveTopCompaniesViaBorda(genreName);
      const targetCompanies = topCompanyNames.slice(0, 15); // 最大15社を対象に並列収集 (Section 3.6)

      // 各企業のProduct HuntデータとTavily摩擦データを並列フェッチ
      const fetchTasks = targetCompanies.map(async (companyName) => {
        const [phDetails, tavilyResult] = await Promise.all([
          fetchProductHuntDetails(companyName),
          fetchFrictionCorpusFromTavily(companyName),
        ]);
        return {
          appDetails: phDetails,
          rawFriction: tavilyResult.rawFrictionCorpus,
        };
      });

      const settledResults = await Promise.allSettled(fetchTasks);
      const successfulItems: Array<{ appDetails: ProductHuntAppDetails; rawFriction: string }> = [];

      for (const res of settledResults) {
        if (res.status === "fulfilled") {
          successfulItems.push(res.value);
        }
      }

      // 取得企業数が5社未満の場合はフェイルソフト機構によりリトライキューへ回す
      if (successfulItems.length < 5) {
        throw new Error(
          `Fail-soft trigger: Only ${successfulItems.length} companies retrieved (minimum 5 required). Moving to retry queue.`
        );
      }

      return successfulItems;
    });

    // 4. 摩擦テキスト濃縮: job_status を更新 (55%)
    const compressedInputs: CompanyMarketInput[] = await step.run("detect-and-compress-frictions", async () => {
      await supabaseAdmin.from("job_status").update({
        percentage: 55,
        status: "💀 ユーザーの「不満（摩擦）」を検知・濃縮中...",
      }).eq("id", jobId);

      // compressFrictionCorpus で摩擦キーワードを抽出し、上限3段落でテキストを濃縮
      return rawFetchedData.map((item) => ({
        appDetails: item.appDetails,
        compressedFriction: compressFrictionCorpus(item.rawFriction, 3, 500),
      }));
    });

    // 5. AI分析とスコア計算: Gemini 3 Flash で市場重力マップを解析 (80%)
    const marketEvaluation: MarketEvaluationResult = await step.run("ai-evaluation-and-gravity-scoring", async () => {
      await supabaseAdmin.from("job_status").update({
        percentage: 80,
        status: "🧠 AIによる市場重力マップとJTBDの解析中...",
      }).eq("id", jobId);

      const evaluation = await evaluateMarketBatch(genreId, genreName, compressedInputs);
      return evaluation;
    });

    // 6. キャッシュ保存と完了: Materialized JSON を market_cache へ Upsert。job_status を COMPLETED に更新 (100%)
    const finalResult = await step.run("save-market-cache-and-complete", async () => {
      const materializedJson = {
        genreId: marketEvaluation.genreId,
        genreName: marketEvaluation.genreName,
        coreJtbd: marketEvaluation.coreJtbd,
        coreJtbd_en: marketEvaluation.coreJtbd_en,
        coreJtbd_ja: marketEvaluation.coreJtbd_ja,
        subJtbds: marketEvaluation.subJtbds,
        jtbdList: marketEvaluation.jtbdList,
        companies: marketEvaluation.companies,
        craters: marketEvaluation.craters,
        generatedAt: marketEvaluation.evaluatedAt,
      };

      // market_cache テーブルへ Upsert
      await supabaseAdmin.from("market_cache").upsert({
        genre_id: genreId,
        materialized_json: materializedJson as unknown as Json,
        updated_at: new Date().toISOString(),
      });

      // job_status テーブルを COMPLETED に更新
      await supabaseAdmin.from("job_status").update({
        percentage: 100,
        status: "COMPLETED",
        result_data: materializedJson as unknown as Json,
      }).eq("id", jobId);

      return {
        success: true,
        genreId,
        companiesCount: marketEvaluation.companies.length,
      };
    });

    return {
      success: true,
      jobId,
      result: finalResult,
    };
  }
);
