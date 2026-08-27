import { z, ZodError } from "zod";

export interface SelfCorrectionOptions<T> {
  /**
   * LLMを呼び出して生のレスポンス文字列を取得する関数
   */
  llmCaller: (prompt: string) => Promise<string>;
  /**
   * 最初に送信するプロンプト
   */
  initialPrompt: string;
  /**
   * 検証に使用する Zod スキーマ
   */
  schema: z.ZodSchema<T>;
  /**
   * 最大試行回数（デフォルト: 3）
   */
  maxRetries?: number;
  /**
   * オプションのロガーやデバッグ用コールバック
   */
  onRetry?: (attempt: number, error: string) => void;
}

/**
 * 自己修正ループ (fetchWithZodSelfCorrection)
 * 最大3回の再試行ループ。ZodError検知時、エラーメッセージをプロンプトに動的付与してLLMに再要求。
 * 3回失敗時は null を返す。
 */
export async function fetchWithZodSelfCorrection<T>({
  llmCaller,
  initialPrompt,
  schema,
  maxRetries = 3,
  onRetry,
}: SelfCorrectionOptions<T>): Promise<T | null> {
  let currentPrompt = initialPrompt;
  let lastError = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        currentPrompt = `${initialPrompt}\n\n[CRITICAL INSTRUCTION - PREVIOUS OUTPUT VALIDATION FAILED]:\nYour previous JSON output failed Zod schema validation with the following error(s):\n${lastError}\n\nPlease strictly fix the schema violations and return ONLY the valid JSON object conforming to the required schema.`;
        if (onRetry) {
          onRetry(attempt, lastError);
        }
      }

      const rawResponse = await llmCaller(currentPrompt);
      
      // JSON文字列の抽出（マークダウンブロック ```json ... ``` に対応）
      const cleanedJson = extractJsonString(rawResponse);
      const parsedData = JSON.parse(cleanedJson);
      
      // Zod スキーマによる検証
      const validated = schema.parse(parsedData);
      return validated;
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        lastError = JSON.stringify(err.issues, null, 2);
      } else if (err instanceof SyntaxError) {
        lastError = `Invalid JSON syntax: ${err.message}`;
      } else if (err instanceof Error) {
        lastError = err.message;
      } else {
        lastError = String(err);
      }
    }
  }

  return null;
}

/**
 * レスポンスからJSON文字列を抽出するヘルパー
 */
function extractJsonString(text: string): string {
  const trimmed = text.trim();
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = trimmed.match(jsonBlockRegex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return trimmed;
}
