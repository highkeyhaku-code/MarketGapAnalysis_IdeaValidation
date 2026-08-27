import { inngest, AnalyzeMarketEventData } from "../client";
import { supabaseAdmin } from "../../lib/supabaseClient";
import { fetchProductHuntDetails, ProductHuntAppDetails } from "../../lib/api/producthunt";
import { fetchFrictionCorpusFromTavily } from "../../lib/api/tavily";
import { compressFrictionCorpus } from "../../lib/compressFrictionCorpus";
import { evaluateMarketBatch, MarketEvaluationResult, CompanyMarketInput } from "../../lib/ai/evaluateMarket";
import { Json } from "../../types/database";

/**
 * ジャンル名に基づいたシード候補企業名リストの取得
 */
function getSeedCompaniesForGenre(genreName: string): string[] {
  const normalized = genreName.toLowerCase();
  if (normalized.includes("project") || normalized.includes("task") || normalized.includes("management")) {
    return ["Notion", "Linear", "Asana", "Monday.com", "ClickUp", "Trello"];
  }
  if (normalized.includes("crm") || normalized.includes("sales")) {
    return ["HubSpot", "Salesforce", "Pipedrive", "Attio", "Folk", "Close"];
  }
  if (normalized.includes("dev") || normalized.includes("code") || normalized.includes("git")) {
    return ["GitHub", "GitLab", "Linear", "Vercel", "Supabase", "Cursor"];
  }
  // デフォルト
  return ["Notion", "Linear", "HubSpot", "Airtable", "Framer", "Loom"];
}

/**
 * 非同期ジョブ: 市場分析＆重力マップ構築 (analyzeMarketAndBuildMap)
 * - 429レート制限対策: concurrency limit = 12
 * - 自動リトライ: retries = 3 (指数バックオフ)
 * - フェイルソフト機構: Promise.allSettledで取得企業数5社未満ならリトライキューへ回す
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

    // 3-1. 進捗の初期化: job_status を更新 (10%)
    await step.run("initialize-job-status", async () => {
      await supabaseAdmin.from("job_status").upsert({
        id: jobId,
        user_id: userId,
        status: "🔎 Product Huntから最新のプロダクトデータをフェッチ中...",
        percentage: 10,
        error_message: null,
      });
      return { status: "initialized" };
    });

    // 3-2. データフェッチ: Task 1 の関数を使い、対象企業群のデータを取得 (Promise.allSettled フェイルソフト機構)
    const rawFetchedData = await step.run("fetch-source-data-fail-soft", async () => {
      const targetCompanies = getSeedCompaniesForGenre(genreName);

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

    // 3-3. 進捗更新 & テキスト濃縮: job_status を更新 (40%)
    const compressedInputs: CompanyMarketInput[] = await step.run("detect-and-compress-frictions", async () => {
      await supabaseAdmin.from("job_status").update({
        percentage: 40,
        status: "💀 ユーザーの「不満（摩擦）」を検知中...",
      }).eq("id", jobId);

      // compressFrictionCorpus で摩擦キーワードを抽出し、上限3段落でテキストを濃縮
      return rawFetchedData.map((item) => ({
        appDetails: item.appDetails,
        compressedFriction: compressFrictionCorpus(item.rawFriction, 3, 500),
      }));
    });

    // 3-4. AI分析とスコア計算: Task 2 の関数を呼び出し、評価データとD3用スカラー値を算出 (75%)
    const marketEvaluation: MarketEvaluationResult = await step.run("ai-evaluation-and-gravity-scoring", async () => {
      await supabaseAdmin.from("job_status").update({
        percentage: 75,
        status: "🧠 AIによる市場重力マップとJTBDの解析中...",
      }).eq("id", jobId);

      const evaluation = await evaluateMarketBatch(genreId, genreName, compressedInputs);
      return evaluation;
    });

    // 3-5. キャッシュ保存と完了: D3.js用の構造（Materialized JSON）に整形し、market_cache へ Upsert。job_status を COMPLETED に更新 (100%)
    const finalResult = await step.run("save-market-cache-and-complete", async () => {
      const materializedJson = {
        genreId: marketEvaluation.genreId,
        genreName: marketEvaluation.genreName,
        coreJtbd: marketEvaluation.coreJtbd,
        subJtbds: marketEvaluation.subJtbds,
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

    return { jobId, result: finalResult, marketEvaluation };
  }
);
