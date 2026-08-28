import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "../../../../lib/ai/gemini";

export interface WhatIfCard {
  id: string;
  patternType: "constraint_destroyer" | "assumption_collision" | "unbundle_specialist" | "shadow_rebel";
  patternName: string;
  patternEmoji: string;
  provocativeQuestion: string; // 「もし、〜を破壊したら？」
  coreConcept: string; // 創出されるビジネスアイデアの要約
  editorDraft: {
    q1_target_pain: string;
    q2_solution: string;
    q3_core_edge: string;
    q4_target_literacy: "beginner" | "intermediate" | "advanced";
  };
}

export interface WhatIfResponse {
  success: boolean;
  cards: WhatIfCard[];
  targetCompetitor?: string;
  targetFeature?: string;
  error?: string;
}

/**
 * 4.4 What-If カードのオンデマンド遅延生成 API
 * POST /api/market/whatif
 * 
 * マップ描画時にはLLMを走らせず、ユーザーがクレーター／競合を選択して
 * 「ここでアイディアを生成」をクリックした瞬間に初めて Gemini を呼び出し、
 * 4つの What-If カードと 3ブロックエディタ用ドラフト JSON を生成する。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      genreName = "SaaS Platform",
      competitorName = "Incumbent",
      targetFeatureId = "general_friction",
      frictionScore = 75,
      pullScore = 60,
      coreJtbd = "Streamline business operations",
      description = "",
    } = body;

    const prompt = `
あなたは世界最高峰のスタートアップ・アイデア創出ストラテジストです。
既存の市場・巨人企業の「摩擦（クレーター / 不満）」から、認知バイアスを破壊する革新的な What-If アイデアを4パターン考案してください。

【対象市場情報】
- 市場領域 (Genre): ${genreName}
- 標的となる既存の巨人 (Competitor): ${competitorName}
- 競合の概要: ${description}
- 集中している摩擦・不満領域: ${targetFeatureId} (Friction Score: ${frictionScore}/100, Pull Score: ${pullScore}/100)
- 市場のコアJTBD: ${coreJtbd}

【生成すべき4つの黄金パターン】
1. 制約破壊 (Constraint Destroyer) [Emoji: 💥]: 既存製品が「前提」としている面倒な制約・設定・課金モデル・待機時間を完全に破壊する。
2. 常識衝突 (Assumption Collision) [Emoji: ⚡]: 業界の常識Aに、全く異なる異業種Bの常識や最新AI自律エージェントの概念を衝突させる。
3. アンバンドル特化 (Unbundle Specialist) [Emoji: 🎯]: 巨人の膨大で重厚な機能から、最も摩擦が強いこの1点だけを極限まで研ぎ澄まして切り出す。
4. 現場反逆・民主化 (Shadow Rebel) [Emoji: 🏴‍☠️]: 情シスや専任コンサル、長い研修を不要にし、現場の末端ユーザーが0秒で勝手に使い倒せるカウンター製品。

【出力フォーマット (必ず以下のJSONのみを出力せよ)】
{
  "cards": [
    {
      "id": "whatif-1",
      "patternType": "constraint_destroyer",
      "patternName": "制約破壊 (Constraint Destroyer)",
      "patternEmoji": "💥",
      "provocativeQuestion": "もし、〇〇という前提制約を完全に破壊したら？",
      "coreConcept": "アイデアの核心コンセプト概要（50文字程度）",
      "editorDraft": {
        "q1_target_pain": "30文字以上の具体的なペイン（誰が、どの作業で、どう困っているか）",
        "q2_solution": "30文字以上の具体的な解決策（どのような機能やUXでそれを解消するか）",
        "q3_core_edge": "既存の${competitorName}に対する圧倒的な優位性・構造的堀",
        "q4_target_literacy": "beginner"
      }
    },
    {
      "id": "whatif-2",
      "patternType": "assumption_collision",
      "patternName": "常識衝突 (Assumption Collision)",
      "patternEmoji": "⚡",
      "provocativeQuestion": "もし、〇〇の常識とAI自律化を衝突させたら？",
      "coreConcept": "アイデアの核心コンセプト概要",
      "editorDraft": {
        "q1_target_pain": "具体的なターゲットの不満・摩擦",
        "q2_solution": "常識を覆す自律的・高速なアプローチ",
        "q3_core_edge": "競合が構造上真似できないコアエッジ",
        "q4_target_literacy": "intermediate"
      }
    },
    {
      "id": "whatif-3",
      "patternType": "unbundle_specialist",
      "patternName": "アンバンドル特化 (Unbundle Specialist)",
      "patternEmoji": "🎯",
      "provocativeQuestion": "もし、${competitorName}の${targetFeatureId}機能だけを極限まで尖らせたら？",
      "coreConcept": "アイデアの核心コンセプト概要",
      "editorDraft": {
        "q1_target_pain": "多機能ゆえの肥大化・複雑さに対するペイン",
        "q2_solution": "単一ユースケース特化型の超軽量・高速ソリューション",
        "q3_core_edge": "0学習コストと1クリック完結による速度差",
        "q4_target_literacy": "beginner"
      }
    },
    {
      "id": "whatif-4",
      "patternType": "shadow_rebel",
      "patternName": "現場反逆・民主化 (Shadow Rebel)",
      "patternEmoji": "🏴‍☠️",
      "provocativeQuestion": "もし、情シスやコンサル不要で現場が勝手に導入できるようにしたら？",
      "coreConcept": "アイデアの核心コンセプト概要",
      "editorDraft": {
        "q1_target_pain": "導入・運用に莫大な社内承認と学習が必要なペイン",
        "q2_solution": "現場ボトムアップで即日稼働するノーコード・AI製品",
        "q3_core_edge": "圧倒的なバイラル性と導入摩擦ゼロのPLG設計",
        "q4_target_literacy": "beginner"
      }
    }
  ]
}
`;

    let generatedJson: any = null;
    try {
      const geminiRes = await callGemini(prompt, { responseMimeType: "application/json" });
      generatedJson = JSON.parse(geminiRes);
    } catch (llmErr) {
      console.warn("[API /api/market/whatif] Gemini error, using fallback rules:", llmErr);
      // フェイルソフトフォールバック生成
      generatedJson = {
        cards: [
          {
            id: "whatif-1",
            patternType: "constraint_destroyer",
            patternName: "制約破壊 (Constraint Destroyer)",
            patternEmoji: "💥",
            provocativeQuestion: `もし、${competitorName}の「設定や管理工数」という前提制約を完全に破壊したら？`,
            coreConcept: `${genreName}における設定ゼロ・完全バックグラウンド自動同期ハブ`,
            editorDraft: {
              q1_target_pain: `${competitorName}の複雑な初期設定と手動メンテナンスに毎週膨大な時間を浪費している。`,
              q2_solution: `AIが既存データを自動スキャンして0クリックで最適設定を自動構築する次世代${genreName}。`,
              q3_core_edge: `設定学習コストが完全にゼロであり、既存の${competitorName}の重厚なUIを無力化する。`,
              q4_target_literacy: "beginner",
            },
          },
          {
            id: "whatif-2",
            patternType: "assumption_collision",
            patternName: "常識衝突 (Assumption Collision)",
            patternEmoji: "⚡",
            provocativeQuestion: `もし、「ダッシュボードを見る」という常識を捨て、AIが勝手に意思決定したら？`,
            coreConcept: `画面を見ない自律型${genreName}エージェント`,
            editorDraft: {
              q1_target_pain: `ダッシュボードを開いてデータを集計・確認する作業自体が形骸化し、意思決定が遅れる。`,
              q2_solution: `Slackやチャット上で必要なアクションのみを自律的に提案・自動実行するAIワークフロー。`,
              q3_core_edge: `UIを一切操作させないアンチダッシュボード設計による10倍の実行速度。`,
              q4_target_literacy: "intermediate",
            },
          },
          {
            id: "whatif-3",
            patternType: "unbundle_specialist",
            patternName: "アンバンドル特化 (Unbundle Specialist)",
            patternEmoji: "🎯",
            provocativeQuestion: `もし、${competitorName}の${targetFeatureId}機能だけを切り出して極限まで研ぎ澄ましたら？`,
            coreConcept: `${targetFeatureId}特化型の超軽量・即効ソリューション`,
            editorDraft: {
              q1_target_pain: `${competitorName}の機能が肥大化しすぎて、特定の${targetFeatureId}機能を使うためだけに高額なプランを強いられている。`,
              q2_solution: `${targetFeatureId}の単一ワークフローに特化し、キーボードショートカットで秒速完結する専用ツール。`,
              q3_core_edge: `10分の1の価格と10倍の軽快な操作レスポンス。`,
              q4_target_literacy: "beginner",
            },
          },
          {
            id: "whatif-4",
            patternType: "shadow_rebel",
            patternName: "現場反逆・民主化 (Shadow Rebel)",
            patternEmoji: "🏴‍☠️",
            provocativeQuestion: `もし、全社導入を待たずに個人の現場担当者が勝手に使って勝てるツールにしたら？`,
            coreConcept: `現場ボトムアップで広がるバイラル型${genreName}`,
            editorDraft: {
              q1_target_pain: `会社の公式ツールが使いにくく、現場の業務スピードが著しく低下している。`,
              q2_solution: `個人アカウントで10秒で使い始められ、現場メンバー同士で自然拡散する草の根型プロダクト。`,
              q3_core_edge: `ボトムアップPLGによるCACゼロの自然拡散ループ。`,
              q4_target_literacy: "beginner",
            },
          },
        ],
      };
    }

    return NextResponse.json({
      success: true,
      cards: generatedJson.cards || [],
      targetCompetitor: competitorName,
      targetFeature: targetFeatureId,
    });
  } catch (error: any) {
    console.error("[API /api/market/whatif] Exception:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate what-if cards" },
      { status: 500 }
    );
  }
}
