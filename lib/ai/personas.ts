import { callGemini } from "./gemini";
import { fetchWithZodSelfCorrection } from "../selfCorrection";
import { TribunalFeedbackSchema, TribunalFeedback, PersonaCritique } from "../../schemas/zod";

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
  totalScore?: number;
  siScores?: Record<string, number>;
  autopsyResults?: {
    totalCount?: number;
    items?: any[];
    projects?: AutopsyProjectItem[];
  };
}

export interface PersonaDisplayData extends PersonaCritique {
  personaKey: "investor" | "competitor" | "skeptical_user";
  name: string;
  title: string;
  avatarColor: string;
  verdict: "KILL" | "PIVOT" | "SURVIVED";
}

/**
 * 3人の懐疑的なペルソナ（冷徹な投資家、既存の競合、懐疑的な顧客）によるバイリンガル審査会（Tribunal）レビューを生成する
 * 
 * 設計書 2.4 / 2.4.1 / 2.7 準拠:
 * - 3人のペルソナ（investor, competitor, skeptical_user）それぞれに対し、
 *   harsh_critique_en/ja, socratic_question_en/ja, pivot_hint_tag_en/ja のバイリンガル構造を出力。
 * - 審査会総意の overall_verdict (KILL / PIVOT / SURVIVED) と executive_summary_en/ja を含める。
 * - Gemini 1.5 Pro の推論ステップ（Step 2）で TribunalFeedbackSchema を用いた Structured Output を要求。
 */
