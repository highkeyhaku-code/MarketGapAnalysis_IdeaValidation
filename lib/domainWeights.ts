import { PhysicalElement, DomainType } from "../schemas/zod";

/**
 * 9つの物理要素に対するドメイン別ウェイトマトリックス (重み: 1〜5)
 * - B2B_ENTERPRISE: セキュリティ、導入コスト、カスタマイズ性重視
 * - B2B_SME: コスト感度、導入容易性、使いやすさ重視
 * - B2C_CONSUMER: UIシンプルさ、価格感度、ネットワーク効果重視
 */
export const DomainWeightMatrix: Record<DomainType, Record<PhysicalElement, number>> = {
  B2B_ENTERPRISE: {
    security_compliance: 5,
    integration_cost: 5,
    switching_barrier: 4,
    customizability: 4,
    realtime_performance: 3,
    learning_curve: 3,
    network_effect: 3,
    price_sensitivity: 2,
    ui_simplicity: 2,
  },
  B2B_SME: {
    price_sensitivity: 4,
    ui_simplicity: 4,
    learning_curve: 4,
    integration_cost: 3,
    security_compliance: 3,
    customizability: 3,
    switching_barrier: 3,
    realtime_performance: 3,
    network_effect: 3,
  },
  B2C_CONSUMER: {
    ui_simplicity: 5,
    price_sensitivity: 5,
    network_effect: 5,
    learning_curve: 5,
    realtime_performance: 4,
    switching_barrier: 2,
    customizability: 2,
    security_compliance: 2,
    integration_cost: 1,
  },
};

/**
 * 3xペナルティスコア計算ロジック
 * 差分（diff = 自社スコア - 競合/基準スコア）がマイナス（劣位）の場合は3倍のペナルティを適用。
 * プラスまたはゼロ（同等以上）の場合はそのままのウェイトで加点。
 * 
 * @param diff - スコア差分（例: 自社 - 競合）
 * @param weight - 要素ウェイト（1〜5）
 * @returns 加重計算後スコア
 */
export function calculate3xPenaltyScore(diff: number, weight: number): number {
  if (diff < 0) {
    // 劣位の場合は3倍ペナルティ
    return diff * weight * 3;
  }
  // 優位または同等の場合は通常加重
  return diff * weight;
}

export interface DomainScoreResult {
  totalScore: number;
  elementScores: Record<PhysicalElement, number>;
  penalizedCount: number;
}

/**
 * ドメイン全体での加重スコアおよびペナルティ計算
 * 
 * @param elementDiffs - 各物理要素の差分スコア
 * @param domain - ターゲットドメイン
 * @returns スコア集計結果
 */
export function calculateDomainWeightedScores(
  elementDiffs: Partial<Record<PhysicalElement, number>>,
  domain: DomainType
): DomainScoreResult {
  const weights = DomainWeightMatrix[domain];
  const elementScores: Record<PhysicalElement, number> = {
    integration_cost: 0,
    switching_barrier: 0,
    learning_curve: 0,
    security_compliance: 0,
    customizability: 0,
    realtime_performance: 0,
    price_sensitivity: 0,
    ui_simplicity: 0,
    network_effect: 0,
  };

  let totalScore = 0;
  let penalizedCount = 0;

  for (const [key, weight] of Object.entries(weights) as [PhysicalElement, number][]) {
    const diff = elementDiffs[key] ?? 0;
    const score = calculate3xPenaltyScore(diff, weight);
    elementScores[key] = score;
    totalScore += score;
    if (diff < 0) {
      penalizedCount += 1;
    }
  }

  return {
    totalScore,
    elementScores,
    penalizedCount,
  };
}
