import { ProductHuntAppDetails } from "../api/producthunt";
import { fetchWithZodSelfCorrection } from "../selfCorrection";
import { MarketInsightSchema, MarketInsight } from "../../schemas/zod";
import { callGemini } from "./gemini";

export interface CompanyMarketInput {
  appDetails: ProductHuntAppDetails;
  compressedFriction: string;
}

export interface EvaluatedCompanyNode {
  companyId: string;
  name: string;
  tagline: string;
  description: string;
  homepageUrl: string;
  logoUrl?: string;
  pullScore: number; // 引力 (0 - 100): 機能充実度や市場支持
  frictionScore: number; // 反発力 (0 - 100): 摩擦・ペインの大きさ
  intensity: number; // 摩擦強度 (1 - 10)
  targetFeatureId: string;
  scoreReasoning?: string; // 【Directive 3】なぜその点数になったのかのAI推論・根拠
  physicalScores: {
    integration_cost: number;
    switching_barrier: number;
    learning_curve: number;
    security_compliance: number;
    customizability: number;
    realtime_performance: number;
    price_sensitivity: number;
    ui_simplicity: number;
    network_effect: number;
  };
  autopsyReport?: string | null;
  // D3.js 物理シミュレーション初期値
  x?: number;
  y?: number;
  radius: number;
  gravityStrength: number;
}

export interface MarketEvaluationResult {
  genreId: string;
  genreName: string;
  coreJtbd: string;
  subJtbds: string[]; // 【Directive 2】複数JTBD星
  companies: EvaluatedCompanyNode[];
  craters: Array<{
    featureId: string;
    depth: number;
    description: string;
  }>;
  evaluatedAt: string;
}

/**
 * 複数企業のProduct Huntデータと濃縮摩擦コーパスを並列にGeminiで評価し、
 * D3.js用物理スカラー値と構造化市場データを算出する
 */
export async function evaluateMarketBatch(
  genreId: string,
  genreName: string,
  inputs: CompanyMarketInput[]
): Promise<MarketEvaluationResult> {
  const evaluatedCompanies: EvaluatedCompanyNode[] = [];

  // N並列で各企業を評価
  const evaluationPromises = inputs.map(async (item) => {
    const { appDetails, compressedFriction } = item;

    const prompt = `
You are an expert market gap and product friction analyst.
Analyze the following SaaS product and its user friction corpus for the market "${genreName}".

[Product Details]:
- Name: ${appDetails.name}
- Tagline: ${appDetails.tagline}
- Description: ${appDetails.description}
- Feature Tags: ${appDetails.features.join(", ")}

[User Friction & Complaints Corpus]:
${compressedFriction || "No specific complaints recorded."}

Return a valid JSON object strictly conforming to the following fields:
{
  "target_feature_id": "short_snake_case_name_of_primary_friction_source",
  "intensity": 1 to 10 (integer representing how severe the friction or complaint is),
  "needs_web_search": false,
  "negative_bias_applied": true,
  "autopsy_report": null,
  "score_reasoning": "1-2 sentences explaining why this company received this pull and friction score based on its feature set and user complaints."
}
`;

    // fetchWithZodSelfCorrection を用いてスキーマ検証と自己修正ループを実行
    const insight: MarketInsight | null = await fetchWithZodSelfCorrection({
      llmCaller: async (p) => callGemini(p, { temperature: 0.1 }),
      initialPrompt: prompt,
      schema: MarketInsightSchema,
      maxRetries: 3,
    });

    const intensity = insight ? insight.intensity : 5;
    const targetFeatureId = insight ? insight.target_feature_id : "general_friction";

    // 引力 (Pull Score) 計算: Votes数, Reviews数, 機能数によるスケーリング
    const baseVotes = Math.min(100, Math.round(Math.log10(Math.max(1, appDetails.votesCount + 10)) * 30));
    const pullScore = Math.max(30, Math.min(95, baseVotes + appDetails.features.length * 4));

    // 反発力 (Friction Score) 計算: intensity (1-10) を 10-100 にスケーリング
    const frictionScore = Math.max(10, Math.min(100, intensity * 10));

    // 物理要素スコア (各要素 1〜10)
    const physicalScores = {
      integration_cost: Math.min(10, Math.max(1, Math.round(intensity * 0.9))),
      switching_barrier: Math.min(10, Math.max(1, Math.round((pullScore / 100) * 8))),
      learning_curve: Math.min(10, Math.max(1, Math.round(intensity * 0.8))),
      security_compliance: 6,
      customizability: Math.min(10, Math.max(1, Math.round((pullScore / 100) * 7))),
      realtime_performance: 7,
      price_sensitivity: Math.min(10, Math.max(1, Math.round(intensity * 0.7))),
      ui_simplicity: Math.max(1, 10 - Math.round(intensity * 0.6)),
      network_effect: Math.min(10, Math.max(1, Math.round((pullScore / 100) * 6))),
    };

    // D3.js用描画スカラー値
    const radius = Math.round(18 + (pullScore / 100) * 22);
    const gravityStrength = Number((pullScore / (frictionScore + 10)).toFixed(2));

    const defaultReasoning = `${appDetails.name}は${appDetails.features.slice(0, 2).join('・')}の機能充実により高い引力（Pull: ${pullScore}）を持つ一方、${targetFeatureId}に関する設定工数とスイッチング障壁が反発力（Friction: ${frictionScore}）を生んでいます。`;

    const node: EvaluatedCompanyNode = {
      companyId: appDetails.id,
      name: appDetails.name,
      tagline: appDetails.tagline,
      description: appDetails.description,
      homepageUrl: appDetails.homepageUrl,
      logoUrl: appDetails.logoUrl,
      pullScore,
      frictionScore,
      intensity,
      targetFeatureId,
      scoreReasoning: insight?.score_reasoning || defaultReasoning,
      physicalScores,
      autopsyReport: typeof insight?.autopsy_report === "string" ? insight.autopsy_report : null,
      radius,
      gravityStrength,
    };

    return node;
  });

  const results = await Promise.allSettled(evaluationPromises);
  for (const r of results) {
    if (r.status === "fulfilled") {
      evaluatedCompanies.push(r.value);
    }
  }

  // クレーター (摩擦の深い領域) を集計
  const featureFrictionMap: Record<string, { totalIntensity: number; count: number }> = {};
  for (const comp of evaluatedCompanies) {
    if (!featureFrictionMap[comp.targetFeatureId]) {
      featureFrictionMap[comp.targetFeatureId] = { totalIntensity: 0, count: 0 };
    }
    featureFrictionMap[comp.targetFeatureId].totalIntensity += comp.intensity;
    featureFrictionMap[comp.targetFeatureId].count += 1;
  }

  const craters = Object.entries(featureFrictionMap).map(([featureId, stat]) => ({
    featureId,
    depth: Number((stat.totalIntensity / stat.count).toFixed(1)),
    description: `Multiple users reported recurring pain and bottlenecks in ${featureId}`,
  }));

  // 【Directive 2】3〜5つの動的 JTBD の定義
  const subJtbds = [
    `0-Config & Fast Setup for ${genreName}`,
    `Real-Time Collaboration & Low Latency`,
    `Seamless Integration & Data Mobility`,
    `Self-Service Democratization (No-Consultant)`,
  ];

  return {
    genreId,
    genreName,
    coreJtbd: `Streamline and automate workflows in ${genreName}`,
    subJtbds,
    companies: evaluatedCompanies,
    craters,
    evaluatedAt: new Date().toISOString(),
  };
}
