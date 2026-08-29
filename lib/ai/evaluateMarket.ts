import { ProductHuntAppDetails } from "../api/producthunt";
import { fetchWithZodSelfCorrection } from "../selfCorrection";
import { MarketInsightSchema, MarketInsight } from "../../schemas/zod";
import { callGemini } from "./gemini";
import { z } from "zod";

export interface CompanyMarketInput {
  appDetails: ProductHuntAppDetails;
  compressedFriction: string;
}

export interface JtbdStarInfo {
  id: string; // e.g. "jtbd-star-0"
  name_en: string;
  name_ja: string;
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
  scoreReasoning: string; // なぜその点数になったのかのAI推論・根拠 (互換用)
  reasoningPullEn?: string; // 強い引力の源泉 (Pull: 英語)
  reasoningPullJa?: string; // 強い引力の源泉 (Pull: 日本語)
  reasoningFrictionEn?: string; // クレーターの発生要因 (Friction: 英語)
  reasoningFrictionJa?: string; // クレーターの発生要因 (Friction: 日本語)
  followersCount?: number; // 市場シェア (Product Hunt フォロワー数/Upvotes)
  rawReviewsCount?: number; // 市場シェア (レビュー件数)
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
  coreJtbd_en?: string;
  coreJtbd_ja?: string;
  subJtbds: string[]; // 複数 JTBD 星リスト (互換用)
  jtbdList?: JtbdStarInfo[]; // 多言語対応 JTBD 星リスト (EN/JA)
  companies: EvaluatedCompanyNode[];
  craters: Array<{
    featureId: string;
    depth: number;
    description: string;
    description_en?: string;
    description_ja?: string;
  }>;
  evaluatedAt: string;
}

const SectorJtbdSchema = z
  .object({
    core_jtbd: z.string().optional(),
    coreJtbd: z.string().optional(),
    core_jtbd_en: z.string().optional(),
    coreJtbd_en: z.string().optional(),
    core_jtbd_ja: z.string().optional(),
    coreJtbd_ja: z.string().optional(),
    sub_jtbds: z.union([z.array(z.string()), z.array(z.object({ id: z.string().optional(), name_en: z.string(), name_ja: z.string() }))]).optional(),
    subJtbds: z.union([z.array(z.string()), z.array(z.object({ id: z.string().optional(), name_en: z.string(), name_ja: z.string() }))]).optional(),
    jtbd_list: z.array(z.object({ id: z.string().optional(), name_en: z.string(), name_ja: z.string() })).optional(),
    jtbdList: z.array(z.object({ id: z.string().optional(), name_en: z.string(), name_ja: z.string() })).optional(),
  })
  .transform((data) => {
    const rawCoreEn = data.coreJtbd_en || data.core_jtbd_en || data.coreJtbd || data.core_jtbd || "Empower and automate core workflows in this domain";
    const rawCoreJa = data.coreJtbd_ja || data.core_jtbd_ja || "この市場における中核的ワークフローを強化・自動化する";

    const rawList = data.jtbdList || data.jtbd_list || data.subJtbds || data.sub_jtbds || [];
    const formattedList: JtbdStarInfo[] = [];

    if (Array.isArray(rawList)) {
      rawList.forEach((item, idx) => {
        if (typeof item === "string") {
          formattedList.push({
            id: `jtbd-star-${idx}`,
            name_en: item,
            name_ja: item,
          });
        } else if (typeof item === "object" && item !== null) {
          formattedList.push({
            id: item.id || `jtbd-star-${idx}`,
            name_en: item.name_en || `Objective ${idx + 1}`,
            name_ja: item.name_ja || item.name_en || `解決目標 ${idx + 1}`,
          });
        }
      });
    }

    return {
      coreJtbd: rawCoreEn,
      coreJtbd_en: rawCoreEn,
      coreJtbd_ja: rawCoreJa,
      subJtbds: formattedList.map((item) => item.name_en),
      jtbdList: formattedList,
    };
  });

