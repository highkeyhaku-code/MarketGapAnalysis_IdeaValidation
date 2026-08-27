/**
 * 摩擦・ペインキーワード定義 (正規表現用パターン)
 */
const FRICTION_PATTERNS: RegExp[] = [
  // 英語キーワード
  /\b(slow|lag|sluggish|latency|crashes?|buggy?|broken|glitch)\b/i,
  /\b(expensive|costly|pricey|overpriced|hidden fees?|pricing)\b/i,
  /\b(confusing|unintuitive|hard to (use|setup|configure)|complex|steep learning curve)\b/i,
  /\b(lacks?|missing|no support for|poor support|unresponsive)\b/i,
  /\b(frustrat(ing|ed|ion)|hate|annoying|pain point|bottleneck|disappointed)\b/i,
  /\b(down|outage|unstable|frequent errors?|failure)\b/i,
  // 日本語キーワード
  /(使いにくい|分かりにくい|遅い|重い|固まる|落ちる|クラッシュ)/,
  /(高い|費用対効果|割高|課金|料金プラン|コスパが悪い)/,
  /(サポートが遅い|機能不足|連携できない|設定が面倒|エラーが多い)/,
  /(不満|ストレス|改善してほしい|使い物にならない|バグ|動かない)/,
];

/**
 * テキスト濃縮フィルター (compressFrictionCorpus)
 * 摩擦キーワードを正規表現で抽出し、上限3段落（約150〜500文字）で結合する。
 * 
 * @param rawCorpus - レビューやフィードバック等の生テキスト
 * @param maxParagraphs - 結合する最大段落数（デフォルト: 3）
 * @param maxChars - 最大文字数上限（デフォルト: 500文字）
 * @returns 濃縮された摩擦テキスト
 */
export function compressFrictionCorpus(
  rawCorpus: string,
  maxParagraphs = 3,
  maxChars = 500
): string {
  if (!rawCorpus || rawCorpus.trim().length === 0) {
    return "";
  }

  // 1. テキストを段落または改行・文単位で分割
  const paragraphs = rawCorpus
    .split(/\n\s*\n|\r\n\s*\r\n|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 15); // 極端に短い行は除外

  if (paragraphs.length === 0) {
    return rawCorpus.slice(0, maxChars).trim();
  }

  // 2. 各段落の摩擦スコアを算出（キーワード一致数）
  const scoredParagraphs = paragraphs.map((text) => {
    let score = 0;
    for (const pattern of FRICTION_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        score += matches.length;
      }
    }
    return { text, score };
  });

  // 3. スコアが高い段落を優先的にソート（スコアが同じなら先頭優先）
  const ranked = [...scoredParagraphs].sort((a, b) => b.score - a.score);

  // 摩擦キーワードが1つも含まれていない場合は元の冒頭を採用
  const selected: string[] = [];
  let currentLength = 0;

  for (const item of ranked) {
    if (selected.length >= maxParagraphs) break;
    // 重複段落の防止
    if (selected.includes(item.text)) continue;

    // スコアが0の場合でも段落が足りなければ補充
    if (selected.length > 0 && item.score === 0 && selected.length >= 1) {
      break;
    }

    if (currentLength + item.text.length > maxChars && selected.length > 0) {
      // 最大文字数を超える場合は切り詰めて追加
      const remainingChars = maxChars - currentLength;
      if (remainingChars > 30) {
        selected.push(item.text.slice(0, remainingChars) + "...");
      }
      break;
    }

    selected.push(item.text);
    currentLength += item.text.length;
  }

  // 結合して返す
  return selected.join("\n\n").slice(0, maxChars).trim();
}
