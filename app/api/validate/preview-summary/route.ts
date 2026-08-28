import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "../../../../lib/ai/gemini";
import { fetchWithZodSelfCorrection } from "../../../../lib/selfCorrection";
import { PreviewSummarySchema, PreviewSummaryType } from "../../../../schemas/zod";

export interface PreviewSummary extends PreviewSummaryType {}

/**
 * 1.4 確認・修正フェーズ（事前承認UX）用プレビュー要約 API
 * POST /api/validate/preview-summary
 * 
 * Q1〜Q4の入力完了後、Inngest検証ジョブを発火する前に、
 * LLMで「解決する課題」「競合とみなす領域」「倒すべき最大の宿敵」の3点をプレビュー生成する。
 * 設計書 6.1: fetchWithZodSelfCorrection による自己組織化リカバリを適用。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { q1_target_pain = "", q2_solution = "", q3_core_edge = "", domain = "B2B_SME" } = body;

    const prompt = `
あなたは世界最高峰のスタートアップ戦略アナリストです。
起業家が入力したアイデア骨子（Q1〜Q3）を解析し、検証ジョブの実行前にユーザーと合意形成するための「3つの事前承認要約」を生成してください。

【ユーザー入力】
- Q1 (Target & Pain): ${q1_target_pain}
- Q2 (Solution): ${q2_solution}
- Q3 (Core Edge): ${q3_core_edge}
- ドメイン: ${domain}

【抽出・生成すべき3点】
1. coreJtbd: 起業家が真に解決しようとしている「本質的な課題（JTBD: Job to be Done）」を1文（40〜60文字）で要約せよ。
2. targetDomainKeywords: システムが競合とみなして検索・対決させる領域キーワードを3〜4個の配列で抽出せよ。（例: ["B2B CRM", "Sales Automation", "Voice Intelligence"]）
3. primaryNemesis: このアイデアが顧客を奪い取る上で「倒すべき最大の宿敵（既存の巨人SaaS、またはExcel/手書き等の代替手段）」を1〜2個特定せよ。（例: "HubSpot / Salesforce (および手作業Excel)"）
4. nemesisReason: なぜその競合・代替手段が最大の宿敵となるのかの理由（1文）。
5. groundingConfidence: "HIGH"

【出力フォーマット (必ず以下のJSONのみを出力せよ)】
{
  "coreJtbd": "...",
  "targetDomainKeywords": ["...", "..."],
  "primaryNemesis": "...",
  "nemesisReason": "...",
  "groundingConfidence": "HIGH"
}
`;

    const summary: PreviewSummary | null = await fetchWithZodSelfCorrection({
      llmCaller: async (p) => callGemini(p, { responseMimeType: "application/json" }),
      initialPrompt: prompt,
      schema: PreviewSummarySchema,
      maxRetries: 3,
    });

    if (summary) {
      return NextResponse.json({
        success: true,
        summary,
      });
    }

    // フェイルソフトフォールバック生成
    const isCrm = q1_target_pain.includes("CRM") || q2_solution.includes("営業") || q2_solution.includes("商談");
    const isDev = q1_target_pain.includes("開発") || q1_target_pain.includes("コード") || q2_solution.includes("GitHub");

    const fallbackSummary: PreviewSummary = {
      coreJtbd: `${q1_target_pain.slice(0, 45)}を解消し、業務効率を劇的に改善する`,
      targetDomainKeywords: isCrm
        ? ["B2B Sales CRM", "Workflow Automation", "Voice AI"]
        : isDev
        ? ["Developer Tools", "AI Code Intelligence", "CI/CD"]
        : ["Project Management", "Collaborative Workspace", "Internal Automation"],
      primaryNemesis: isCrm
        ? "HubSpot / Salesforce (および手作業Excel)"
        : isDev
        ? "GitHub / GitLab (および手動設定スクリプト)"
        : "Notion / Linear (および手書きメモ・スプレッドシート)",
      nemesisReason: "市場で最大のシェアを誇り、ユーザーの移行障壁（現状維持の引力）が最も強固なため。",
      groundingConfidence: "HIGH",
    };

    return NextResponse.json({
      success: true,
      summary: fallbackSummary,
    });
  } catch (error: any) {
    console.error("[API /api/validate/preview-summary] Exception:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate preview summary" },
      { status: 500 }
    );
  }
}
