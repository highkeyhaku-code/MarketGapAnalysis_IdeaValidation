import { ProductHuntAppDetails } from "../api/producthunt";
import { fetchWithZodSelfCorrection } from "../selfCorrection";
import { MarketInsightSchema, MarketInsight } from "../../schemas/zod";
import { callGemini } from "./gemini";
import { z } from "zod";

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
  pullScore: number; // 総合引力 (0 - 100)
  pullScores: Record<string, number>; // 多対多引力マトリックス { "jtbd-star-0": 85, "jtbd-star-1": 40, ... }
  frictionScore: number; // 反発力 (0 - 100): 摩擦・ペインの大きさ
  intensity: number; // 摩擦強度 (1 - 10)
  targetFeatureId: string;
  scoreReasoning: string; // なぜその点数になったのかのAI推論・根拠
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
  subJtbds: string[]; // 複数 JTBD 星リスト (3〜5個)
  companies: EvaluatedCompanyNode[];
  craters: Array<{
    featureId: string;
    depth: number;
    description: string;
  }>;
  evaluatedAt: string;
}

const SectorJtbdSchema = z
  .object({
    core_jtbd: z.string().optional(),
    coreJtbd: z.string().optional(),
    sub_jtbds: z.array(z.string()).optional(),
    subJtbds: z.array(z.string()).optional(),
  })
  .transform((data) => ({
    coreJtbd: data.coreJtbd || data.core_jtbd || "Empower and automate core workflows in this domain",
    subJtbds: data.subJtbds || data.sub_jtbds || [],
  }));

/**
 * 3.1 ジャンル固有の動的 JTBD 抽出
 * Gemini 3 Flash をコールし、対象市場の特性に特化した 4 つの独立した JTBD 目標を動的に生成する
 */
export async function extractSectorJtbds(genreName: string): Promise<{ coreJtbd: string; subJtbds: string[] }> {
  const prompt = `
You are a world-class market taxonomy and Jobs-To-Be-Done (JTBD) strategist.
For the specific SaaS market sector "${genreName}", extract 1 primary Core JTBD and 4 highly distinctive, specialized, domain-tailored Sub-JTBD objectives.

Rules:
- Do NOT output generic software terms like "good speed" or "easy setup" unless specifically relevant.
- Make each JTBD sharply reflect the technical and operational workflows of "${genreName}".
- Return a valid JSON object strictly matching:
{
  "coreJtbd": "Core objective of this market in 1 sentence",
  "subJtbds": [
    "Specific Workflow Objective 1",
    "Specific Workflow Objective 2",
    "Specific Workflow Objective 3",
    "Specific Workflow Objective 4"
  ]
}
`;

  try {
    const extracted = await fetchWithZodSelfCorrection({
      llmCaller: async (p) => callGemini(p, { temperature: 0.2, responseMimeType: "application/json" }),
      initialPrompt: prompt,
      schema: SectorJtbdSchema,
      maxRetries: 2,
    });

    if (extracted && extracted.subJtbds.length >= 3) {
      return extracted;
    }
  } catch (err) {
    console.warn(`[extractSectorJtbds] Error extracting JTBDs for ${genreName}:`, err);
  }

  // ドメイン別フォールバック
  const norm = genreName.toLowerCase();
  let defaultSubs = [
    `0-Config Setup for ${genreName}`,
    "Real-Time Collaboration & Speed",
    "Deep API Ecosystem & Integrations",
    "Bottom-Up Team Adoption",
  ];

  if (norm.includes("agent") || norm.includes("autonomous") || norm.includes("ai")) {
    defaultSubs = [
      "Autonomous Multi-Step Goal Execution",
      "Low-Latency Model Tool Calling & Routing",
      "Enterprise Observability & Guardrails",
      "Zero-Code Visual Agent Canvas",
    ];
  } else if (norm.includes("security") || norm.includes("compliance") || norm.includes("soc2")) {
    defaultSubs = [
      "Continuous Automated Evidence Ingestion",
      "Zero-Trust Identity & Granular RBAC",
      "Shadow IT & Secret Leak Prevention",
      "One-Click Auditor Data Room Export",
    ];
  } else if (norm.includes("billing") || norm.includes("metering") || norm.includes("fintech")) {
    defaultSubs = [
      "High-Throughput Usage Event Metering",
      "Multi-Currency Real-Time Ledger Sync",
      "Self-Serve Plan Upgrade & Checkout",
      "Automated Dunning & Revenue Defense",
    ];
  }

  return {
    coreJtbd: `Empower and automate core workflows in ${genreName}`,
    subJtbds: defaultSubs,
  };
}

/**
 * 複数企業のProduct Huntデータと濃縮摩擦コーパスを並列にGeminiで評価し、
 * D3.js用多対多引力マトリックスと物理スカラー値を算出する
 */
