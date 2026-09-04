import { env } from "../src/env";
import { callGemini } from "./ai/gemini";

export interface GithubRepoItem {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  pushed_at: string;
  archived: boolean;
  topics: string[];
  // 死因・死骸分析用フィールド (UI・AI審査員プロンプト・共有画面と完全互換)
  death_cause?: string;
  autopsy_reason?: string;
  causeOfDeath?: string;
  // UIエイリアス
  repo_name?: string;
  stars?: number;
}

export interface GithubSearchResponse {
  total_count: number;
  items: GithubRepoItem[];
}

export interface GithubSearchResult {
  success: boolean;
  query: string;
  totalCount: number;
  items: GithubRepoItem[];
  errorMessage?: string;
}

/**
 * 検索キーワード候補を抽出・正規化する関数
 * 「ToDoアプリ」「CRM」「営業支援」などの日本語・長文・配列から
 * GitHub Search APIで高確率でヒットする英語シノニムおよび適正キーワードを抽出する。
 */
export function extractSearchCandidateKeywords(
  input: string | string[],
  context?: { solution?: string; coreEdge?: string }
): string[] {
  const candidates: string[] = [];
  const rawList: string[] = Array.isArray(input) ? input : [input];
  if (context?.solution) rawList.push(context.solution);
  if (context?.coreEdge) rawList.push(context.coreEdge);

  const fullText = rawList.filter(Boolean).join(" ");

  // 1. 主要ドメイン辞書による英語シノニム展開
  const DOMAIN_SYNONYMS: Array<{ pattern: RegExp; terms: string[] }> = [
    {
      pattern: /todo|タスク|task|リマインダー|todoリスト/i,
      terms: ["todo", "todo app", "task management", "task manager"],
    },
    {
      pattern: /crm|営業|商談|sales|sfa|顧客管理|リード|案件/i,
      terms: ["sales crm", "crm", "sales automation", "lead management"],
    },
    {
      pattern: /議事録|音声|文字起こし|voice|meeting|transcri|zoom|商談録音/i,
      terms: ["meeting transcription", "voice notes", "speech to text"],
    },
    {
      pattern: /プロジェクト|カンバン|kanban|pm|workflow|ワークフロー|業務自動化/i,
      terms: ["project management", "kanban", "workflow automation"],
    },
    {
      pattern: /開発|コード|dev|git|プルリク|ci\/cd|インフラ/i,
      terms: ["developer tools", "code review", "devops"],
    },
    {
      pattern: /チャット|メッセージ|コミュニケーション|slack|bot/i,
      terms: ["chat app", "messaging", "collaboration"],
    },
    {
      pattern: /請求|経費|会計|インボイス|invoice|expense/i,
      terms: ["invoicing", "accounting", "expense tracker"],
    },
    {
      pattern: /人事|採用|労務|ats|hr|recruiting/i,
      terms: ["recruiting ats", "hr management", "applicant tracking"],
    },
    {
      pattern: /マーケティング|広告|sns|seo|集客/i,
      terms: ["marketing automation", "social media manager", "seo tool"],
    },
  ];

  for (const entry of DOMAIN_SYNONYMS) {
    if (entry.pattern.test(fullText)) {
      candidates.push(...entry.terms);
    }
  }

  // 2. 入力された元のキーワード（配列内の各項目）を検証して追加
  for (const raw of rawList) {
    if (!raw) continue;
    const trimmed = raw.trim();
    if (trimmed.length > 0 && trimmed.length <= 30) {
      const cleaned = trimmed.replace(/[、。！？!?,.]/g, "").trim();
      if (cleaned.length > 0) {
        candidates.push(cleaned);
      }
    } else if (trimmed.length > 30) {
      const englishWords = trimmed.match(/[a-zA-Z0-9_-]{3,}/g);
      if (englishWords && englishWords.length > 0) {
        candidates.push(englishWords.slice(0, 3).join(" "));
      }
    }
  }

  const unique = Array.from(new Set(candidates)).filter((c) => c.trim().length > 0);
  if (unique.length === 0) {
    return ["saas", "software", "tool"];
  }

  return unique;
}

/**
 * スマートなデフォルト死因の生成（AIオフライン時やエラー時のフェイルソフト）
 */
