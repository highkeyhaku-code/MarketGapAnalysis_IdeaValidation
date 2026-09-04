import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getDefaultOrAuthUserId } from "@/lib/supabaseClient";
import { getUserCreditsProfile } from "@/lib/credits";

export const dynamic = "force-dynamic";

/**
 * ユーザーのハイブリッドクレジット残高およびプラン情報を取得
 * GET /api/billing/credits
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseAdmin.auth.getUser(token);
      userId = data?.user?.id || null;
    }

    // 認証ヘッダーがない場合、クエリパラメータまたはデフォルトユーザー
    if (!userId) {
      const { searchParams } = new URL(req.url);
      userId = searchParams.get("userId") || null;
    }

    if (!userId) {
      userId = await getDefaultOrAuthUserId();
    }

    const profile = await getUserCreditsProfile(userId);

    return NextResponse.json({
      success: true,
      userId,
      profile: {
        planTier: profile.plan_tier,
        monthlyCredits: profile.monthly_credits,
        purchasedCredits: profile.purchased_credits,
        totalCredits: profile.total_credits,
        stripeCustomerId: profile.stripe_customer_id,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch credits" },
      { status: 500 }
    );
  }
}