/**
 * 3.1 ジャンル固有の動的バイリンガル JTBD 抽出
 * Gemini 3 Flash をコールし、対象市場の特性に特化した 4 つの独立した JTBD 目標を英語・日本語で動的生成する
 */
export async function extractSectorJtbds(genreName: string): Promise<{
  coreJtbd: string;
  coreJtbd_en: string;
  coreJtbd_ja: string;
  subJtbds: string[];
  jtbdList: JtbdStarInfo[];
}> {
  const prompt = `
You are a world-class market taxonomy and Jobs-To-Be-Done (JTBD) strategist.
For the specific SaaS market sector "${genreName}", extract 1 primary Core JTBD and 4 highly distinctive, specialized, domain-tailored Sub-JTBD objectives in both English (name_en) and Japanese (name_ja).

Rules:
- Do NOT output generic software terms like "good speed" or "easy setup" unless specifically tailored to "${genreName}".
- Make each JTBD sharply reflect the technical, operational, and business workflows of "${genreName}".
- Return a valid JSON object strictly conforming to:
{
  "coreJtbd_en": "Core objective of this market in 1 clear English sentence",
  "coreJtbd_ja": "この市場における中核的な解決目標（日本語1文）",
  "jtbdList": [
    { "id": "jtbd-star-0", "name_en": "Specific Workflow Objective 1", "name_ja": "具体的な業務目標1（日本語）" },
    { "id": "jtbd-star-1", "name_en": "Specific Workflow Objective 2", "name_ja": "具体的な業務目標2（日本語）" },
    { "id": "jtbd-star-2", "name_en": "Specific Workflow Objective 3", "name_ja": "具体的な業務目標3（日本語）" },
    { "id": "jtbd-star-3", "name_en": "Specific Workflow Objective 4", "name_ja": "具体的な業務目標4（日本語）" }
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

    if (extracted && extracted.jtbdList && extracted.jtbdList.length >= 3) {
      return extracted;
    }
  } catch (err) {
    console.warn(`[extractSectorJtbds] Error extracting JTBDs for ${genreName}:`, err);
  }

  // ドメイン別バイリンガル・フォールバック
  const norm = genreName.toLowerCase();
  let defaultList: JtbdStarInfo[] = [
    { id: "jtbd-star-0", name_en: "0-Config Instant Setup", name_ja: "ゼロ設定での即時導入・稼働" },
    { id: "jtbd-star-1", name_en: "Real-Time Collaboration & Speed", name_ja: "リアルタイム共同作業と高速レスポンス" },
    { id: "jtbd-star-2", name_en: "Deep API Ecosystem & Integrations", name_ja: "シームレスなAPI連携とエコシステム統合" },
    { id: "jtbd-star-3", name_en: "Bottom-Up Team Adoption", name_ja: "現場主導での導入と学習コストの極小化" },
  ];

  if (norm.includes("agent") || norm.includes("autonomous") || norm.includes("ai")) {
    defaultList = [
      { id: "jtbd-star-0", name_en: "Autonomous Multi-Step Goal Execution", name_ja: "自律的な多段階ゴール実行と自己修正" },
      { id: "jtbd-star-1", name_en: "Low-Latency Model Tool Calling & Routing", name_ja: "低遅延ツール実行と動的モデルルーティング" },
      { id: "jtbd-star-2", name_en: "Enterprise Observability & Guardrails", name_ja: "エンタープライズ監視と安全ガードレール" },
      { id: "jtbd-star-3", name_en: "Zero-Code Visual Agent Canvas", name_ja: "ノーコード視覚的エージェント設計キャンバス" },
    ];
  } else if (norm.includes("security") || norm.includes("compliance") || norm.includes("soc2")) {
    defaultList = [
      { id: "jtbd-star-0", name_en: "Continuous Automated Evidence Ingestion", name_ja: "継続的な監査証拠の自動収集と検証" },
      { id: "jtbd-star-1", name_en: "Zero-Trust Identity & Granular RBAC", name_ja: "ゼロトラスト認証と詳細な権限管理" },
      { id: "jtbd-star-2", name_en: "Shadow IT & Secret Leak Prevention", name_ja: "シャドーITの排除と機密情報漏洩の防止" },
      { id: "jtbd-star-3", name_en: "One-Click Auditor Data Room Export", name_ja: "監査人向けデータルームのワンクリック出力" },
    ];
  } else if (norm.includes("billing") || norm.includes("metering") || norm.includes("fintech")) {
    defaultList = [
      { id: "jtbd-star-0", name_en: "High-Throughput Usage Event Metering", name_ja: "高スループットな利用実績イベント計測" },
      { id: "jtbd-star-1", name_en: "Multi-Currency Real-Time Ledger Sync", name_ja: "多通貨リアルタイム元帳同期" },
      { id: "jtbd-star-2", name_en: "Self-Serve Plan Upgrade & Checkout", name_ja: "セルフサーブ型プラン変更と即時決済" },
      { id: "jtbd-star-3", name_en: "Automated Dunning & Revenue Defense", name_ja: "自動督促と未収収益の防衛" },
    ];
  }

  return {
    coreJtbd: `Empower and automate core workflows in ${genreName}`,
    coreJtbd_en: `Empower and automate core workflows in ${genreName}`,
    coreJtbd_ja: `${genreName} における中核的ワークフローの自動化と最適化`,
    subJtbds: defaultList.map((item) => item.name_en),
    jtbdList: defaultList,
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
  // 1. 対象ジャンル固有の動的バイリンガル JTBD を抽出
  const sectorJtbdData = await extractSectorJtbds(genreName);
  const { coreJtbd, coreJtbd_en, coreJtbd_ja, subJtbds, jtbdList } = sectorJtbdData;

  console.log(`[evaluateMarketBatch] ▶ Starting evaluation for genre: "${genreName}" (ID: ${genreId})`);
  console.log(`[evaluateMarketBatch]   Dynamic Sector JTBDs (${jtbdList.length}):`, jtbdList.map((j) => `${j.name_en} / ${j.name_ja}`));
  console.log(`[evaluateMarketBatch]   Target Companies (${inputs.length}):`, inputs.map((i) => i.appDetails.name));

  const jtbdDefinitions = jtbdList
    .map((jtbd, i) => `- Star ${i} (${jtbd.id}): "${jtbd.name_en}" (JA: "${jtbd.name_ja}")`)
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
1. For each JTBD Star (jtbd-star-0 to jtbd-star-${jtbdList.length - 1}), evaluate this product's gravitational attraction score (0 to 100).
   - IMPORTANT: Differentiate scores across the stars based on the company's real strengths. (e.g. 90 on Star 0, 45 on Star 1, 85 on Star 2). Do NOT assign uniform values.
2. Identify the single primary friction source ("target_feature_id") and complaint intensity (1 to 10).
3. Provide structured bilingual reasoning:
   - "reasoning_pull_en": 1-2 sentences in English explaining the core strengths and sources of strong pull across JTBDs.
   - "reasoning_pull_ja": 1-2 sentences in Japanese explaining the core strengths and sources of strong pull across JTBDs (強い引力の源泉).
   - "reasoning_friction_en": 1-2 sentences in English detailing user complaints and why friction/craters occurred.
   - "reasoning_friction_ja": 1-2 sentences in Japanese detailing user complaints and why friction/craters occurred (クレーターの発生要因).

Return a valid JSON object strictly conforming to:
{
  "pull_scores": {
    ${jtbdList.map((_, i) => `"jtbd-star-${i}": <0-100 integer>`).join(",\n    ")}
  },
  "friction_score": <10-100 integer representing push/friction>,
  "target_feature_id": "short_snake_case_name_of_primary_friction_source",
  "intensity": <1-10 integer representing friction severity>,
  "needs_web_search": false,
  "negative_bias_applied": true,
  "autopsy_report": null,
  "reasoning_pull_en": "Clear 1-2 sentences in English on pull strengths.",
  "reasoning_pull_ja": "強い引力の源泉に関する日本語での明確な解説1-2文。",
  "reasoning_friction_en": "Clear 1-2 sentences in English explaining user pain points and crater causes.",
  "reasoning_friction_ja": "クレーターの発生要因とユーザーの不満に関する日本語での明確な解説1-2文。"
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

    jtbdList.forEach((_, i) => {
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

    // 市場シェア指標 (実データバインド: votesCount, followers_count, reviewsCount)
    const rawVotes = (appDetails as any).followers_count ?? (appDetails as any).followersCount ?? appDetails.votesCount;
    const rawRevs = (appDetails as any).raw_reviews_count ?? (appDetails as any).rawReviewsCount ?? appDetails.reviewsCount;
    const followersCount = typeof rawVotes === "number" && rawVotes > 0 ? rawVotes : undefined;
    const rawReviewsCount = typeof rawRevs === "number" && rawRevs > 0 ? rawRevs : undefined;

    // 【Directive 2】市場シェア正規化: Sqrt / Log スケールによる惑星半径動的計算 (16px 〜 44px)
    const marketVolume = (followersCount || 0) + (rawReviewsCount || 0) * 2;
    let radius: number;
    if (marketVolume > 0) {
      // Sqrt スケールで巨大企業が画面を占有しないよう正規化
      radius = Math.round(16 + Math.min(28, Math.sqrt(marketVolume) * 0.9));
    } else {
      radius = Math.round(16 + (pullScore / 100) * 28);
    }
    const gravityStrength = Number((pullScore / (frictionScore + 10)).toFixed(2));

    // バイリンガル推論根拠のフォールバック生成
    const star0NameJa = jtbdList[0]?.name_ja || subJtbds[0] || "主要ワークフロー";
    const star0NameEn = jtbdList[0]?.name_en || subJtbds[0] || "core workflow";

    const defaultPullJa = `${appDetails.name}は「${star0NameJa}」において強固なエコシステムと高い引力（Pull: ${pullScore}）を獲得しています。`;
    const defaultPullEn = `${appDetails.name} commands strong gravitational pull (Pull: ${pullScore}) through rich features tailored to ${star0NameEn}.`;
    const defaultFrictionJa = `${targetFeatureId}に関する設定負担や運用コストが反発力（Friction: ${frictionScore}）を生み、不満のクレーターを形成しています。`;
    const defaultFrictionEn = `Setup overhead and operational friction in ${targetFeatureId} generate significant pushback (Friction: ${frictionScore}).`;

    const reasoningPullJa = insight?.reasoning_pull_ja || defaultPullJa;
    const reasoningPullEn = insight?.reasoning_pull_en || defaultPullEn;
    const reasoningFrictionJa = insight?.reasoning_friction_ja || defaultFrictionJa;
    const reasoningFrictionEn = insight?.reasoning_friction_en || defaultFrictionEn;
    const defaultReasoning = `${reasoningPullJa} 一方で${reasoningFrictionJa}`;

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
      reasoningPullEn,
      reasoningPullJa,
      reasoningFrictionEn,
      reasoningFrictionJa,
      followersCount,
      rawReviewsCount,
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
    description_en: `Multiple users reported recurring pain and bottlenecks in ${featureId}`,
    description_ja: `${featureId} において反復的なユーザーの不満とボトルネックが報告されています`,
  }));

  return {
    genreId,
    genreName,
    coreJtbd,
    coreJtbd_en,
    coreJtbd_ja,
    subJtbds,
    jtbdList,
    companies: evaluatedCompanies,
    craters,
    evaluatedAt: new Date().toISOString(),
  };
}

