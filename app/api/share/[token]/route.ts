import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseClient";

/**
 * 投資家向け共有データ取得 API (マスキング処理済み)
 * GET /api/share/[token]
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    if (!token) {
      return NextResponse.json({ error: "Share token is required" }, { status: 400 });
    }

    // share_token 一致で idea_commits をフェッチ
    const { data: commit, error } = await supabaseAdmin
      .from("idea_commits")
      .select("id, share_token, status, emotional_score, semantic_diff, created_at, q4_supplementary_pains, ideas(title)")
      .eq("share_token", token)
      .single();

    if (error || !commit) {
      return NextResponse.json({ error: "Report not found or invalid token" }, { status: 404 });
    }

    const payload = (commit.q4_supplementary_pains as any) || {};

    // 【重要】マスキング: 内部の機密生入力 (raw_input) をパージし、整形済みパブリックデータのみ構築
    const maskedReport = {
      shareToken: commit.share_token,
      reportTitle: commit.ideas?.title || "Confidential Startup Hypothesis Audit",
      validatedAt: payload.validatedAt || commit.created_at,
      status: commit.status,
      survivesScore: commit.emotional_score ?? 65,
      // 公開サマリー
      publicSummary: {
        targetMarketCategory: payload.competitorProfile?.incumbentName ? `B2B/B2C vs ${payload.competitorProfile.incumbentName}` : "Enterprise SaaS",
        executiveSummary: commit.semantic_diff || "Objective market friction and barrier audit performed by AI Crash Engine.",
      },
      // 競合スペック比較
      benchmark: {
        incumbentName: payload.competitorProfile?.incumbentName || "Market Leader",
        incumbentTagline: payload.competitorProfile?.phDetails?.tagline || "Industry standard platform",
        elementDiffs: payload.scores?.elementDiffs || {},
      },
      // 心理負荷指標
      nutritionMetrics: payload.scores?.nutritionMetrics || {
        cognitiveLoad: 48,
        statusQuoGravity: 68,
        anxietyLevel: 42,
        totalScore: -3,
        penalizedCount: 2,
      },
      // 審査員フィードバック
      personas: (payload.personas || []).map((p: any) => ({
        persona: p.persona,
        name: p.name,
        title: p.title,
        verdict: p.verdict,
        coreCritique: p.coreCritique,
        recommendedCountermeasure: p.recommendedCountermeasure,
      })),
      // 死骸リポジトリ報告
      autopsyCount: payload.githubAutopsy?.totalCount || payload.githubAutopsy?.items?.length || 0,
      autopsyHighlights: (payload.githubAutopsy?.items || []).slice(0, 3).map((item: any) => ({
        name: item.name,
        stars: item.stargazers_count,
        description: item.description,
        lastPushed: item.pushed_at,
      })),
    };

    return NextResponse.json({ success: true, report: maskedReport });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
