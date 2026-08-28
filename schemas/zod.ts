import { z } from "zod";

// ==============================================================================
// 1. レイヤー 1: 思考引き出しウィザード (IdeaWizard) 入力スキーマ
// ==============================================================================

export const IdeaInputSchema = z.object({
  // Q1: ターゲットが夜も眠れないほど恐れている「最悪の事態・激痛」 (30文字以上)
  q1_target_pain: z
    .string()
    .min(30, { message: "Q1は30文字以上で、ターゲットの切実な痛み・恐怖を具体的に記述してください" })
    .max(1000, { message: "Q1は1000文字以内で記述してください" }),

  // Q2: 競合が「技術的/構造的に真似できない」と確信できる理由 (30文字以上)
  q2_solution: z
    .string()
    .min(30, { message: "Q2は30文字以上で、競合が構造的に模倣できない理由を記述してください" })
    .max(1000, { message: "Q2は1000文字以内で記述してください" }),

  // Q3: コアとなる優位性の源泉（AIが物理要素として自動判定）
  q3_core_edge: z
    .string()
    .min(10, { message: "Q3は10文字以上で、コアとなる物理的優位性を記述してください" })
    .max(500, { message: "Q3は500文字以内で記述してください" }),

  // Q4: ターゲット層のITリテラシー / 組織導入の障壁 (Smart Defaults による自動設定可)
  q4_target_literacy: z
    .string()
    .min(5, { message: "Q4は5文字以上で記述してください" })
    .max(300, { message: "Q4は300文字以内で記述してください" }),

  // タイムトラベル・ピボット用の親コミットID（nullの場合はルートコミット）
  parent_commit_id: z.string().uuid().nullable().optional(),

  // ドメイン識別子
  domain: z.enum(["B2B_ENTERPRISE", "B2B_SME", "B2C_CONSUMER"]).default("B2B_SME"),
});

export type IdeaInput = z.infer<typeof IdeaInputSchema>;

// ==============================================================================
// 2. レイヤー 2: 懐疑的審査員フィードバック & ソクラテス式問いかけスキーマ
// ==============================================================================

export const PersonaFeedbackSchema = z.object({
  persona: z.enum([
    "cynical_vc",        // 疑り深いシードVC
    "lazy_buyer",        // 面倒くさがりな現場バイヤー
    "complaining_user",  // 愚痴の多いヘビーユーザー
  ]),
  brutal_critique: z.string().min(10, { message: "手厳しい批判は10文字以上必要です" }),
  killer_question: z.string().min(10, { message: "ソクラテス式の問いは10文字以上必要です" }),
  fail_probability_score: z.number().int().min(0).max(100), // 失敗確率 (0 - 100)
});

export type PersonaFeedback = z.infer<typeof PersonaFeedbackSchema>;

// ==============================================================================
// 3. レイヤー 3: 死骸検索 (GitHub Autopsy) 照合スキーマ
// ==============================================================================

export const DeadRepoAutopsySchema = z.object({
  repo_name: z.string(),
  repo_url: z.string().url(),
  abandoned_year: z.number().int(),
  stars: z.number().int(),
  death_cause: z.string().min(10, { message: "死因の要約は10文字以上必要です" }),
  similarity_score: z.number().min(0).max(1), // 類似度 (0.0 - 1.0)
});

export const AutopsyReportSchema = z.object({
  matched_dead_repos: z.array(DeadRepoAutopsySchema),
  overall_autopsy_summary: z.string().min(10),
  historical_failure_pattern: z.string(),
});

export type DeadRepoAutopsy = z.infer<typeof DeadRepoAutopsySchema>;
export type AutopsyReport = z.infer<typeof AutopsyReportSchema>;

// ==============================================================================
// 4. レイヤー 4: 摩擦・重力インサイトスキーマ (Zod Self-Correction 対象)
// ==============================================================================

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
    score_reasoning: z.string().optional(),
    scoreReasoning: z.string().optional(),
  })
  .transform((data) => ({
    target_feature_id: data.target_feature_id,
    intensity: data.intensity,
    pull_scores: data.pull_scores || data.pullScores || {},
    friction_score: data.friction_score ?? data.frictionScore,
    needs_web_search: data.needs_web_search ?? false,
    negative_bias_applied: data.negative_bias_applied ?? true,
    autopsy_report: data.autopsy_report ?? null,
    score_reasoning: data.score_reasoning || data.scoreReasoning || "",
  }));

export type MarketInsight = z.infer<typeof MarketInsightSchema>;

// ==============================================================================
// 5. Pre-flight & What-If スキーマ (Zod Self-Correction 対象)
// ==============================================================================

export const PreviewSummarySchema = z.object({
  coreJtbd: z.string().min(5),
  targetDomainKeywords: z.array(z.string()).min(1),
  primaryBottleneckAssumption: z.string().min(5),
  estimatedMarketDepth: z.enum(["shallow", "moderate", "deep"]),
});

export type PreviewSummary = z.infer<typeof PreviewSummarySchema>;
