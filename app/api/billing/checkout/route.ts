import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/src/env";
import { supabaseAdmin, getDefaultOrAuthUserId } from "@/lib/supabaseClient";
import { PlanTier, PLAN_TIER_MONTHLY_CREDITS } from "@/lib/credits";

export const dynamic = "force-dynamic";

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" as any })
  : null;

const PLAN_PRICES: Record<Exclude<PlanTier, "free">, { amount: number; name: string; currency: string }> = {
  starter: { amount: 500, name: "Starter Plan (月50クレジット)", currency: "usd" },
  founder: { amount: 1900, name: "Founder Plan (月200クレジット)", currency: "usd" },
  studio: { amount: 4900, name: "Studio Plan (月600クレジット)", currency: "usd" },
  pro: { amount: 1900, name: "Founder Plan (月200クレジット)", currency: "usd" },
};

/**
 * Stripe Checkout Session 生成 API
 * POST /api/billing/checkout
 * Body: { mode: "subscription" | "payment", planTier?: PlanTier, creditsAmount?: number, userId?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode = "subscription", planTier = "starter", creditsAmount = 30, userId: bodyUserId } = body;

    const authHeader = req.headers.get("authorization");
    let userId = bodyUserId;

    if (!userId && authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseAdmin.auth.getUser(token);
      userId = data?.user?.id || null;
    }

    if (!userId) {
      userId = await getDefaultOrAuthUserId();
    }

    const origin = req.headers.get("origin") || env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // 1. Stripe API キーが未設定の場合の開発用フォールバック
    if (!stripe) {
      console.warn("⚠️ [Billing Checkout] STRIPE_SECRET_KEY is not configured. Returning mock checkout URL.");
      const mockSuccessUrl =
        mode === "payment"
          ? `${origin}/?billing_success=credits&amount=${creditsAmount}`
          : `${origin}/?billing_success=subscription&tier=${planTier}`;
      return NextResponse.json({
        success: true,
        url: mockSuccessUrl,
        isMock: true,
      });
    }

    // 2. Stripe Checkout Session の生成
    if (mode === "payment") {
      // 買い切りクレジット購入 (30クレジット = ¥1,200)
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `The Garage 追加クレジットパック (${creditsAmount} pts)`,
                description: "無期限・永久繰り越しのハイブリッド課金クレジット。月次枠の枯渇時に自動消費されます。",
              },
              unit_amount: 900, // $9.00
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        client_reference_id: userId,
        metadata: {
          type: "credits_purchase",
          credits: creditsAmount.toString(),
          userId,
        },
        success_url: `${origin}/?billing_success=credits&amount=${creditsAmount}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?billing_cancelled=true`,
      });

      return NextResponse.json({ success: true, url: session.url, sessionId: session.id });
    } else {
      // サブスクリプションプラン (Starter / Founder / Studio)
      const targetTier = (planTier in PLAN_PRICES ? planTier : "starter") as Exclude<PlanTier, "free">;
      const planInfo = PLAN_PRICES[targetTier];

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: planInfo.currency,
              product_data: {
                name: `The Garage ${planInfo.name}`,
                description: `毎月自動付与の基本枠クレジット (${PLAN_TIER_MONTHLY_CREDITS[targetTier]} pts/月)。`,
              },
              unit_amount: planInfo.amount,
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        client_reference_id: userId,
        metadata: {
          type: "subscription",
          plan_tier: targetTier,
          userId,
        },
        success_url: `${origin}/?billing_success=subscription&tier=${targetTier}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?billing_cancelled=true`,
      });

      return NextResponse.json({ success: true, url: session.url, sessionId: session.id });
    }
  } catch (err: any) {
    console.error("❌ [Billing Checkout] Error creating session:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
