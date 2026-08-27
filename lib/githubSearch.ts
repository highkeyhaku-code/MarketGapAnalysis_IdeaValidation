import { env } from "../src/env";

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
 * GitHub 死骸検索関数 (searchArchivedGithubProjects)
 * 過去に開発され、現在は放置・アーカイブされたリポジトリ（死骸）を検索し、失敗パターンの分析に利用する。
 * 検索条件: `<keyword> is:archived stars:>10 pushed:<2023-01-01`
 * 
 * @param keyword - 検索キーワード（アイデアの解決策や機能名など）
 * @param perPage - 取得件数（最大10件程度）
 * @returns 検索結果
 */
export async function searchArchivedGithubProjects(
  keyword: string,
  perPage = 10
): Promise<GithubSearchResult> {
  const cleanKeyword = keyword.trim();
  if (!cleanKeyword) {
    return {
      success: true,
      query: "",
      totalCount: 0,
      items: [],
    };
  }

  // 検索クエリ構築: is:archived stars:>10 pushed:<2023-01-01
  const query = `${cleanKeyword} is:archived stars:>10 pushed:<2023-01-01`;
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", query);
  url.searchParams.set("sort", "stars");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", String(perPage));

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${env.GITHUB_ACCESS_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "MarketGapAnalysis-App",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        query,
        totalCount: 0,
        items: [],
        errorMessage: `GitHub API error (${res.status}): ${errText}`,
      };
    }

    const data = (await res.json()) as GithubSearchResponse;
    return {
      success: true,
      query,
      totalCount: data.total_count,
      items: (data.items || []).map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        html_url: repo.html_url,
        description: repo.description,
        stargazers_count: repo.stargazers_count,
        pushed_at: repo.pushed_at,
        archived: repo.archived,
        topics: repo.topics || [],
      })),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      query,
      totalCount: 0,
      items: [],
      errorMessage: `Failed to fetch GitHub repositories: ${message}`,
    };
  }
}
