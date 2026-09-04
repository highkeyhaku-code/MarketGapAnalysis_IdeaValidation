import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getDefaultOrAuthUserId } from "@/lib/supabaseClient";
import { isMarketUnlocked, getUnlockedMarketsList, unlockMarket } from "@/lib/credits";

export const dynamic = "force-dynamic";

/**
 * 市場アンロック API
 * POST /api/market/unlocked
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { genreId, userId: bodyUserId } = body;
    if (!genreId) {
      return NextResponse.json({ success: false, error: "genreId is required" }, { status: 400 });
    }

    const userId = bodyUserId || (await getDefaultOrAuthUserId());
    const unlocked = await unlockMarket(userId, genreId);

    return NextResponse.json({
      success: unlocked,
      userId,
      genreId,
      message: unlocked ? "Market unlocked successfully" : "Failed to unlock market",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * ユーザーがアンロック済みの市場一覧または特定市場のアンロック状態を取得
 * GET /api/market/unlocked?genreId=[genreId]
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const genreId = searchParams.get("genreId");
    const userIdParam = searchParams.get("userId");

    const authHeader = req.headers.get("authorization");
    let userId = userIdParam;

    if (!userId && authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseAdmin.auth.getUser(token);
      userId = data?.user?.id || null;
    }

    if (!userId) {
      userId = await getDefaultOrAuthUserId();
    }

    // 特定ジャンルのアンロック確認
    if (genreId) {
      const unlocked = await isMarketUnlocked(userId, genreId);
      return NextResponse.json({
        success: true,
        userId,
        genreId,
        isUnlocked: unlocked,
      });
    }

    // アンロック済み全ジャンルの取得
    const unlockedList = await getUnlockedMarketsList(userId);
    return NextResponse.json({
      success: true,
      userId,
      unlockedMarkets: unlockedList,
      count: unlockedList.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