export async function generateThreeSkepticalPersonasFeedback(
  idea: IdeaContextInput
): Promise<TribunalFeedback> {
  const autopsyRawList =
    idea.autopsyResults?.items && idea.autopsyResults.items.length > 0
      ? idea.autopsyResults.items
      : idea.autopsyResults?.projects && idea.autopsyResults.projects.length > 0
      ? idea.autopsyResults.projects
      : [];

  const autopsyText =
    autopsyRawList.length > 0
      ? autopsyRawList
          .slice(0, 4)
          .map((p: any) => {
            const name = p.name || p.full_name || p.repo_name || "Unknown Repo";
            const stars = p.stars ?? p.stargazers_count ?? 0;
            const cause =
              p.death_cause ||
              p.causeOfDeath ||
              p.autopsy_reason ||
              "Development halted, monetization failure";
            const url = p.url || p.html_url || "https://github.com";
            return `- Repo: ${name} (Stars: ${stars}) | Cause of Death: ${cause} | URL: ${url}`;
          })
          .join("\n")
      : "No previous open source corpses directly detected, but intense legacy incumbent inertia observed.";

  const totalScore = idea.totalScore ?? 45;
  const recommendedVerdict = totalScore >= 70 ? "SURVIVED" : totalScore >= 40 ? "PIVOT" : "KILL";

  const prompt = `
You are the "Cold-Blooded Startup Tribunal & Advisory Board" consisting of three ruthless judges:
1. "investor" (Ruthless Silicon Valley VC Partner focusing on Moat, LTV/CAC, and Scalability)
2. "competitor" (Incumbent Big Tech Product Leader focusing on Switching Barriers and Feature Copycat risk)
3. "skeptical_user" (Demanding IT Decision Maker / Target Buyer focusing on Integration Fatigue and Security)

Your mission is to completely destroy confirmation bias, identify fatal vulnerabilities, and provide Socratic challenges with actionable pivot tags.

[Startup Idea Under Review]:
- Target Pain (Q1): "${idea.q1_target_pain}"
- Solution (Q2): "${idea.q2_solution}"
- Core Edge (Q3): "${idea.q3_core_edge}"
- Target Domain: "${idea.domain || "B2B_SME"}"
- Target Literacy: "${idea.targetLiteracy || "intermediate"}"
- Calculated 3x Penalty Net Score: ${totalScore} / 100

[GitHub Autopsy Grounding Evidence (Past Failed Repositories)]:
${autopsyText}

[Evaluation Requirements]:
You MUST return a JSON OBJECT (NOT an array) with keys: "investor", "competitor", "skeptical_user", "overall_verdict", "executive_summary_en", "executive_summary_ja".

Example JSON structure:
{
  "overall_verdict": "${recommendedVerdict}",
  "executive_summary_en": "Executive summary...",
  "executive_summary_ja": "総括サマリー...",
  "investor": {
    "harsh_critique_en": "Critique in English...",
    "harsh_critique_ja": "日本語の辛辣な批判...",
    "socratic_question_en": "Socratic question in English...",
    "socratic_question_ja": "思考をハッとさせる日本語の問い...",
    "pivot_hint_tag_en": "Multiplayer Viral Loop",
    "pivot_hint_tag_ja": "社内マルチプレイヤー・バイラル化"
  },
  "competitor": {
    "harsh_critique_en": "Critique in English...",
    "harsh_critique_ja": "日本語の辛辣な批判...",
    "socratic_question_en": "Socratic question in English...",
    "socratic_question_ja": "思考をハッとさせる日本語の問い...",
    "pivot_hint_tag_en": "Parasitic Add-on Bridge",
    "pivot_hint_tag_ja": "既存ツールのアドオン・拡張化"
  },
  "skeptical_user": {
    "harsh_critique_en": "Critique in English...",
    "harsh_critique_ja": "日本語の辛辣な批判...",
    "socratic_question_en": "Socratic question in English...",
    "socratic_question_ja": "思考をハッとさせる日本語の問い...",
    "pivot_hint_tag_en": "Headless 0-Config UX",
    "pivot_hint_tag_ja": "Slack連携の0-Config化"
  }
}
`;

  try {
    const rawCaller = async (p: string) => {
      const raw = await callGemini(p, { temperature: 0.2 });
      try {
        const cleaned = raw.replace(/```(?:json)?/g, "").trim();
        const parsed = JSON.parse(cleaned);
        // もし配列形式で返ってきた場合はオブジェクト形式に自動正規化
        if (Array.isArray(parsed)) {
          const obj: any = {
            overall_verdict: recommendedVerdict,
            executive_summary_en: "The startup faces structural friction against existing market incumbents.",
            executive_summary_ja: "既存の競合ツールに対する現状維持の引力とスイッチング障壁が極めて高く評価されました。",
          };
          parsed.forEach((item: any) => {
            const k = item.persona === "customer" ? "skeptical_user" : item.persona;
            if (k && (k === "investor" || k === "competitor" || k === "skeptical_user")) {
              obj[k] = {
                harsh_critique_en: item.harsh_critique_en || item.coreCritique || "",
                harsh_critique_ja: item.harsh_critique_ja || item.coreCritique || "",
                socratic_question_en: item.socratic_question_en || item.socraticQuestion || "",
                socratic_question_ja: item.socratic_question_ja || item.socraticQuestion || "",
                pivot_hint_tag_en: item.pivot_hint_tag_en || "Strategic Pivot",
                pivot_hint_tag_ja: item.pivot_hint_tag_ja || "戦略的ピボット",
              };
            }
          });
          return JSON.stringify(obj);
        }
      } catch (_e) {
        // パースエラーはそのまま生テキストを渡してZod自己修正に委ねる
      }
      return raw;
    };

    const feedback = await fetchWithZodSelfCorrection({
      llmCaller: rawCaller,
      initialPrompt: prompt,
      schema: TribunalFeedbackSchema,
      maxRetries: 3,
    });

    if (feedback) {
      return feedback;
    }
  } catch (err) {
    console.warn("[Tribunal Feedback] Self-correction error, using robust fallback:", err);
  }

  // フォールバック (TribunalFeedbackSchema 完全準拠)
  return {
    overall_verdict: recommendedVerdict,
    executive_summary_en: `The idea faces severe structural inertia against existing incumbents. Without lowering setup friction and establishing a true technical moat, customer acquisition cost will fatalize the business model.`,
    executive_summary_ja: `既存の競合ツールに対する現状維持の引力とスイッチング障壁が極めて高く評価されました。セットアップ摩擦をゼロにし、独自の構造的エッジを確立しない限り、顧客獲得コスト（CAC）の高騰により事業継続が困難になります。`,
    investor: {
      harsh_critique_en: `Your solution lacks structural network effects. In this domain, crowded ad bidding will drive CAC far above LTV, leading to the same death spiral seen in archived repositories.`,
      harsh_critique_ja: `この領域は広告獲得競争が過熱しており、構造的なネットワーク効果やバイラル性が欠如しているため、LTVをCACが上回る構造的赤字に陥ります。`,
      socratic_question_en: `To bypass ballooning acquisition costs, is there a multiplayer or bottom-up viral mechanism that naturally spreads within the customer's organization?`,
      socratic_question_ja: `高騰する広告獲得コストを回避するために、1人のユーザーから組織全体へ自然伝播するマルチプレイヤー型の仕組みを取り入れる余地はありますか？`,
      pivot_hint_tag_en: `Multiplayer Viral Loop`,
      pivot_hint_tag_ja: `社内マルチプレイヤー・バイラル化`,
    },
    competitor: {
      harsh_critique_en: `We already have 50,000 active enterprises and a dedicated team building native AI extensions for this exact workflow. A standalone point-solution cannot overcome our distribution advantage.`,
      harsh_critique_ja: `既存大手は既に数万のエンタープライズ顧客基盤を持ち、同様のAI拡張機能を開発中です。単体のWebアプリでは膨大なデータロックインを崩せません。`,
      socratic_question_en: `Instead of demanding a full migration from existing incumbents, can you position as a lightweight Chrome extension or webhook bridge that piggybacks on our platform?`,
      socratic_question_ja: `既存ツールの全面乗り換えを強いるのではなく、既存ツールのChrome拡張やWebhook連携として寄生・共存するアプローチは検討できますか？`,
      pivot_hint_tag_en: `Parasitic Add-on Bridge`,
      pivot_hint_tag_ja: `既存ツールのアドオン・拡張化`,
    },
    skeptical_user: {
      harsh_critique_en: `Introducing another standalone SaaS triggers security audits, vendor onboarding, and employee training. The friction of learning your UI is higher than tolerating our current workaround.`,
      harsh_critique_ja: `新しい専用ツールの導入にはセキュリティ審査と社内教育コストがかかります。現在の不満を我慢するコストの方が、新たなUIを学習する労力よりまだマシです。`,
      socratic_question_en: `Can you eliminate UI learning curve entirely by running headlessly inside tools we already use daily, such as Slack, Notion, or email?`,
      socratic_question_ja: `新しい管理画面を増やさず、ユーザーが毎日開くSlackやNotion、メールの中で0クリックで完結するヘッドレスUXにする選択肢はあり得ますか？`,
      pivot_hint_tag_en: `Headless 0-Config UX`,
      pivot_hint_tag_ja: `Slack/Notion連携の0-Config化`,
    },
  };
}

/**
 * 後方互換性ヘルパー: TribunalFeedback を UIコンポーネント向けのペルソナ配列に変換する
 */
export function formatTribunalFeedbackForUI(
  tribunal: TribunalFeedback
): PersonaDisplayData[] {
  return [
    {
      personaKey: "investor",
      name: "Marcus Vance",
      title: "General Partner @ Apex Capital",
      avatarColor: "#ef4444",
      verdict: tribunal.overall_verdict,
      ...tribunal.investor,
    },
    {
      personaKey: "competitor",
      name: "Elena Rostova",
      title: "VP of Product @ Incumbent Giant",
      avatarColor: "#f59e0b",
      verdict: tribunal.overall_verdict,
      ...tribunal.competitor,
    },
    {
      personaKey: "skeptical_user",
      name: "David K.",
      title: "Head of Operations @ Tier-1 Scaleup",
      avatarColor: "#6366f1",
      verdict: tribunal.overall_verdict,
      ...tribunal.skeptical_user,
    },
  ];
}

// 後方互換エクスポート
export const generateSkepticalPersonasFeedback = async (
  idea: IdeaContextInput
) => {
  const tribunal = await generateThreeSkepticalPersonasFeedback(idea);
  return formatTribunalFeedbackForUI(tribunal);
};
