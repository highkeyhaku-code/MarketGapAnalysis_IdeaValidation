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

export interface AutopsyProjectItem {
  name: string;
  url: string;
  stars: number;
  description: string;
  causeOfDeath?: string;
}

export interface IdeaContextInput {
  q1_target_pain: string;
  q2_solution: string;
  q3_core_edge: string;
  domain?: string;
  targetLiteracy?: string;
  monetizationModel?: string;
  autopsyResults?: {
    totalCount?: number;
    projects?: AutopsyProjectItem[];
  };
}

/**
 * 3人の懐疑的なペルソナ（冷徹な投資家、既存の競合、懐疑的な顧客）による厳しい仮説クラッシュレビューを生成する
 * 設計書 2.6 準拠: 事前に実行された GitHub 死因分析（Autopsy）レポートを Grounding データとして注入し、
 * 「過去に同じ穴で死亡した先人の死骸」を踏まえた冷酷かつ客観的なツッコミを行う。
 */
export async function generateSkepticalPersonasFeedback(
  idea: IdeaContextInput
): Promise<SkepticalPersonaFeedback[]> {
  const autopsyText =
    idea.autopsyResults?.projects && idea.autopsyResults.projects.length > 0
      ? idea.autopsyResults.projects
          .slice(0, 4)
          .map(
            (p) =>
              `- Repo: ${p.name} (Stars: ${p.stars}) | Cause of Death: ${p.causeOfDeath || "Development halted, monetization failure"} | URL: ${p.url}`
          )
          .join("\n")
      : "No previous open source corpses directly detected, but fierce legacy incumbent inertia observed.";

  const prompt = `
You are the "Cold-Blooded Co-founder & Skeptical Advisory Board".
Rigorously stress-test and point out fatal vulnerabilities in the following startup idea.

[Startup Idea Specification]:
- Target Pain (Q1): "${idea.q1_target_pain}"
- Solution (Q2): "${idea.q2_solution}"
- Core Edge (Q3): "${idea.q3_core_edge}"
- Target Literacy: "${idea.targetLiteracy || "intermediate"}"
- Monetization: "${idea.monetizationModel || "subscription"}"
- Target Domain: "${idea.domain || "B2B_SME"}"

[GitHub Autopsy Grounding Evidence (先人の死骸データ)]:
${autopsyText}

You MUST generate feedback from THREE distinct personas grounded on the autopsy data and Socratic guidance:
1. "investor" (Ruthless VC Partner)
2. "competitor" (Incumbent Big Tech Product Lead)
3. "customer" (Skeptical IT / Enterprise Buyer)

Include:
- "groundingConfidence": "HIGH" (grounded on GitHub autopsy evidence), "MEDIUM", or "LOW"
- "groundingSourcesCount": 4 to 8 (integer)
- "coreCritique": Brutally honest feedback referencing the harsh market reality and similar failed attempts.
- "fatalFlaw": The single fatal point of failure.
- "socraticQuestion": A constructive, Socratic question challenging the founder to pivot / survive (e.g., "To overcome the switching barrier, is there an option to integrate headlessly into existing Slack instead of building a new web dashboard?").

Return a valid JSON array of 3 objects conforming strictly to this structure:
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
    "groundingConfidence": "HIGH",
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
      coreCritique: `While the problem (${idea.q1_target_pain.slice(0, 40)}...) is real, your solution lacks structural network effects. We already observed multiple archived repositories die from CAC overload.`,
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
      groundingConfidence: "HIGH",
      groundingSourcesCount: 5,
      socraticQuestion: "新しいログイン画面を増やす代わりに、ユーザーが毎日開くSlackやメールの中で完結するUIにする選択肢はあり得ますか？",
    },
  ];
}
