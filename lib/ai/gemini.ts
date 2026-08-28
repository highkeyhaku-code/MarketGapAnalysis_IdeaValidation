import { env } from "../../src/env";

export interface GeminiCallOptions {
  model?: string;
  temperature?: number;
  systemInstruction?: string;
  responseMimeType?: string;
}

/**
 * Google AI Studio (Gemini) を呼び出す堅牢なラッパー関数
 * - デフォルトモデル: gemini-3-flash-preview
 * - 思考プロセスとJSON出力を確実に抽出
 */
export async function callGemini(
  prompt: string,
  options: GeminiCallOptions = {}
): Promise<string> {
  const model = options.model || "gemini-3-flash-preview";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  const bodyPayload: Record<string, unknown> = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      responseMimeType: options.responseMimeType ?? "application/json",
    },
  };

  if (options.systemInstruction) {
    bodyPayload.systemInstruction = {
      parts: [{ text: options.systemInstruction }],
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyPayload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[callGemini] API returned ${res.status}:`, errText);
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!generatedText) {
    throw new Error("Gemini API returned empty response candidates");
  }

  return generatedText;
}
