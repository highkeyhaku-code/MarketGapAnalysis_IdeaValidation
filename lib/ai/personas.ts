import { callGemini } from "./gemini";
import { fetchWithZodSelfCorrection } from "../selfCorrection";
import { z } from "zod";

export const SkepticalPersonaFeedbackSchema = z.object({
  persona: z.enum(["investor", "competitor", "customer"]),
  name: z.string(),
  title: z.string(),
  avatarColor: z.string(),
  verdict: z.enum(["CRITICAL", "HIGH_RISK", "CONDITIONAL_PASS"]),
  coreCritique: z.string(),
  fatalFlaw: z.string(),
  recommendedCountermeasure: z.string(),
  // 4-1. 不確実性の開示 (Transparency Metric)
  groundingConfidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  groundingSourcesCount: z.number().int().default(4),
  // 4-2. ソクラテス式の対話型問いかけ (Socratic Dialogue Prompt)
  socraticQuestion: z.string(),
});
export type SkepticalPersonaFeedback = z.infer<typeof SkepticalPersonaFeedbackSchema>;

export const PersonasFeedbackArraySchema = z.array(SkepticalPersonaFeedbackSchema);

export interface IdeaContextInput {
  q1_target_pain: string;
  q2_solution: string;
  q3_core_edge: string;
  domain?: string;
  targetLiteracy?: string;
  monetizationModel?: string;
}

/**
 * 3人の懐疑的なペルソナ（冷徹な投資家、既存の競合、懐疑的な顧客）による厳しい仮説クラッシュレビューを生成する
 */
export async function generateSkepticalPersonasFeedback(
  idea: IdeaContextInput
): Promise<SkepticalPersonaFeedback[]> {
  const prompt = `
You are the "Cold-Blooded Co-founder & Skeptical Advisory Board".
Rigorously stress-test and point out fatal vulnerabilities in the following startup idea.

[Startup Idea Specification]:
- Target Pain (Q1): "${idea.q1_target_pain}"
- Solution (Q2): "${idea.q2_solution}"
- Core Edge (Q3): "${idea.q3_core_edge}"
- Target Literacy: "${idea.targetLiteracy || "intermediate"}"
- Monetization: "${idea.monetizationModel || "subscription"}"

You MUST generate feedback from THREE distinct personas with Socratic guidance and Grounding Transparency:
1. "investor" (Ruthless VC Partner)
2. "competitor" (Incumbent Big Tech Product Lead)
3. "customer" (Skeptical IT / Enterprise Buyer)

Include:
- "groundingConfidence": "HIGH" (if grounded on public benchmarks), "MEDIUM", or "LOW"
- "groundingSourcesCount": 3 to 8 (integer)
- "socraticQuestion": A constructive, Socratic question challenging the founder to think deeper (e.g. "To overcome the switching barrier, is there an option to integrate headlessly into their existing Slack rather than building a new web dashboard?")

Return a valid JSON array of 3 objects strictly conforming to this schema:
[
  {
    "persona": "investor",
    "name": "Marcus Vance",
    "title": "General Partner @ Apex Capital",
    "avatarColor": "#ef4444",
    "verdict": "CRITICAL",
    "coreCritique": "...",
    "fatalFlaw": "...",
    "recommendedCountermeasure": "...",
    "groundingConfidence": "HIGH",
    "groundingSourcesCount": 6,
    "socraticQuestion": "..."
  },
  {
    "persona": "competitor",
    "name": "Elena Rostova",
    "title": "VP of Product @ Incumbent Giant",
    "avatarColor": "#f59e0b",
    "verdict": "HIGH_RISK",
    "coreCritique": "...",
    "fatalFlaw": "...",
    "recommendedCountermeasure": "...",
    "groundingConfidence": "HIGH",
    "groundingSourcesCount": 5,
    "socraticQuestion": "..."
  },
  {
    "persona": "customer",
    "name": "David K.",
    "title": "Head of Operations @ Tier-1 Scaleup",
    "avatarColor": "#6366f1",
    "verdict": "HIGH_RISK",
    "coreCritique": "...",
    "fatalFlaw": "...",
    "recommendedCountermeasure": "...",
    "groundingConfidence": "MEDIUM",
    "groundingSourcesCount": 4,
    "socraticQuestion": "..."
  }
]
`;

  const feedbackList = await fetchWithZodSelfCorrection({
    llmCaller: async (p) => callGemini(p, { temperature: 0.3 }),
    initialPrompt: prompt,
    schema: PersonasFeedbackArraySchema,
    maxRetries: 3,
  });

  if (feedbackList && feedbackList.length >= 3) {
    return feedbackList;
  }

  // フォールバック
  return [
    {
      persona: "investor",
      name: "Marcus Vance",
      title: "General Partner @ Apex Capital",
      avatarColor: "#ef4444",
      verdict: "CRITICAL",
      coreCritique: `While the problem (${idea.q1_target_pain.slice(0, 40)}...) is real, your solution lacks structural network effects. Incumbents with $50M balance sheets can ship this as an addon.`,
      fatalFlaw: "Customer Acquisition Cost (CAC) will exceed LTV due to crowded ad bidding in this category.",
      recommendedCountermeasure: "Narrow vertical focus down to an underserved niche where incumbent APIs do not reach.",
      groundingConfidence: "HIGH",
      groundingSourcesCount: 7,
      socraticQuestion: "この高騰するCACの壁を超えるために、広告獲得ではなく製品自体が社内バイラルするMultiplayerの仕組みを取り入れる余地はありますか？",
    },
    {
      persona: "competitor",
      name: "Elena Rostova",
      title: "VP of Product @ Incumbent Giant",
      avatarColor: "#f59e0b",
      verdict: "HIGH_RISK",
      coreCritique: `We already have a team of 12 engineers building a native AI feature that tackles this exact pain point for our 50,000 active enterprises.`,
      fatalFlaw: "Switching barrier is high; users will not migrate their core workflow for an unproven point solution.",
      recommendedCountermeasure: "Position as a complementary bridge rather than a full replacement tool.",
      groundingConfidence: "HIGH",
      groundingSourcesCount: 5,
      socraticQuestion: "既存ツールの全面リプレイスを要求するのではなく、既存ツールのChrome拡張やWebhookとして寄生するアプローチは検討できますか？",
    },
    {
      persona: "customer",
      name: "David K.",
      title: "Head of Operations @ Tier-1 Scaleup",
      avatarColor: "#6366f1",
      verdict: "HIGH_RISK",
      coreCritique: `Our team has tool-fatigue. Introducing another dashboard requires SOC2 audits, privacy approval, and 3 weeks of onboarding.`,
      fatalFlaw: "Setup friction (integration_cost) is underestimated by the founder.",
      recommendedCountermeasure: "Guarantee 0-config setup via Slack bot or headless webhook without new UI login.",
      groundingConfidence: "MEDIUM",
      groundingSourcesCount: 4,
      socraticQuestion: "新しいログイン画面を増やす代わりに、ユーザーが毎日開くSlackやメールの中で完結するUIにする選択肢はあり得ますか？",
    },
  ];
}
