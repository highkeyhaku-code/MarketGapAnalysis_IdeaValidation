import { inngest } from "../client";
import { supabaseAdmin } from "../../lib/supabaseClient";

export interface SectorPercentileReport {
  l1Id: string;
  l1Name: string;
  l2Count: number;
  medianScore: number;
  percentile20Threshold: number;
  stagnantL2Ids: string[];
  activeL2Ids: string[];
}

/**
 * 2.5 パーセンタイル相対評価 Cron Job (週1回定期実行 / 手動トリガー)
 * B2B/B2Cの熱量格差を吸収するため、L1カテゴリ内の中央値から下位20%（20th Percentile）を特定し
 * status を 'stagnant' (☠️ 巨人の墓場) に自動更新する。
 */
export const evaluateSectorPercentilesCron = inngest.createFunction(
  {
    id: "evaluate-sector-percentiles-cron",
    name: "Evaluate Sector Relative Percentiles (20th Percentile Stagnant Flag)",
    triggers: [
      { cron: "0 0 * * 0" }, // 毎週日曜日 0:00 UTC に自動実行
      { event: "market/evaluate-percentiles.requested" }, // 手動トリガー対応
    ],
    concurrency: {
      limit: 1,
    },
    retries: 2,
  },
  async ({ event, step }) => {
    // 1. L1 および L2 の全ジャンルデータを取得
    const { l1Genres, l2Genres, cacheList } = await step.run("fetch-taxonomy-and-cache", async () => {
      const [genresRes, cacheRes] = await Promise.all([
        supabaseAdmin.from("genres").select("*").order("level", { ascending: true }),
        supabaseAdmin.from("market_cache").select("genre_id, materialized_json, updated_at"),
      ]);

      const allGenres = genresRes.data || [];
      const l1 = allGenres.filter((g) => g.level === 1);
      const l2 = allGenres.filter((g) => g.level === 2);
      const cache = cacheRes.data || [];

      return {
        l1Genres: l1,
        l2Genres: l2,
        cacheList: cache,
      };
    });

    // 2. L1 セクターごとの 20th Percentile 相対評価とステータス更新
    const executionResult = await step.run("evaluate-and-update-stagnant-status", async () => {
      const cacheMap = new Map<string, any>();
      for (const c of cacheList) {
        if (c.genre_id) {
          cacheMap.set(c.genre_id, c.materialized_json);
        }
      }

      const sectorReports: SectorPercentileReport[] = [];
      const stagnantUpdates: string[] = [];
      const activeUpdates: string[] = [];

      for (const l1 of l1Genres) {
        const childL2 = l2Genres.filter((g) => g.parent_id === l1.id);
        if (childL2.length === 0) continue;

        // 各 L2 カテゴリの熱量スコア（Engagement Metric）を算出
        const scoredL2 = childL2.map((l2) => {
          let score = 50; // デフォルトスコア

          // 1) 既存の market_cache から平均引力・企業数を反映
          const cached = cacheMap.get(l2.id);
          if (cached && Array.isArray(cached.companies) && cached.companies.length > 0) {
            const avgPull = cached.companies.reduce((sum: number, c: any) => sum + (c.pullScore || 50), 0) / cached.companies.length;
            score = avgPull;
          } else if (l2.status === "stagnant" || l2.canonical_name.toLowerCase().includes("legacy") || l2.canonical_name.toLowerCase().includes("monolithic") || l2.canonical_name.toLowerCase().includes("offline")) {
            // レガシー・孤立・古いオンプレ型は低熱量（例: 15〜25点）
            score = 20;
          } else {
            // アクティブな市場（例: 65〜90点）
            score = 75;
          }

          return {
            ...l2,
            engagementScore: score,
          };
        });

        // スコア昇順ソート
        scoredL2.sort((a, b) => a.engagementScore - b.engagementScore);

        const scores = scoredL2.map((item) => item.engagementScore);
        const count = scores.length;

        // 中央値と 20th Percentile ($P_{20}$) の計算
        const medianIndex = Math.floor(count * 0.5);
        const p20Index = Math.max(0, Math.floor(count * 0.2));
        const medianScore = scores[medianIndex] ?? 50;
        const p20Threshold = scores[p20Index] ?? 30;

        const stagnantInSector: string[] = [];
        const activeInSector: string[] = [];

        for (const l2 of scoredL2) {
          // 下位20%（<= P20）のカテゴリを特定して stagnant フラグを付与
          if (l2.engagementScore <= p20Threshold) {
            stagnantInSector.push(l2.id);
            stagnantUpdates.push(l2.id);
          } else {
            activeInSector.push(l2.id);
            activeUpdates.push(l2.id);
          }
        }

        sectorReports.push({
          l1Id: l1.id,
          l1Name: l1.canonical_name,
          l2Count: count,
          medianScore,
          percentile20Threshold: p20Threshold,
          stagnantL2Ids: stagnantInSector,
          activeL2Ids: activeInSector,
        });
      }

      // 3. Supabase DB の genres テーブルを一括更新
      if (stagnantUpdates.length > 0) {
        await supabaseAdmin
          .from("genres")
          .update({ status: "stagnant" })
          .in("id", stagnantUpdates);
      }

      if (activeUpdates.length > 0) {
        await supabaseAdmin
          .from("genres")
          .update({ status: "active" })
          .in("id", activeUpdates);
      }

      return {
        timestamp: new Date().toISOString(),
        totalSectorsEvaluated: l1Genres.length,
        totalL2Evaluated: l2Genres.length,
        stagnantCount: stagnantUpdates.length,
        activeCount: activeUpdates.length,
        sectorReports,
      };
    });

    return {
      success: true,
      result: executionResult,
    };
  }
);
