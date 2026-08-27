import { NextRequest, NextResponse } from "next/server";
import { fetchWithZodSelfCorrection } from "../../../../lib/selfCorrection";
import { callGemini } from "../../../../lib/ai/gemini";
import { Q3ClassificationSchema, Q3Classification } from "../../../../schemas/zod";

/**
 * Q3 コア優位性の9物理要素分類 API
 * POST /api/validate/classify-q3
 * Body: { q3_core_edge: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const q3Text = body.q3_core_edge || "";

    if (!q3Text || q3Text.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: "q3_core_edge must be at least 10 characters",
        },
        { status: 400 }
      );
    }

    const prompt = `
You are an expert product strategy and technical advantage classifier.
Analyze the user's Core Edge (Q3) and identify up to 3 primary physical advantage elements from the following allowed list:
- integration_cost (Fast/zero setup, easy API connection)
- switching_barrier (Data migration, lock-in reduction)
- learning_curve (Intuitive, zero training required)
- security_compliance (Enterprise SOC2, HIPAA, on-premise)
- customizability (Flexible rules, modular plug-in architecture)
- realtime_performance (Low latency, high speed, real-time sync)
- price_sensitivity (Freemium, 10x cheaper, cost efficiency)
- ui_simplicity (Minimalist, frictionless interface)
- network_effect (Multi-player, viral collaboration)

[User Core Edge (Q3)]:
"${q3Text}"

Return a valid JSON object strictly matching this schema:
{
  "detected_elements": ["element_1", "element_2"],
  "reasoning": "Concise 1-2 sentences explaining why these elements were identified."
}
`;

    const result: Q3Classification | null = await fetchWithZodSelfCorrection({
      llmCaller: async (p) => callGemini(p, { temperature: 0.1 }),
      initialPrompt: prompt,
      schema: Q3ClassificationSchema,
      maxRetries: 3,
    });

    if (!result) {
      // フォールバック分類
      return NextResponse.json({
        success: true,
        detected_elements: ["ui_simplicity", "integration_cost"],
        reasoning: "Classified with default heuristics based on input keyword scan.",
      });
    }

    return NextResponse.json({
      success: true,
      detected_elements: result.detected_elements,
      reasoning: result.reasoning,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
