import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "../../../../lib/ai/gemini";

export interface PivotSuggestionResponse {
  success: boolean;
  targetCrater: string;
  pivotRationale: string; // なぜこのピボットが勝てるのかの根拠
  suggestedQ1: string; // 修正版 Q1 Target & Pain
  suggestedQ3: string; // 修正版 Q3 Core Edge
  diffQ1Explanation: string; // Q1 の変更ポイント
  diffQ3Explanation: string; // Q3 の変更ポイント
}

/**
 * 3.3 Time-Travel 時のピボット提案自動生成 API
 * POST /api/ideas/pivot-suggestion
 * 
 * マップ上のクレーターまたは過去のコミットからピボットする際、
 * 選択されたクレーター（または直前のコミットの弱点）を克服する
 * 具体的なピボット案（Q1/Q3のドラフトDiff）をLLMで生成する。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      parentCommit,
      targetCrater = "セキュリティ・オンプレミス内製保存",
      genreName = "SaaS Platform",
    } = body;

    const prompt = `
あなたは世界最高峰のスタートアップ・ピボットストラテジストです。
起業家が過去のコミットから「新たな市場のクレーター（未充足の深い摩擦）」へピボットしようとしています。
過去のアイデア骨子を保持しつつ、ターゲットクレーターを解決するための「具体的ピボット案（Diff提案）」を作成してください。

【ターゲットクレーター (狙う空白地帯)】: ${targetCrater}
【対象市場】: ${genreName}

【前回のコミット内容】:
- Q1 (Target & Pain): ${parentCommit?.q1_target_pain || "汎用的な業務効率化ツール"}
- Q2 (Solution): ${parentCommit?.q2_solution || "AIによる自動化プラットフォーム"}
- Q3 (Core Edge): ${parentCommit?.q3_core_edge || "使いやすいUI"}

【生成すべき内容】
1. pivotRationale: 「💡 ピボット案：選択したクレーター（${targetCrater}）を解決するために、以下のように変更してみませんか？」という1〜2文の戦略的アドバイス。
2. suggestedQ1: ターゲットクレーターに焦点を絞った、より解像度の高い具体的な Q1 Target & Pain（35文字以上）。
3. suggestedQ3: そのクレーターで競合を完全に無力化する独自の Q3 Core Edge（30文字以上）。
4. diffQ1Explanation: Q1 の変更ポイントの要約（1文）。
5. diffQ3Explanation: Q3 の変更ポイントの要約（1文）。

【出力フォーマット (必ず以下のJSONのみを出力せよ)】
{
  "targetCrater": "${targetCrater}",
  "pivotRationale": "💡 ピボット案：...",
  "suggestedQ1": "...",
  "suggestedQ3": "...",
  "diffQ1Explanation": "...",
  "diffQ3Explanation": "..."
}
`;

    let suggestion: any = null;

    try {
      const geminiRes = await callGemini(prompt, { responseMimeType: "application/json" });
      suggestion = JSON.parse(geminiRes);
    } catch (err) {
      console.warn("[API /api/ideas/pivot-suggestion] Gemini error, using fallback:", err);
      suggestion = {
        targetCrater,
        pivotRationale: `💡 ピボット案：選択したクレーター（${targetCrater}）を解決するために、ターゲットと構造的エッジを特化させましょう。`,
        suggestedQ1: `${parentCommit?.q1_target_pain || "現場担当者"}において、特に「${targetCrater}」の制約により既存SaaSの導入が阻まれている課題に特化する。`,
        suggestedQ3: `競合が構造上対応できない「${targetCrater}」を0-configでクリアし、導入障壁（SETUP_COST）を完全にゼロにする。`,
        diffQ1Explanation: `ターゲットを「${targetCrater}」で困っているセグメントに絞り込みました。`,
        diffQ3Explanation: `クレーターを突破する独自の構造的堀（Moat）を明確化しました。`,
      };
    }

    return NextResponse.json({
      success: true,
      ...suggestion,
    });
  } catch (error: any) {
    console.error("[API /api/ideas/pivot-suggestion] Exception:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate pivot suggestion" },
      { status: 500 }
    );
  }
}
