import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getDefaultOrAuthUserId } from "@/lib/supabaseClient";
import { resolveTopCompaniesViaBorda } from "@/lib/borda";
import { fetchProductHuntDetails } from "@/lib/api/producthunt";
import { fetchFrictionCorpusFromTavily } from "@/lib/api/tavily";
import { compressFrictionCorpus } from "@/lib/compressFrictionCorpus";
import { evaluateMarketBatch, MarketEvaluationResult } from "@/lib/ai/evaluateMarket";
import { getUserCreditsProfile, isMarketUnlocked, PlanTier } from "@/lib/credits";
import { computeMarketTags } from "@/lib/marketTags";
import { isPortfolioMode } from "@/lib/portfolio";
import { Json } from "@/types/database";

export const dynamic = "force-dynamic";

/**
 * 🔒 Fog of War: 未アンロック市場向け機微データサニタイザー
 * 
 * 権限のないユーザーに対して、ネットワークタブや React State 経由で
 * 引力スコアや摩擦、AI推論データが漏洩するのを根本から遮断（null化）する。
 */
function sanitizeMapDataForFogOfWar(fullMapData: any) {
  const sanitizedCompanies = (fullMapData.companies || []).map((c: any) => ({
    companyId: c.companyId,
    name: c.name,
    tagline: c.tagline,
    description: c.description,
    homepageUrl: c.homepageUrl,
    logoUrl: c.logoUrl,
    // ぼかしキャンバスのレイアウト計算用幾何情報のみ保持
    x: c.x,
    y: c.y,
    radius: c.radius || 28,
    gravityStrength: c.gravityStrength || 1,
    // 機微データは物理的に null 化して完全遮断
    pullScore: null,
    pullScores: null,
    frictionScore: null,
    intensity: null,
    targetFeatureId: null,
    scoreReasoning: null,
    reasoningPullEn: null,
    reasoningPullJa: null,
    reasoningFrictionEn: null,
    reasoningFrictionJa: null,
    followersCount: null,
    rawReviewsCount: null,
    physicalScores: null,
    autopsyReport: null,
  }));

  const sanitizedCraters = (fullMapData.craters || []).map((cr: any) => ({
    featureId: cr.featureId,
    depth: null,
    description: "🔒 この市場のクレーター深層成分は保護されています (Fog of War: 要アンロック)",
    description_en: "🔒 Locked in Fog of War (Unlock required)",
    description_ja: "🔒 この市場のクレーター深層成分は保護されています (Fog of War: 要アンロック)",
  }));

  return {
    ...fullMapData,
    isLocked: true,
    companies: sanitizedCompanies,
    craters: sanitizedCraters,
  };
}

/**
 * 専用マップデータ取得 API
 * GET /api/market/map/[genreId]?userId=[userId]
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ genreId: string }> }
) {
  try {
    const { genreId } = await context.params;
    if (!genreId) {
      return NextResponse.json({ success: false, error: "genreId is required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    let userId = searchParams.get("userId");

    // 認証ヘッダーからのユーザー特定
    const authHeader = req.headers.get("authorization");
    if (!userId && authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: authData } = await supabaseAdmin.auth.getUser(token);
      userId = authData?.user?.id || null;
    }

    // 権限判定 (Founder / Studio は全開放、それ以外は user_unlocked_markets を参照)
    // ポートフォリオモード時はローカルストレージのアンロック状態 (?unlocked=true) を尊重
    let isUnlocked = false;
    let userPlanTier: PlanTier = "free";

    if (isPortfolioMode() && searchParams.get("unlocked") === "true") {
      isUnlocked = true;
    }

    if (!isUnlocked && userId) {
      try {
        const profile = await getUserCreditsProfile(userId);
        userPlanTier = profile.plan_tier;
        if (userPlanTier === "founder" || userPlanTier === "studio") {
          isUnlocked = true;
        } else {
          isUnlocked = await isMarketUnlocked(userId, genreId);
        }
      } catch (_e) {
        isUnlocked = false;
      }
    }

    // 1. market_cache を検索 (Layer 0)
    const { data: cacheRecord, error: cacheErr } = await supabaseAdmin
      .from("market_cache")
      .select("genre_id, materialized_json, updated_at")
      .eq("genre_id", genreId)
      .single();

    if (!cacheErr && cacheRecord && cacheRecord.materialized_json) {
      const cachedData = cacheRecord.materialized_json as any;
      const marketTags = computeMarketTags(cachedData, cachedData.status);

      const returnedMapData = isUnlocked
        ? { ...cachedData, isLocked: false, marketTags }
        : { ...sanitizeMapDataForFogOfWar(cachedData), marketTags };

      return NextResponse.json({
        success: true,
        isCached: true,
        isUnlocked,
        isLocked: !isUnlocked,
        userPlanTier,
        marketTags,
        updatedAt: cacheRecord.updated_at,
        mapData: returnedMapData,
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

    // 6. Layer 0 (market_cache) に非同期キャッシュ保存 (DBには常にフルデータを保持)
    await supabaseAdmin.from("market_cache").upsert({
      genre_id: genreId,
      materialized_json: materializedJson as unknown as Json,
      updated_at: new Date().toISOString(),
    });

    // 7. 5種の決定論的市場タグを算出
    const marketTags = computeMarketTags(materializedJson, genreRecord.status);

    const returnedMapData = isUnlocked
      ? { ...materializedJson, isLocked: false, marketTags }
      : { ...sanitizeMapDataForFogOfWar(materializedJson), marketTags };

    return NextResponse.json({
      success: true,
      isCached: false,
      isUnlocked,
      isLocked: !isUnlocked,
      userPlanTier,
      marketTags,
      updatedAt: new Date().toISOString(),
      mapData: returnedMapData,
    });
  } catch (err: any) {
    console.error("❌ [API /api/market/map/[genreId]] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