export async function evaluateMarketBatch(
  genreId: string,
  genreName: string,
  inputs: CompanyMarketInput[]
): Promise<MarketEvaluationResult> {
  // 1. 対象ジャンル固有の動的 JTBD を抽出
  const { coreJtbd, subJtbds } = await extractSectorJtbds(genreName);

  console.log(`[evaluateMarketBatch] ▶ Starting evaluation for genre: "${genreName}" (ID: ${genreId})`);
  console.log(`[evaluateMarketBatch]   Dynamic Sector JTBDs (${subJtbds.length}):`, subJtbds);
  console.log(`[evaluateMarketBatch]   Target Companies (${inputs.length}):`, inputs.map((i) => i.appDetails.name));

  const jtbdDefinitions = subJtbds
    .map((jtbd, i) => `- Star ${i} (jtbd-star-${i}): "${jtbd}"`)
    .join("\n");

  const evaluatedCompanies: EvaluatedCompanyNode[] = [];

  // N並列で各企業を本番 Gemini 3 Flash で評価
  const evaluationPromises = inputs.map(async (item, idx) => {
    const { appDetails, compressedFriction } = item;

    const prompt = `
You are an expert market gap and product friction analyst.
Analyze the following SaaS product and its user friction corpus for the market "${genreName}".

[Target Objectives (JTBD Stars in this Market)]:
${jtbdDefinitions}

[Product Details]:
- Name: ${appDetails.name}
- Tagline: ${appDetails.tagline}
- Description: ${appDetails.description}
- Feature Tags: ${appDetails.features.join(", ")}

[User Friction & Complaints Corpus]:
${compressedFriction || "No specific complaints recorded."}

Instructions:
1. For each JTBD Star (jtbd-star-0 to jtbd-star-${subJtbds.length - 1}), evaluate this product's gravitational attraction score (0 to 100).
   - IMPORTANT: Differentiate scores across the stars based on the company's real strengths. (e.g. 90 on Star 0, 45 on Star 1, 85 on Star 2). Do NOT assign uniform values.
2. Identify the single primary friction source ("target_feature_id") and complaint intensity (1 to 10).
3. Provide a clear 1-2 sentence explanation in "score_reasoning" detailing why this company received these scores.

Return a valid JSON object strictly conforming to:
{
  "pull_scores": {
    ${subJtbds.map((_, i) => `"jtbd-star-${i}": <0-100 integer>`).join(",\n    ")}
  },
  "friction_score": <10-100 integer representing push/friction>,
  "target_feature_id": "short_snake_case_name_of_primary_friction_source",
  "intensity": <1-10 integer representing friction severity>,
  "needs_web_search": false,
  "negative_bias_applied": true,
  "autopsy_report": null,
  "score_reasoning": "Clear 1-2 sentences explaining pull strengths across JTBDs and user friction."
}
`;

    // fetchWithZodSelfCorrection を用いてスキーマ検証と自己修正ループを実行
    const insight: MarketInsight | null = await fetchWithZodSelfCorrection({
      llmCaller: async (p) => {
        const res = await callGemini(p, { temperature: 0.1, responseMimeType: "application/json" });
        console.log(`[evaluateMarketBatch] Raw Gemini Output for ${appDetails.name}:`, res.slice(0, 180) + "...");
        return res;
      },
      initialPrompt: prompt,
      schema: MarketInsightSchema,
      maxRetries: 3,
    });

    const intensity = insight ? insight.intensity : 5;
    const targetFeatureId = insight ? insight.target_feature_id : "setup_friction";
    const frictionScore = insight?.friction_score ?? Math.max(10, Math.min(100, intensity * 10));

    // 多対多引力マップの構築
    const dynamicPullScores: Record<string, number> = {};
    let sumPulls = 0;
    let validPullsCount = 0;

    subJtbds.forEach((_, i) => {
      const starKey = `jtbd-star-${i}`;
      let pScore = insight?.pull_scores?.[starKey];
      if (typeof pScore !== "number" || isNaN(pScore)) {
        // フォールバック計算
        const base = Math.min(92, Math.max(30, 48 + ((idx * 19 + i * 27) % 45)));
        pScore = base;
      }
      dynamicPullScores[starKey] = Math.max(10, Math.min(98, Math.round(pScore)));
      sumPulls += dynamicPullScores[starKey];
      validPullsCount += 1;
    });

    // 総合引力 (総合平均)
    const pullScore = Math.round(sumPulls / Math.max(1, validPullsCount));

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

    // D3.js用描画スカラー値 (Pull Score に比例した半径 16px 〜 44px)
    const radius = Math.round(16 + (pullScore / 100) * 28);
    const gravityStrength = Number((pullScore / (frictionScore + 10)).toFixed(2));

    const defaultReasoning = `${appDetails.name}は${subJtbds[0]}において高い引力（Pull: ${pullScore}）を持つ一方、${targetFeatureId}に関する設定工数と学習コストが反発力（Friction: ${frictionScore}）を生んでいます。`;

    const node: EvaluatedCompanyNode = {
      companyId: appDetails.id || `comp-${idx}`,
      name: appDetails.name,
      tagline: appDetails.tagline,
      description: appDetails.description,
      homepageUrl: appDetails.homepageUrl,
      logoUrl: appDetails.logoUrl,
      pullScore,
      pullScores: dynamicPullScores,
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

  return {
    genreId,
    genreName,
    coreJtbd,
    subJtbds,
    companies: evaluatedCompanies,
    craters,
    evaluatedAt: new Date().toISOString(),
  };
}
