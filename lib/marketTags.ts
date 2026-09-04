/**
 * 🏷️ 市場状況タグ (Market Dynamics Badges) 決定論的判定エンジン
 * 
 * 取得した数理スコア (Pull / Push / Physical) および摩擦コーパス・レビューデータに基づき、
 * 以下の5種類の市場タグを決定論的に判定・算出する。
 * 
 * 1. ☄️ High Gravity (強い重力): Push Score平均 >= 70 かつ トップ3社Pull Score平均 < 50
 * 2. ☠️ Graveyard (巨人の墓場): status === 'stagnant' (更新停滞)
 * 3. 🧩 Frankenstein (ツギハギ): レビュー/コーパス内のツギハギ単語 (Zapier, Make, export, manual 等) 出現率超過
 * 4. 🎓 High Cognitive Load (属人化): 学習コスト (LEARNING_CURVE) または 導入コスト (SETUP_COST) が甚大
 * 5. 🕳️ Shadow IT (反逆の兆候): 会社指定ツール回避、個人契約、スプレッドシート逃避の兆候
 */

export type MarketTagId =
  | "high_gravity"
  | "graveyard"
  | "frankenstein"
  | "high_cognitive_load"
  | "shadow_it";

export interface MarketTagBadge {
  id: MarketTagId;
  label: string;
  emoji: string;
  shortLabel: string;
  severity: number; // 1 (最高) 〜 5 (低)
  description: string;
  colorClass: {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
  };
}

export const MARKET_TAG_DEFINITIONS: Record<MarketTagId, MarketTagBadge> = {
  shadow_it: {
    id: "shadow_it",
    label: "🕳️ Shadow IT (反逆の兆候)",
    emoji: "🕳️",
    shortLabel: "Shadow IT",
    severity: 1,
    description: "組織指定の重厚ツールに耐えかねた現場が、非公式ツールや自費決済・個人スプレッドシートへ逃避している反逆領域。",
    colorClass: {
      bg: "bg-fuchsia-950/40",
      border: "border-fuchsia-500/50",
      text: "text-fuchsia-300",
      badgeBg: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/40",
    },
  },
  high_gravity: {
    id: "high_gravity",
    label: "☄️ High Gravity (強い重力)",
    emoji: "☄️",
    shortLabel: "High Gravity",
    severity: 2,
    description: "既存ツールへの不満・押出圧力 (Push >= 70) が強いにもかかわらず、既存の牽引力 (Pull < 50) が不足している巨大空白地帯。",
    colorClass: {
      bg: "bg-emerald-950/40",
      border: "border-emerald-500/50",
      text: "text-emerald-300",
      badgeBg: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
    },
  },
  frankenstein: {
    id: "frankenstein",
    label: "🧩 Frankenstein (ツギハギ)",
    emoji: "🧩",
    shortLabel: "Frankenstein",
    severity: 3,
    description: "単一ツールで業務が完結せず、ZapierやCSV手動エクスポート、マクロ等の泥臭い手作業で無理やり繋ぎ合わせられている市場。",
    colorClass: {
      bg: "bg-amber-950/40",
      border: "border-amber-500/50",
      text: "text-amber-300",
      badgeBg: "bg-amber-500/20 text-amber-200 border-amber-500/40",
    },
  },
  high_cognitive_load: {
    id: "high_cognitive_load",
    label: "🎓 High Cognitive Load (属人化)",
    emoji: "🎓",
    shortLabel: "High Cognitive Load",
    severity: 4,
    description: "導入難易度や学習コスト（Learning Curve / Setup）が極めて高く、専任担当者の属人性や離職リスクに縛られている市場。",
    colorClass: {
      bg: "bg-cyan-950/40",
      border: "border-cyan-500/50",
      text: "text-cyan-300",
      badgeBg: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40",
    },
  },
  graveyard: {
    id: "graveyard",
    label: "☠️ Graveyard (巨人の墓場)",
    emoji: "☠️",
    shortLabel: "Graveyard",
    severity: 5,
    description: "過去に巨人が席巻したが近年は開発・更新が停滞し、放棄されたリポジトリや負債が堆積するハイリスク領域。",
    colorClass: {
      bg: "bg-rose-950/40",
      border: "border-rose-500/50",
      text: "text-rose-300",
      badgeBg: "bg-rose-500/20 text-rose-200 border-rose-500/40",
    },
  },
};

export interface MarketDataForTagging {
  status?: string;
  companies?: Array<{
    pullScore?: number | null;
    frictionScore?: number | null;
    tagline?: string;
    description?: string;
    scoreReasoning?: string;
    reasoningPullJa?: string;
    reasoningFrictionJa?: string;
    physicalScores?: {
      learning_curve?: number;
      integration_cost?: number;
      setup_cost?: number;
      switching_barrier?: number;
    } | null;
  }>;
  craters?: Array<{
    description?: string;
    description_ja?: string;
  }>;
  rawTextCorpus?: string;
}

