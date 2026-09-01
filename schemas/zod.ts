import { z } from "zod";

// ==============================================================================
// 1. 物理要素 & ドメイン 定義
// ==============================================================================

export const PhysicalElementEnum = z.enum([
  "integration_cost",
  "switching_barrier",
  "learning_curve",
  "security_compliance",
  "customizability",
  "realtime_performance",
  "price_sensitivity",
  "ui_simplicity",
  "network_effect",
]);
export type PhysicalElement = z.infer<typeof PhysicalElementEnum>;

export const DomainTypeEnum = z.enum([
  "B2B_ENTERPRISE",
  "B2B_SME",
  "B2C_CONSUMER",
]);
export type DomainType = z.infer<typeof DomainTypeEnum>;

// ==============================================================================
// 2. 初期辞書生成スキーマ
// ==============================================================================

export const GenreDictionaryItemSchema = z.object({
  genre_id: z.string().uuid({ message: "genre_id must be a valid UUID" }),
  canonical_name: z.string().min(1, { message: "canonical_name is required" }),
  aliases: z.array(z.string()).min(1, { message: "aliases must contain at least one alias" }),
  description: z.string().min(1, { message: "description is required" }),
});
export type GenreDictionaryItem = z.infer<typeof GenreDictionaryItemSchema>;

export const GenreDictionarySchema = z.array(GenreDictionaryItemSchema);
export type GenreDictionary = z.infer<typeof GenreDictionarySchema>;

// ==============================================================================
// 3. IdeaInputSchema (入力バリデーション)
// ==============================================================================

export const TargetLiteracyEnum = z.enum([
  "non_tech",
  "tech_savvy",
  "developer",
  "beginner",
  "intermediate",
  "expert",
]);
export type TargetLiteracy = z.infer<typeof TargetLiteracyEnum>;

export const MonetizationModelEnum = z.enum([
  "subscription",
  "freemium",
  "usage_based",
  "one_time",
  "marketplace_take_rate",
]);
export type MonetizationModel = z.infer<typeof MonetizationModelEnum>;

export const IdeaInputSchema = z.object({
  q1_target_pain: z
    .string()
    .min(30, { message: "Target pain (Q1) must be between 30 and 1000 characters" })
    .max(1000, { message: "Target pain (Q1) must be between 30 and 1000 characters" }),
  q2_solution: z
    .string()
    .min(30, { message: "Solution (Q2) must be between 30 and 1000 characters" })
    .max(1000, { message: "Solution (Q2) must be between 30 and 1000 characters" }),
  q3_core_edge: z
    .string()
    .min(10, { message: "Core edge (Q3) must be between 10 and 1000 characters" })
    .max(1000, { message: "Core edge (Q3) must be between 10 and 1000 characters" }),
  q4_target_literacy: TargetLiteracyEnum,
  q4_monetization_model: MonetizationModelEnum.default("subscription"),
  q4_supplementary_pains: z.array(z.string()).default([]),
  parent_commit_id: z.string().uuid().nullable().optional(),
  domain: DomainTypeEnum.default("B2B_SME"),
});
export type IdeaInput = z.infer<typeof IdeaInputSchema>;

// ==============================================================================
// 4. LLM出力スキーマ
// ==============================================================================

/**
 * Q3分類用スキーマ
 */
export const Q3ClassificationSchema = z.object({
  detected_elements: z
    .array(PhysicalElementEnum)
    .max(3, { message: "Maximum of 3 detected elements allowed" }),
  reasoning: z.string().min(1, { message: "Reasoning is required" }),
});
export type Q3Classification = z.infer<typeof Q3ClassificationSchema>;

/**
 * Step 1 抽出用 (MarketInsightSchema)
 */
export const AutopsyReportSchema = z.object({
  failed_project_name: z.string().optional().default(""),
  github_repo_url: z.string().url().optional().or(z.literal("")),
  post_mortem_summary: z.string().optional().default(""),
  key_failure_reasons: z.array(z.string()).optional().default([]),
}).nullable();
export type AutopsyReport = z.infer<typeof AutopsyReportSchema>;