function getDefaultDeathCause(
  repo: GithubRepoItem,
  context?: { solution?: string; coreEdge?: string }
): string {
  const desc = (repo.description || "").toLowerCase();
  const name = (repo.name || "").toLowerCase();

  if (desc.includes("api") || desc.includes("integration") || desc.includes("sync") || name.includes("sync")) {
    return "主要プラットフォームのAPI仕様変更と高額なレート制限・移行摩擦に耐えきれず開発停止。";
  }
  if (repo.stargazers_count > 500) {
    return "オープンソースとしての注目は集めたものの、持続可能なマネタイズモデルの確立に失敗して放棄。";
  }
  if (repo.stargazers_count < 10) {
    return "ターゲット市場へのPMF（市場適合）を達成できず、初期ユーザーの継続率低下により放棄。";
  }
  return "大手競合による類似機能の無償内製化と、継続課金モデル構築の失敗による開発停止。";
}

/**
 * Gemini による各リポジトリの「死因分析（Cause of Death）」の付与
 */
async function enrichReposWithAiAutopsy(
  items: GithubRepoItem[],
  context?: { solution?: string; coreEdge?: string; keyword?: string }
): Promise<GithubRepoItem[]> {
  if (items.length === 0) return items;

  try {
    const prompt = `
以下のGitHubリポジトリは、スタートアップアイデア（解決策: "${context?.solution || context?.keyword || "新規SaaS"}" / 独自性: "${context?.coreEdge || "なし"}"）と類似・競合しながらも、過去に開発が停止・アーカイブされたオープンソースプロジェクトです。
各リポジトリのメタデータ（名前、説明、スター数）を踏まえ、なぜこのプロジェクトが失敗・放棄されたのか、スタートアップが直面する構造的摩擦（スイッチング障壁、マネタイズ失敗、競合の内製化、保守コスト等）を踏まえた「死因（Cause of Death）」を日本語で1文（30〜60文字程度）で鋭く分析してください。

リポジトリリスト:
${items
  .map(
    (r, i) =>
      `[${i + 1}] ID: ${r.id}, 名前: ${r.name || r.full_name}, 説明: ${
        r.description || "なし"
      }, スター数: ${r.stargazers_count}`
  )
  .join("\n")}

必ず以下のJSON配列形式のみで返してください:
[
  { "id": <数値ID>, "death_cause": "死因の分析文..." }
]
`;

    const rawJson = await callGemini(prompt, {
      model: "gemini-3-flash-preview",
      temperature: 0.2,
      responseMimeType: "application/json",
    });

    const parsed = JSON.parse(
      rawJson.replace(/```(?:json)?/g, "").trim()
    ) as Array<{ id: number; death_cause: string }>;

    const deathCauseMap = new Map<number, string>();
    for (const p of parsed) {
      if (p.id && p.death_cause) {
        deathCauseMap.set(p.id, p.death_cause);
      }
    }

    return items.map((repo, idx) => {
      const cause =
        deathCauseMap.get(repo.id) ||
        parsed[idx]?.death_cause ||
        getDefaultDeathCause(repo, context);

      return {
        ...repo,
        death_cause: cause,
        autopsy_reason: cause,
        causeOfDeath: cause,
        repo_name: repo.name || repo.full_name,
        stars: repo.stargazers_count,
      };
    });
  } catch (err) {
    console.warn(
      "[searchArchivedGithubProjects] Failed to generate AI autopsy causes with Gemini, using smart fallbacks:",
      err
    );
    return items.map((repo) => {
      const cause = getDefaultDeathCause(repo, context);
      return {
        ...repo,
        death_cause: cause,
        autopsy_reason: cause,
        causeOfDeath: cause,
        repo_name: repo.name || repo.full_name,
        stars: repo.stargazers_count,
      };
    });
  }
}

/**
 * 単一クエリのGitHub API実行
 */
async function fetchGithubSearch(
  query: string,
  perPage: number,
  token?: string
): Promise<{
  success: boolean;
  totalCount: number;
  items: GithubRepoItem[];
  status: number;
  errorMessage?: string;
}> {
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", query);
  url.searchParams.set("sort", "stars");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", String(perPage));

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "MarketGapAnalysis-App",
  };

  if (token && token.trim().length > 0) {
    headers.Authorization = token.startsWith("Bearer ")
      ? token.trim()
      : `Bearer ${token.trim()}`;
  } else {
    console.warn(
      "[GitHub API] No GITHUB_TOKEN or GITHUB_ACCESS_TOKEN provided. Requests will be subject to strict unauthenticated rate limits (60/hr)."
    );
  }

  try {
    const res = await fetch(url.toString(), { headers });

    const rateLimitRemaining = res.headers.get("x-ratelimit-remaining");
    const rateLimitReset = res.headers.get("x-ratelimit-reset");

    if (!res.ok) {
      const errText = await res.text();
      console.error(
        `[GitHub API] HTTP ${res.status}: ${errText} (rateLimitRemaining: ${rateLimitRemaining}, reset: ${rateLimitReset})`
      );
      return {
        success: false,
        totalCount: 0,
        items: [],
        status: res.status,
        errorMessage: `GitHub API error (${res.status}): ${errText}`,
      };
    }

    const data = (await res.json()) as GithubSearchResponse;
    const items = (data.items || []).map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      html_url: repo.html_url,
      description: repo.description,
      stargazers_count: repo.stargazers_count,
      pushed_at: repo.pushed_at,
      archived: repo.archived,
      topics: repo.topics || [],
    }));

    return {
      success: true,
      totalCount: data.total_count,
      items,
      status: res.status,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[GitHub API] Network/Fetch error:", message);
    return {
      success: false,
      totalCount: 0,
      items: [],
      status: 0,
      errorMessage: `Failed to fetch GitHub repositories: ${message}`,
    };
  }
}

/**
 * GitHub 死骸検索関数 (searchArchivedGithubProjects)
 * 過去に開発され、現在は放置・アーカイブされたリポジトリ（死骸）を検索し、失敗パターンの分析に利用する。
 *
 * - 認証: GITHUB_TOKEN / GITHUB_ACCESS_TOKEN を安全に適用
 * - 多段階検索クエリ戦略: archived:true / pushed:<YYYY-MM-DD / stars 緩和 / 英語シノニム展開
 * - AI死因分析: Gemini を用いて各放棄リポジトリの「死因 (Cause of Death)」を自動生成
 *
 * @param keywordOrKeywords - 検索キーワード（単語、配列、またはアイデアの解決策など）
 * @param perPage - 取得件数（最大6件程度）
 * @param context - 関連コンテキスト（solution, coreEdge など）
 * @returns 検索結果およびAI死因分析付きアイテム
 */
export async function searchArchivedGithubProjects(
  keywordOrKeywords: string | string[],
  perPage = 6,
  context?: { solution?: string; coreEdge?: string }
): Promise<GithubSearchResult> {
  const token =
    process.env.GITHUB_TOKEN ||
    process.env.GITHUB_ACCESS_TOKEN ||
    env.GITHUB_ACCESS_TOKEN;

  const candidateKeywords = extractSearchCandidateKeywords(
    keywordOrKeywords,
    context
  );

  const cutoffDate = "2024-01-01";
  let lastQuery = "";
  let lastErrorMessage: string | undefined;

  for (const term of candidateKeywords) {
    // 検索クエリ戦略（Tiered Query Strategy）
    // 1. 正式アーカイブかつ放置リポジトリ (stars > 5)
    // 2. 正式アーカイブ (stars > 1)
    // 3. 正式アーカイブ (条件緩和)
    // 4. 実質放置リポジトリ (pushed が過去で stars > 10)
    const queryStrategies = [
      `${term} archived:true stars:>5 pushed:<${cutoffDate}`,
      `${term} archived:true stars:>1`,
      `${term} archived:true`,
      `${term} pushed:<${cutoffDate} stars:>10`,
    ];

    for (const q of queryStrategies) {
      lastQuery = q;
      const res = await fetchGithubSearch(q, perPage, token);

      if (!res.success) {
        lastErrorMessage = res.errorMessage;
        // 401 (認証エラー) や 403 (レートリミット) の場合はこれ以上回しても失敗するため即時ハンドリング
        if (res.status === 401 || (res.status === 403 && res.errorMessage?.includes("rate limit"))) {
          return {
            success: false,
            query: q,
            totalCount: 0,
            items: [],
            errorMessage: res.errorMessage,
          };
        }
        continue;
      }

      if (res.items.length > 0) {
        // ヒットした場合、AIによる死因分析を付与して返却
        const enrichedItems = await enrichReposWithAiAutopsy(res.items, {
          ...context,
          keyword: term,
        });

        return {
          success: true,
          query: q,
          totalCount: res.totalCount,
          items: enrichedItems,
        };
      }
    }
  }

  // すべての候補・戦略でヒットしなかった場合
  return {
    success: true,
    query: lastQuery || (Array.isArray(keywordOrKeywords) ? keywordOrKeywords.join(" ") : keywordOrKeywords),
    totalCount: 0,
    items: [],
    errorMessage: lastErrorMessage,
  };
}