/**
 * 決定論的に合致するすべての市場タグを深刻度順で算出
 */
export function computeMarketTags(
  market: MarketDataForTagging | null | undefined,
  genreStatus?: string
): MarketTagBadge[] {
  if (!market) return [];

  const matchedTags: MarketTagBadge[] = [];
  const status = (market.status || genreStatus || "").toLowerCase();
  const companies = market.companies || [];

  // 1. ☠️ Graveyard (巨人の墓場): status === 'stagnant'
  if (status === "stagnant") {
    matchedTags.push(MARKET_TAG_DEFINITIONS.graveyard);
  }

  // 有効なスコアを持つ会社一覧
  const validPullCompanies = companies.filter((c) => typeof c.pullScore === "number");
  const validFrictionCompanies = companies.filter((c) => typeof c.frictionScore === "number");

  // 2. ☄️ High Gravity (強い重力): Push Score平均 >= 70 かつ トップ3社のPull Score平均 < 50
  if (validFrictionCompanies.length > 0 && validPullCompanies.length > 0) {
    const avgPush =
      validFrictionCompanies.reduce((sum, c) => sum + (c.frictionScore || 0), 0) /
      validFrictionCompanies.length;

    const sortedPull = [...validPullCompanies]
      .map((c) => c.pullScore || 0)
      .sort((a, b) => b - a);
    const top3Pull = sortedPull.slice(0, 3);
    const avgTop3Pull =
      top3Pull.reduce((sum, v) => sum + v, 0) / Math.max(1, top3Pull.length);

    if (avgPush >= 70 && avgTop3Pull < 50) {
      matchedTags.push(MARKET_TAG_DEFINITIONS.high_gravity);
    }
  }

  // レビュー・推論テキストの統合コーパス生成
  let corpus = (market.rawTextCorpus || "").toLowerCase();
  for (const c of companies) {
    corpus += ` ${c.tagline || ""} ${c.description || ""} ${c.scoreReasoning || ""} ${c.reasoningPullJa || ""} ${c.reasoningFrictionJa || ""}`;
  }
  for (const cr of market.craters || []) {
    corpus += ` ${cr.description || ""} ${cr.description_ja || ""}`;
  }
  corpus = corpus.toLowerCase();

  // 3. 🧩 Frankenstein (ツギハギ): Zapier, Make, export, manual 等の言及率超過
  const frankensteinPattern =
    /\b(zapier|make\.com|integromat|export|manual|spreadsheet|excel|sheets|csv|workaround|copy[- ]?paste|glue|duct[- ]?tape|ツギハギ|手作業|手動|スプレッドシート|エクセル|連携できない)\b/gi;
  const frankensteinMatches = corpus.match(frankensteinPattern);
  if (frankensteinMatches && frankensteinMatches.length >= 2) {
    matchedTags.push(MARKET_TAG_DEFINITIONS.frankenstein);
  }

  // 4. 🎓 High Cognitive Load (属人化): LEARNING_CURVE または SETUP_COST が甚大
  let hasHighCognitiveLoad = false;
  for (const c of companies) {
    if (c.physicalScores) {
      const lc = c.physicalScores.learning_curve || 0;
      const ic = c.physicalScores.integration_cost || c.physicalScores.setup_cost || 0;
      if (lc >= 70 || ic >= 70) {
        hasHighCognitiveLoad = true;
        break;
      }
    }
  }
  if (!hasHighCognitiveLoad && corpus.match(/\b(learning curve|steep|complex setup|onboarding|属人化|教育コスト|操作が複雑|専任|難解)\b/gi)) {
    hasHighCognitiveLoad = true;
  }
  if (hasHighCognitiveLoad) {
    matchedTags.push(MARKET_TAG_DEFINITIONS.high_cognitive_load);
  }

  // 5. 🕳️ Shadow IT (反逆の兆候): 会社指定ツール回避、個人契約、スプレッドシート逃避
  const shadowItPattern =
    /\b(shadow it|personal account|personal card|credit card|bypass|unapproved|rogue|stealth|under the radar|会社指定|稟議|回避|隠れて利用|勝手に|個人契約|自費|プライベートアカウント)\b/gi;
  const shadowMatches = corpus.match(shadowItPattern);
  if (shadowMatches && shadowMatches.length >= 1) {
    matchedTags.push(MARKET_TAG_DEFINITIONS.shadow_it);
  }

  // 深刻度（severity: 1 が最優先）順にソートして返却
  return matchedTags.sort((a, b) => a.severity - b.severity);
}
