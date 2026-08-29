import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseClient";
import { resolveTopCompaniesViaBorda } from "../../../../../lib/borda";
import { fetchProductHuntDetails } from "../../../../../lib/api/producthunt";
import { fetchFrictionCorpusFromTavily } from "../../../../../lib/api/tavily";
import { compressFrictionCorpus } from "../../../../../lib/compressFrictionCorpus";
import { evaluateMarketBatch, MarketEvaluationResult } from "../../../../../lib/ai/evaluateMarket";
import { Json } from "../../../../../types/database";

/**
 * 2.1 & 5.1 専用マップデータ取得 API
 * GET /api/market/map/[genreId]
 * 
 * - market_cache テーブルから指定の genreId に紐づく Materialized JSON を取得
 * - キャッシュが存在しない場合は、genres テーブルからジャンル名を取得して即時ライブ生成 & キャッシュ保存
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ genreId: string }> }
) {
  try {
    const { genreId } = await context.params;
    if (!genreId) {
      return NextResponse.json({ success: false, error: "genreId is required" }, { status: 400 });
    }

    // 1. market_cache を検索 (Layer 0)
    const { data: cacheRecord, error: cacheErr } = await supabaseAdmin
      .from("market_cache")
      .select("genre_id, materialized_json, updated_at")
      .eq("genre_id", genreId)
      .single();

    if (!cacheErr && cacheRecord && cacheRecord.materialized_json) {
      return NextResponse.json({
        success: true,
        isCached: true,
        updatedAt: cacheRecord.updated_at,
        mapData: cacheRecord.materialized_json,
      });
    }

    // 2. キャッシュがない場合: genres テーブルからジャンル情報を取得
    const { data: genreRecord, error: genreErr } = await supabaseAdmin
      .from("genres")
      .select("id, canonical_name, description, status")
      .eq("id", genreId)
      .single();

    if (genreErr || !genreRecord) {
      return NextResponse.json({ success: false, error: "Genre not found" }, { status: 404 });
    }

    const genreName = genreRecord.canonical_name;

    // 3. Borda カウント法で該当ジャンル固有の Top 10 社を数理選定
    const { topCompanyNames } = await resolveTopCompaniesViaBorda(genreName);
    const targetCompanies = topCompanyNames.slice(0, 10);

    // 4. 各社のデータと摩擦コーパスを並列取得
    const companyInputs = await Promise.all(
      targetCompanies.map(async (companyName) => {
        const [phDetails, tavilyResult] = await Promise.all([
          fetchProductHuntDetails(companyName),
          fetchFrictionCorpusFromTavily(companyName),
        ]);
        return {
          appDetails: phDetails,
          compressedFriction: compressFrictionCorpus(tavilyResult.rawFrictionCorpus, 3, 500),
        };
      })
    );

    // 5. AI バッチ評価 & 重力スカラー値計算
    const marketEvaluation: MarketEvaluationResult = await evaluateMarketBatch(
      genreId,
      genreName,
      companyInputs
    );

    const materializedJson = {
      genreId: marketEvaluation.genreId,
      genreName: marketEvaluation.genreName,
      status: genreRecord.status,
      description: genreRecord.description,
      coreJtbd: marketEvaluation.coreJtbd,
      coreJtbd_en: marketEvaluation.coreJtbd_en,
      coreJtbd_ja: marketEvaluation.coreJtbd_ja,
      subJtbds: marketEvaluation.subJtbds,
      jtbdList: marketEvaluation.jtbdList,
      companies: marketEvaluation.companies,
      craters: marketEvaluation.craters,
      generatedAt: marketEvaluation.evaluatedAt,
    };

    // 6. Layer 0 (market_cache) に非同期キャッシュ保存
    await supabaseAdmin.from("market_cache").upsert({
      genre_id: genreId,
      materialized_json: materializedJson as unknown as Json,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      isCached: false,
      mapData: materializedJson,
    });
  } catch (error: any) {
    console.error("[API /api/market/map/[genreId]] Exception:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch map data" },
      { status: 500 }
    );
  }
}
