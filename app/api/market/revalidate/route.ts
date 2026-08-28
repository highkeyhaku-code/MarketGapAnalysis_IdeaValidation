import { NextRequest, NextResponse } from "next/server";
import { executeManualCacheRevalidate } from "../../../../lib/cacheRevalidate";

/**
 * 5.3 クレジット消費型キャッシュパージ API
 * POST /api/market/revalidate
 * Body: { genreId: string, userId?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { genreId, userId } = body;

    if (!genreId) {
      return NextResponse.json(
        { success: false, error: "genreId is required" },
        { status: 400 }
      );
    }

    const result = await executeManualCacheRevalidate(genreId, userId);

    if (!result.success) {
      const status = result.error === "INSUFFICIENT_CREDITS" ? 402 : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[API /api/market/revalidate] Exception:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to revalidate cache" },
      { status: 500 }
    );
  }
}
