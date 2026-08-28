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
    .min(20, { message: "Core edge (Q3) must be between 20 and 1000 characters" })
    .max(1000, { message: "Core edge (Q3) must be between 20 and 1000 characters" }),
  q4_target_literacy: TargetLiteracyEnum,
  q4_monetization_model: MonetizationModelEnum,
  q4_supplementary_pains: z.array(z.string()).default([]),
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
  failed_project_name: z.string(),
  github_repo_url: z.string().url().optional().or(z.literal("")),
  post_mortem_summary: z.string(),
  key_failure_reasons: z.array(z.string()),
}).nullable();
export type AutopsyReport = z.infer<typeof AutopsyReportSchema>;

export const MarketInsightSchema = z.object({
  target_feature_id: z.string().min(1, { message: "target_feature_id is required" }),
  intensity: z
    .number()
    .int()
    .min(1, { message: "intensity must be between 1 and 10" })
    .max(10, { message: "intensity must be between 1 and 10" }),
  needs_web_search: z.boolean(),
  negative_bias_applied: z.boolean(),
  autopsy_report: z.union([z.string(), AutopsyReportSchema]).nullable(),
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
