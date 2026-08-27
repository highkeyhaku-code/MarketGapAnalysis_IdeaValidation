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

You MUST generate ruthless, highly realistic feedback from THREE distinct personas:
1. "investor" (Ruthless VC Partner) - Focuses on TAM, defensibility, unit economics, and 3x CAC overhead.
2. "competitor" (Incumbent Big Tech Product Lead) - Explains why their engineering team can clone this in 2 weeks or why distribution will crush it.
3. "customer" (Skeptical IT / Enterprise Buyer) - Focuses on switching fatigue, security audits, and hidden setup friction.

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
    "recommendedCountermeasure": "..."
  },
  {
    "persona": "competitor",
    "name": "Elena Rostova",
    "title": "VP of Product @ Incumbent Giant",
    "avatarColor": "#f59e0b",
    "verdict": "HIGH_RISK",
    "coreCritique": "...",
    "fatalFlaw": "...",
    "recommendedCountermeasure": "..."
  },
  {
    "persona": "customer",
    "name": "David K.",
    "title": "Head of Engineering @ Tier-1 Scaleup",
    "avatarColor": "#6366f1",
    "verdict": "HIGH_RISK",
    "coreCritique": "...",
    "fatalFlaw": "...",
    "recommendedCountermeasure": "..."
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

  // フォールバック用の高品質なペルソナレビュー
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
    },
  ];
}
