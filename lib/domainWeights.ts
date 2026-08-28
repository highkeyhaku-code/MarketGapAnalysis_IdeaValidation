import { PhysicalElement, DomainType } from "../schemas/zod";

/**
 * 9つの物理要素に対するドメイン別ウェイトマトリックス (重み: 1〜5)
 * 設計書 2.1 準拠:
 * 1. CORE_FUNCTION (customizability): コア機能の解決力
 * 2. SETUP_COST (integration_cost): セットアップ・移行コスト・手間
 * 3. SECURITY (security_compliance): セキュリティ・プライバシー・信頼性
 * 4. SPEED (realtime_performance): 処理速度・パフォーマンス
 * 5. PRICE (price_sensitivity): 料金体系・価格的優位性
 * 6. LEARNING_CURVE (learning_curve): UI学習コスト・使いやすさ
 * 7. EMOTION (ui_simplicity): 出力品質・情緒的価値
 * 8. ECOSYSTEM (network_effect): 外部連携・エコシステム・連携性
 * 9. WHY_NOW (switching_barrier): 構造的変化・スイッチング障壁
 */
export const DomainWeightMatrix: Record<DomainType, Record<PhysicalElement, number>> = {
  B2B_ENTERPRISE: {
    customizability: 5,     // 1. コア機能解決力 (W=5)
    integration_cost: 5,    // 2. セットアップ・移行コスト (W=5)
    security_compliance: 5, // 3. セキュリティ・信頼性 (W=5)
    realtime_performance: 4,// 4. 処理速度 (W=4)
    price_sensitivity: 2,   // 5. 料金体系 (W=2: 予算はあるため相対的に低い)
    learning_curve: 4,      // 6. UI学習コスト (W=4)
    ui_simplicity: 1,       // 7. 情緒的価値 (W=1: エモーショナルな価値はほぼゼロ)
    network_effect: 4,      // 8. 外部連携・エコシステム (W=4)
    switching_barrier: 5,   // 9. スイッチング障壁・Why Now (W=5)
  },
  B2B_SME: {
    customizability: 5,     // 1. コア機能解決力 (W=5)
    integration_cost: 4,    // 2. セットアップ・移行コスト (W=4)
    security_compliance: 4, // 3. セキュリティ・信頼性 (W=4)
    realtime_performance: 3,// 4. 処理速度 (W=3)
    price_sensitivity: 4,   // 5. 料金体系 (W=4: SMEは価格にシビア)
    learning_curve: 4,      // 6. UI学習コスト (W=4)
    ui_simplicity: 2,       // 7. 情緒的価値 (W=2)
    network_effect: 3,      // 8. 外部連携 (W=3)
    switching_barrier: 5,   // 9. スイッチング障壁・Why Now (W=5)
  },
  B2C_CONSUMER: {
    customizability: 4,     // 1. コア機能解決力 (W=4)
    integration_cost: 3,    // 2. セットアップ (W=3)
    security_compliance: 2, // 3. セキュリティ (W=2)
    realtime_performance: 4,// 4. 処理速度 (W=4)
    price_sensitivity: 5,   // 5. 料金体系 (W=5: ワンコイン・無料に敏感)
    learning_curve: 5,      // 6. UI学習コスト (W=5: 分かりにくいと即離脱)
    ui_simplicity: 5,       // 7. 情緒的価値 (W=5: 触った時の気持ちよさが致命的)
    network_effect: 2,      // 8. 外部連携 (W=2)
    switching_barrier: 5,   // 9. スイッチング障壁・Why Now (W=5)
  },
};

/**
 * 損失回避（3xペナルティ）数理モデル
 * 設計書 2.2 準拠:
 *  Δ_i = 新アイデアスコア_i - 代替手段スコア_i
 *  S_i = Δ_i * W_i * 3 (if Δ_i < 0)
 *  S_i = Δ_i * W_i     (if Δ_i >= 0)
 * 
 * @param diff - スコア差分 (Δ_i)
 * @param weight - ドメイン加重 (W_i: 1〜5)
 * @returns 加重計算後スコア (S_i)
 */
export function calculate3xPenaltyScore(diff: number, weight: number): number {
  if (diff < 0) {
    // 劣位要素は3倍の損失回避ペナルティ
    return diff * weight * 3;
  }
  // 優位または同等の場合は通常加重
  return diff * weight;
}

export interface DomainScoreResult {
  totalScore: number;
  maxPossibleScore: number;
  penalizedCount: number;
  elementScores: Record<
    PhysicalElement,
    {
      diff: number;
      weight: number;
      score: number;
      isPenalized: boolean;
    }
  >;
}

/**
 * ドメイン別の9物理要素 3xペナルティスコア一括算出関数
 */
export function calculateDomainWeightedScores(
  diffs: Partial<Record<PhysicalElement, number>>,
  domain: DomainType = "B2B_SME"
): DomainScoreResult {
  const weights = DomainWeightMatrix[domain] || DomainWeightMatrix.B2B_SME;
  const elementScores = {} as DomainScoreResult["elementScores"];

  let totalScore = 0;
  let maxPossibleScore = 0;
  let penalizedCount = 0;

  const elements = Object.keys(weights) as PhysicalElement[];

  for (const elem of elements) {
    const diff = diffs[elem] ?? 0;
    const weight = weights[elem] ?? 3;
    const score = calculate3xPenaltyScore(diff, weight);
    const isPenalized = diff < 0;

    if (isPenalized) {
      penalizedCount += 1;
    }

    totalScore += score;
    maxPossibleScore += 3 * weight; // 最大差分 +3 とした場合の最大理論値

    elementScores[elem] = {
      diff,
      weight,
      score,
      isPenalized,
    };
  }

  return {
    totalScore,
    maxPossibleScore,
    penalizedCount,
    elementScores,
  };
}
