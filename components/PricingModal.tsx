"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Zap,
  CheckCircle2,
  X,
  ShieldCheck,
  ArrowRight,
  Infinity as InfinityIcon,
  Crown,
  Layers,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { useBillingStore, PlanTier } from "../lib/store/useBillingStore";
import { useUserSession } from "../hooks/useUserSession";

interface PlanConfig {
  id: PlanTier;
  name: string;
  price: string;
  monthlyCredits: number;
  description: string;
  features: string[];
  popular?: boolean;
  color: string;
  badge?: string;
}

const PLANS: PlanConfig[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    monthlyCredits: 25,
    description: "登録時体験・無料スタート",
    features: [
      "🎁 初回登録ボーナス 25 pts 付与",
      "Git for Ideas コミット履歴",
      "GitHub 死骸リポジトリ検索 (Autopsy)",
      "市場クレーター重力マップ閲覧 (Fog of War)",
    ],
    color: "from-slate-700 to-slate-800",
  },
  {
    id: "starter",
    name: "Starter",
    price: "$5 /月",
    monthlyCredits: 50,
    description: "個人開発者・小規模仮説検証",
    features: [
      "毎月 50 クレジット自動付与",
      "最大 16 回の極限検証コミット",
      "キャッシュ強制更新ペナルティ対応",
      "アンロック市場データの永久保存",
    ],
    color: "from-blue-600 to-indigo-700",
    badge: "β特別価格",
  },
  {
    id: "founder",
    name: "Founder",
    price: "$19 /月",
    monthlyCredits: 200,
    description: "スタートアップ創業者・連続検証者向け",
    features: [
      "毎月 200 クレジット自動付与",
      "最大 66 回の極限検証コミット",
      "リアルタイム競合摩擦データ優先解析",
      "投資家向け共有URL (NDAマスキング)",
      "ダウングレード時の資産完全保護",
    ],
    popular: true,
    badge: "Most Popular",
    color: "from-indigo-600 via-purple-600 to-pink-600",
  },
  {
    id: "studio",
    name: "Studio",
    price: "$49 /月",
    monthlyCredits: 600,
    description: "受託・エージェンシー・本格事業検証チーム",
    features: [
      "毎月 600 クレジット自動付与",
      "無制限 What-If ピボットシミュレーション",
      "Inngest 並列検証パイプライン最優先実行",
      "全市場クレーター無制限アクセス",
      "専任AIペルソナカスタムチューニング",
    ],
    badge: "Maximum Power",
    color: "from-amber-600 via-orange-600 to-yellow-600",
  },
];

export function PricingModal() {
  const { isPricingModalOpen, closePricingModal, planTier, monthlyCredits, purchasedCredits } = useBillingStore();
  const { user, openAuthWall } = useUserSession();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isPricingModalOpen) return null;

  const handleCheckout = async (mode: "subscription" | "payment", targetTier?: PlanTier, creditsAmount?: number) => {
    // 未ログインの場合は Auth Wall を先に案内
    if (!user) {
      closePricingModal();
      openAuthWall();
      return;
    }

    try {
      const actionKey = mode === "payment" ? "credits_30" : targetTier || "subscription";
      setLoadingAction(actionKey);
      setErrorMsg(null);

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          planTier: targetTier,
          creditsAmount,
          userId: user.id,
        }),
      });

      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        setErrorMsg(data.error || "決済URLの生成に失敗しました");
      }
    } catch (err: any) {
      setErrorMsg(`通信エラー: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* 閉じるボタン */}
        <button
          onClick={closePricingModal}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ヘッダータイトル */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Hybrid Credit Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            あなたの検証スピードに合わせた柔軟なプラン
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            月次枠は毎月リセットされますが、追加購入した買い切りクレジットは<span className="text-emerald-400 font-semibold">無期限・永久繰り越し</span>。月次クレジットから優先消費されるため、購入分が無駄になりません。
          </p>
        </div>

        {/* ハイブリッド課金の説明バナー */}
        <div className="bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-xs space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-200">現在の保有残高:</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">
                  {monthlyCredits + purchasedCredits} pts
                </span>
                <span className="text-slate-400">
                  (月次: {monthlyCredits} pts / 買い切り: {purchasedCredits} pts)
                </span>
              </div>
              <p className="text-slate-400">
                検証コミット（3pts）や手動キャッシュ破棄（3pts）の際、月次枠から自動で優先消費されます。
              </p>
            </div>
          </div>

          {/* 買い切りクレジット追加パック */}
          <div className="w-full sm:w-auto flex items-center justify-end shrink-0">
            <button
              onClick={() => handleCheckout("payment", undefined, 30)}
              disabled={loadingAction === "credits_30"}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center space-x-2 border border-emerald-400/30"
            >
              {loadingAction === "credits_30" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <InfinityIcon className="w-4 h-4 text-emerald-200" />
              )}
              <span>+30 pts 追加購入 ($9)</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 font-mono">
                永久繰越
              </span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* プラン一覧グリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {PLANS.map((plan) => {
            const isCurrent = planTier === plan.id;
            const isLoadingThis = loadingAction === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-2xl p-5 border transition duration-200 ${
                  plan.popular
                    ? "bg-slate-900/90 border-purple-500/60 shadow-xl shadow-purple-900/20"
                    : isCurrent
                    ? "bg-slate-900/90 border-indigo-500/60 ring-1 ring-indigo-500"
                    : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* バッジ */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-500/30">
                    {plan.badge}
                  </div>
                )}

                <div className="space-y-4">
                  {/* プランヘッダー */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base text-slate-100">{plan.name}</h3>
                      {isCurrent && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded-md">
                          現在のプラン
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{plan.description}</p>
                  </div>

                  {/* 価格 */}
                  <div className="py-2 border-y border-slate-800/80">
                    <div className="text-2xl font-black text-slate-100">{plan.price}</div>
                    <div className="flex items-center space-x-1.5 text-xs text-amber-400 font-semibold mt-1">
                      <Zap className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{plan.monthlyCredits} pts / 月</span>
                    </div>
                  </div>

                  {/* 特徴リスト */}
                  <ul className="space-y-2 text-xs text-slate-300">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-tight">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* アクションボタン */}
                <div className="pt-6">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold cursor-not-allowed border border-slate-700"
                    >
                      現在のプラン
                    </button>
                  ) : plan.id === "free" ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold cursor-not-allowed border border-slate-700"
                    >
                      無料枠
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCheckout("subscription", plan.id)}
                      disabled={isLoadingThis}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-lg transition cursor-pointer flex items-center justify-center space-x-1.5 bg-gradient-to-r ${plan.color} hover:opacity-90`}
                    >
                      {isLoadingThis ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>アップグレード</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* フッター補足説明 */}
        <div className="pt-2 text-center text-[11px] text-slate-500 flex items-center justify-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Stripe による暗号化決済。いつでも即座にキャンセル・ダウングレード可能。過去のアンロック資産は維持されます。</span>
        </div>
      </div>
    </div>
  );
}