export const MarketInsightSchema = z
  .object({
    target_feature_id: z.string().min(1, { message: "target_feature_id is required" }),
    intensity: z
      .number()
      .int()
      .min(1, { message: "intensity must be between 1 and 10" })
      .max(10, { message: "intensity must be between 1 and 10" }),
    pull_scores: z.record(z.string(), z.number()).optional(),
    pullScores: z.record(z.string(), z.number()).optional(),
    friction_score: z.number().optional(),
    frictionScore: z.number().optional(),
    needs_web_search: z.boolean().optional().default(false),
    negative_bias_applied: z.boolean().optional().default(true),
    autopsy_report: z.union([z.string(), AutopsyReportSchema]).nullable().optional().default(null),
    // 単一推論テキスト (後方互換)
    score_reasoning: z.string().optional(),
    scoreReasoning: z.string().optional(),
    // 多言語・構造化推論フィールド (EN / JA)
    reasoning_pull_en: z.string().optional(),
    reasoning_pull_ja: z.string().optional(),
    reasoning_friction_en: z.string().optional(),
    reasoning_friction_ja: z.string().optional(),
    reasoning_pull: z.union([z.string(), z.object({ en: z.string(), ja: z.string() })]).optional(),
    reasoning_friction: z.union([z.string(), z.object({ en: z.string(), ja: z.string() })]).optional(),
  })
  .transform((data) => {
    const pullEn =
      data.reasoning_pull_en ||
      (typeof data.reasoning_pull === "object" ? data.reasoning_pull.en : undefined) ||
      (typeof data.reasoning_pull === "string" ? data.reasoning_pull : undefined) ||
      data.score_reasoning ||
      data.scoreReasoning ||
      "";

    const pullJa =
      data.reasoning_pull_ja ||
      (typeof data.reasoning_pull === "object" ? data.reasoning_pull.ja : undefined) ||
      (typeof data.reasoning_pull === "string" ? data.reasoning_pull : undefined) ||
      data.score_reasoning ||
      data.scoreReasoning ||
      "";

    const frictionEn =
      data.reasoning_friction_en ||
      (typeof data.reasoning_friction === "object" ? data.reasoning_friction.en : undefined) ||
      (typeof data.reasoning_friction === "string" ? data.reasoning_friction : undefined) ||
      `Users reported operational friction in ${data.target_feature_id}.`;

    const frictionJa =
      data.reasoning_friction_ja ||
      (typeof data.reasoning_friction === "object" ? data.reasoning_friction.ja : undefined) ||
      (typeof data.reasoning_friction === "string" ? data.reasoning_friction : undefined) ||
      `ユーザーは${data.target_feature_id}において設定負荷と摩擦を報告しています。`;

    return {
      target_feature_id: data.target_feature_id,
      intensity: data.intensity,
      pull_scores: data.pull_scores || data.pullScores || {},
      friction_score: data.friction_score ?? data.frictionScore,
      needs_web_search: data.needs_web_search ?? false,
      negative_bias_applied: data.negative_bias_applied ?? true,
      autopsy_report: data.autopsy_report ?? null,
      score_reasoning: data.score_reasoning || data.scoreReasoning || pullJa || pullEn || "",
      reasoning_pull_en: pullEn,
      reasoning_pull_ja: pullJa,
      reasoning_friction_en: frictionEn,
      reasoning_friction_ja: frictionJa,
    };
  });

export type MarketInsight = z.infer<typeof MarketInsightSchema>;

// ==============================================================================
// 5. Pre-flight & What-If スキーマ (Zod Self-Correction 対象)
// ==============================================================================

export const PreviewSummarySchema = z.object({
  coreJtbd: z.string().min(5),
  targetDomainKeywords: z.array(z.string()).min(1),
  primaryNemesis: z.string().min(2),
  nemesisReason: z.string().min(5),
  groundingConfidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
});
export type PreviewSummaryType = z.infer<typeof PreviewSummarySchema>;
export type PreviewSummary = PreviewSummaryType;

export const WhatIfCardItemSchema = z.object({
  id: z.string(),
  patternType: z.enum(["constraint_destroyer", "assumption_collision", "unbundle_specialist", "shadow_rebel"]),
  patternName: z.string(),
  patternEmoji: z.string(),
  provocativeQuestion: z.string(),
  coreConcept: z.string(),
  editorDraft: z.object({
    q1_target_pain: z.string(),
    q2_solution: z.string(),
    q3_core_edge: z.string(),
    q4_target_literacy: z.enum(["non_tech", "beginner", "intermediate", "tech_savvy", "developer", "expert"]),
  }),
});

export const WhatIfResponseSchema = z.object({
  cards: z.array(WhatIfCardItemSchema).min(1),
});
export type WhatIfResponseType = z.infer<typeof WhatIfResponseSchema>;

// ==============================================================================
// 6. AI審査員バイリンガル出力スキーマ (TribunalFeedbackSchema) [設計書 2.4.1]
// ==============================================================================

export const PersonaCritiqueSchema = z.object({
  harsh_critique_en: z.string().describe("English: 容赦のない辛辣な批判。事実と論理で確証バイアスを破壊する。"),
  harsh_critique_ja: z.string().describe("Japanese: 上記の日本語訳。"),
  socratic_question_en: z.string().describe("English: 思考をハッとさせる鋭い問いかけ。"),
  socratic_question_ja: z.string().describe("Japanese: 上記の日本語訳。"),
  pivot_hint_tag_en: z.string().describe("English: ピボットボタンに表示する短いアクションタグ（例: Target Refinement）"),
  pivot_hint_tag_ja: z.string().describe("Japanese: 上記の日本語訳。"),
});
export type PersonaCritique = z.infer<typeof PersonaCritiqueSchema>;

export const TribunalFeedbackSchema = z.object({
  investor: PersonaCritiqueSchema,
  competitor: PersonaCritiqueSchema,
  skeptical_user: PersonaCritiqueSchema,
  overall_verdict: z.enum(["KILL", "PIVOT", "SURVIVED"]).describe("3人の総意としての判定"),
  executive_summary_en: z.string().describe("English: なぜその判定になったのかを示す最終的な引導。"),
  executive_summary_ja: z.string().describe("Japanese: 上記の日本語訳。"),
});
export type TribunalFeedback = z.infer<typeof TribunalFeedbackSchema>;

