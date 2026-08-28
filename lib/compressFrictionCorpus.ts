/**
 * 摩擦濃縮フィルター (Lexical Filter & High-Priority Booster)
 * 設計書 3.2 準拠:
 *  - ノイズ除去・抽出 RegEx:
 *    /((?:complex|workaround|clunky|instead of|switched to|gave up|expensive|painful)\b.*?.!?)/gi
 *  - Booster 正規表現 (高優先度マーク用):
 *    /(zapier|export|workaround|manual|excel|clunky|too complex|gave up)/i
 *  - トークン極小化:
 *    マッチした摩擦のある前後3段落のみ（約150トークン / 500文字上限）に純化・濃縮してLLMに渡す。
 */

// 1. ノイズ除去・抽出正規表現 (設計書 3.2 準拠)
export const NOISE_EXTRACTION_REGEX =
  /((?:complex|workaround|clunky|instead of|switched to|gave up|expensive|painful)\b.*?[.!?])/gi;

// 2. Booster 正規表現 (設計書 3.2 準拠: 高優先度ペイン加点)
export const BOOSTER_REGEX =
  /(zapier|export|workaround|manual|excel|clunky|too complex|gave up|手動|エクセル|諦めた|使いにくい)/i;

// 汎用摩擦補足パターン (日英対応)
export const SUPPLEMENTARY_PATTERNS: RegExp[] = [
  /\b(slow|latency|crashes?|buggy?|broken|glitch|down|outage|unstable)\b/i,
  /\b(pricey|overpriced|hidden fees?|pricing|tier)\b/i,
  /\b(confusing|unintuitive|hard to (use|setup|configure)|steep learning curve)\b/i,
  /\b(lacks?|missing|poor support|unresponsive)\b/i,
  /\b(frustrat(ing|ed|ion)|annoying|pain point|bottleneck)\b/i,
  /(遅い|重い|固まる|クラッシュ|高い|割高|サポートが遅い|設定が面倒|不満|ストレス)/,
];

export interface ScoredParagraph {
  text: string;
  score: number;
  hasBooster: boolean;
  extractedFrictions: string[];
}

/**
 * 摩擦コーパスの純化・濃縮処理
 * 
 * @param rawCorpus - レビューやフォーラムの生テキスト
 * @param maxParagraphs - 抽出する最大段落数（デフォルト: 3）
 * @param maxChars - 最大文字数上限（デフォルト: 500文字 / 約150トークン）
 * @returns 純化・濃縮された摩擦テキスト
 */
export function compressFrictionCorpus(
  rawCorpus: string,
  maxParagraphs = 3,
  maxChars = 500
): string {
  if (!rawCorpus || rawCorpus.trim().length === 0) {
    return "";
  }

  // 1. テキストを段落・文境界で分割
  const rawParagraphs = rawCorpus
    .split(/\n\s*\n|\r\n\s*\r\n|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 10);

  if (rawParagraphs.length === 0) {
    return rawCorpus.slice(0, maxChars).trim();
  }

  // 2. 各段落を Lexical Filter と Booster Regex で評価・スコアリング
  const scoredParagraphs: ScoredParagraph[] = rawParagraphs.map((text) => {
    let score = 0;
    const extractedFrictions: string[] = [];

    // ノイズ除去抽出 RegEx マッチング
    const noiseMatches = text.match(NOISE_EXTRACTION_REGEX);
    if (noiseMatches) {
      score += noiseMatches.length * 4; // 基本摩擦マッチ (+4点)
      extractedFrictions.push(...noiseMatches);
    }

    // Booster 正規表現マッチング (Zapier, Workaround, Excel等)
    const hasBooster = BOOSTER_REGEX.test(text);
    if (hasBooster) {
      score += 6; // 高優先度 Booster (+6点加点)
    }

    // 補足パターン
    for (const pat of SUPPLEMENTARY_PATTERNS) {
      const suppMatches = text.match(pat);
      if (suppMatches) {
        score += suppMatches.length * 1.5;
      }
    }

    return {
      text,
      score,
      hasBooster,
      extractedFrictions,
    };
  });

  // 3. 摩擦スコア降順（Booster優先）でソートし、上位最大3段落を選択
  const selected = scoredParagraphs
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxParagraphs);

  // マッチが一切なかった場合は、先頭段落をフォールバックとして採用
  if (selected.length === 0) {
    return rawParagraphs.slice(0, maxParagraphs).join("\n\n").slice(0, maxChars).trim();
  }

  // 4. トークン極小化 (約150トークン / 最大500文字) に制限して結合
  let resultText = "";
  for (const item of selected) {
    const candidate = resultText ? `${resultText}\n\n${item.text}` : item.text;
    if (candidate.length > maxChars) {
      if (!resultText) {
        resultText = candidate.slice(0, maxChars).trim() + "...";
      }
      break;
    }
    resultText = candidate;
  }

  return resultText.trim();
}
