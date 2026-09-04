import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/src/env";
import { supabaseAdmin } from "@/lib/supabaseClient";
import {
  addPurchasedCredits,
  resetMonthlyCredits,
  downgradeSubscriptionByCustomerId,
  PLAN_TIER_MONTHLY_CREDITS,
  PlanTier,
} from "@/lib/credits";

export const dynamic = "force-dynamic";

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" as any })
  : null;

/**
 * Stripe Webhook ハンドラ
 * POST /api/webhooks/stripe
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // 1. Stripe 署名検証
    if (env.STRIPE_WEBHOOK_SECRET && signature && stripe) {
      try {
        event = stripe.webhooks.constructEvent(
          rawBody,
          signature,
          env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err: any) {
        console.error("❌ [Stripe Webhook] Signature verification failed:", err.message);
        return NextResponse.json(
          { success: false, error: `Webhook Error: ${err.message}` },
          { status: 400 }
        );
      }
    } else {
      // 開発/テスト環境または Secret 未設定時のフェイルソフトパース
      try {
        event = JSON.parse(rawBody);
      } catch (_e) {
        return NextResponse.json(
          { success: false, error: "Invalid JSON body" },
          { status: 400 }
        );
      }
      console.warn("⚠️ [Stripe Webhook] Warning: Processing webhook without signature verification (dev/test mode)");
    }

    console.log(`🔔 [Stripe Webhook] Processing event: ${event.type} (${event.id})`);

    // 2. イベント種別ごとの処理
    switch (event.type) {
      /**
       * 1. 買い切りクレジット購入 または 初回サブスクリプション
       */
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId =
          session.client_reference_id ||
          (session.metadata?.userId as string) ||
          (session.metadata?.user_id as string);

        const stripeCustomerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;

        if (!userId) {
          console.warn("⚠️ [Stripe Webhook] checkout.session.completed: Missing userId or client_reference_id");
          return NextResponse.json({ success: true, warning: "Missing userId" });
        }

        // A. 買い切りクレジット購入 (mode: payment)
        if (session.mode === "payment" || session.metadata?.type === "credits_purchase") {
          const creditsToAdd = parseInt(
            (session.metadata?.credits as string) ||
            (session.metadata?.credit_amount as string) ||
            "20",
            10
          );

          console.log(`💳 [Stripe Webhook] Adding ${creditsToAdd} purchased credits to user: ${userId}`);
          const res = await addPurchasedCredits(userId, creditsToAdd, stripeCustomerId);
          if (!res.success) {
            console.error("❌ Failed to add purchased credits:", res.error);
            return NextResponse.json({ success: false, error: res.error }, { status: 500 });
          }

          return NextResponse.json({
            success: true,
            event: event.type,
            userId,
            addedCredits: creditsToAdd,
            newPurchasedBalance: res.newPurchased,
          });
        }

        // B. サブスクリプション初回開始 (mode: subscription)
        if (session.mode === "subscription") {
          const rawTier = (session.metadata?.plan_tier as string) || "starter";
          const planTier: PlanTier = (["free", "starter", "pro", "founder"].includes(rawTier)
            ? rawTier
            : "starter") as PlanTier;

          const monthlyAllowance = PLAN_TIER_MONTHLY_CREDITS[planTier] || 50;

          console.log(`🌟 [Stripe Webhook] Initializing subscription: tier=${planTier}, credits=${monthlyAllowance} for user: ${userId}`);
          await resetMonthlyCredits(userId, monthlyAllowance, planTier, stripeCustomerId);

          return NextResponse.json({
            success: true,
            event: event.type,
            userId,
            planTier,
            monthlyCredits: monthlyAllowance,
          });
        }
        break;
      }

      /**
       * 2. 月次サブスクリプション支払い成功 (月次クレジットリセット)
       */
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeCustomerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

        if (!stripeCustomerId) {
          console.warn("⚠️ [Stripe Webhook] invoice.payment_succeeded: Missing stripeCustomerId");
          return NextResponse.json({ success: true, warning: "Missing customer id" });
        }

        // profiles テーブルから stripe_customer_id でユーザーを特定
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id, plan_tier, monthly_credits, purchased_credits")
          .eq("stripe_customer_id", stripeCustomerId)
          .single();

        if (!profile) {
          console.warn(`⚠️ [Stripe Webhook] No user found for stripe_customer_id: ${stripeCustomerId}`);
          return NextResponse.json({ success: true, warning: "User profile not found" });
        }

        const planTier = (profile.plan_tier as PlanTier) || "starter";
        const tierMonthlyCredits = PLAN_TIER_MONTHLY_CREDITS[planTier] || 50;

        console.log(`🔄 [Stripe Webhook] Resetting monthly credits for user: ${profile.id} to ${tierMonthlyCredits} (${planTier})`);
        await resetMonthlyCredits(profile.id, tierMonthlyCredits, planTier, stripeCustomerId);

        return NextResponse.json({
          success: true,
          event: event.type,
          userId: profile.id,
          planTier,
          resetMonthlyCredits: tierMonthlyCredits,
        });
      }

      /**
       * 3. サブスクリプション解約 / ダウングレード
       */
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id;

        if (stripeCustomerId) {
          console.log(`📉 [Stripe Webhook] Downgrading user with customerId: ${stripeCustomerId} to 'free'`);
          await downgradeSubscriptionByCustomerId(stripeCustomerId);
        }

        return NextResponse.json({
          success: true,
          event: event.type,
          message: "Subscription cancelled, plan downgraded to free. Unlocked markets preserved.",
        });
      }

      default: {
        console.log(`ℹ️ [Stripe Webhook] Unhandled event type: ${event.type}`);
        return NextResponse.json({ success: true, message: `Event ${event.type} ignored` });
      }
    }

    return NextResponse.json({ success: true, event: event.type });
  } catch (err: any) {
    console.error("❌ [Stripe Webhook] Internal server error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
