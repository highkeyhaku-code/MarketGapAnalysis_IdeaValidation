"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Zap,
  LayoutDashboard,
  Compass,
  GitBranch,
  Crown,
  LogIn,
  LogOut,
  User,
  CheckCircle2,
  AlertTriangle,
  Infinity as InfinityIcon,
  ChevronDown,
} from "lucide-react";
import { useBillingStore } from "../lib/store/useBillingStore";
import { useUserSession } from "../hooks/useUserSession";
import { isPortfolioMode } from "../lib/portfolio";
import { supabase } from "../lib/supabaseClient";

interface GarageHeaderProps {
  activeTab?: "kanban" | "discover" | "validate";
  onTabChange?: (tab: "kanban" | "discover" | "validate") => void;
}

function StripeBillingListener({
  userId,
  fetchCredits,
  setToastMessage,
}: {
  userId?: string;
  fetchCredits: (userId?: string) => Promise<void>;
  setToastMessage: (msg: { text: string; type: "success" | "info" } | null) => void;
}) {
  const searchParams = useSearchParams();

  // Stripe 決済成功 / キャンセルリダイレクトの検知
  useEffect(() => {
    const successType = searchParams?.get("billing_success");
    const cancelled = searchParams?.get("billing_cancelled");

    if (successType) {
      const tier = searchParams?.get("tier");
      const credits = searchParams?.get("credits");

      if (successType === "subscription") {
        setToastMessage({
          text: `🎉 ${tier ? tier.toUpperCase() : "新"}プランへのアップグレードが完了しました！`,
          type: "success",
        });
      } else if (successType === "credits") {
        setToastMessage({
          text: `🎉 追加クレジット (+${credits || 30} pts) のチャージが完了しました！`,
          type: "success",
        });
      }

      fetchCredits(userId);

      // URLパラメータのクリーンアップ
      const timer = setTimeout(() => {
        setToastMessage(null);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }, 5000);
      return () => clearTimeout(timer);
    }

    if (cancelled) {
      setToastMessage({
        text: "決済がキャンセルされました。",
        type: "info",
      });
      const timer = setTimeout(() => {
        setToastMessage(null);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, userId, fetchCredits, setToastMessage]);

  return null;
}

export function GarageHeader({ activeTab = "kanban", onTabChange }: GarageHeaderProps) {
  const router = useRouter();
  const { user, isGuest, openAuthWall } = useUserSession();
  const {
    planTier,
    monthlyCredits,
    purchasedCredits,
    totalCredits,
    openPricingModal,
    fetchCredits,
  } = useBillingStore();

  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" } | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // 1. 初回およびユーザー変更時のクレジット再取得
  useEffect(() => {
    fetchCredits(user?.id);
  }, [user?.id, fetchCredits]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "studio":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30";
      case "founder":
        return "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30";
      case "pro":
        return "bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30";
      case "starter":
        return "bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700";
    }
  };

  return (
    <>
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* ロゴ */}
          <div
            className="flex items-center space-x-3 cursor-pointer select-none"
            onClick={() => (onTabChange ? onTabChange("kanban") : router.push("/"))}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-[0_0_16px_rgba(99,102,241,0.5)]">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                THE GARAGE
              </span>
              <span className="ml-2 px-2 py-0.5 text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-md">
                SaaS Edition
              </span>
            </div>
          </div>

          {/* ナビゲーションタブ (コールバックまたはリンク) */}
          {onTabChange && (
            <div className="hidden md:flex items-center space-x-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => onTabChange("kanban")}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "kanban"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Kanban Hub</span>
              </button>

              <button
                onClick={() => onTabChange("discover")}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "discover"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Discover (重力マップ)</span>
              </button>

              <button
                onClick={() => onTabChange("validate")}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "validate"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Validate (Git for Ideas)</span>
              </button>
            </div>
          )}

          {/* 右端: ハイブリッドクレジット残高 & プランバッジ & ユーザーログイン状態 */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 text-xs">
            {/* プランバッジ (クリックで Pricing Modal 開く) */}
            <button
              onClick={openPricingModal}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold uppercase transition flex items-center space-x-1 cursor-pointer ${getTierColor(
                planTier
              )}`}
              title="クリックしてプラン一覧・アップグレード"
            >
              <Crown className="w-3 h-3" />
              <span>{planTier.toUpperCase()}</span>
            </button>

            {/* ハイブリッドクレジット表示 (Tooltip 連携) */}
            <div
              className="relative cursor-pointer"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={openPricingModal}
            >
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 rounded-xl transition shadow-sm">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                <div className="flex items-baseline space-x-1">
                  <span className="font-mono font-extrabold text-sm text-slate-100">
                    {totalCredits}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">pts</span>
                </div>
                {/* 内訳インラインバッジ */}
                <div className="hidden sm:flex items-center space-x-1 text-[10px] text-slate-400 border-l border-slate-800 pl-2">
                  <span className="text-indigo-300">月:{monthlyCredits}</span>
                  <span>/</span>
                  <span className="text-emerald-300">買:{purchasedCredits}</span>
                </div>
              </div>

              {/* ホバー時の詳細 Tooltip */}
              {showTooltip && (
                <div className="absolute right-0 top-full mt-2 w-56 p-3 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl z-50 text-[11px] space-y-1.5 animate-in fade-in duration-150 pointer-events-none">
                  <div className="font-bold text-slate-200 border-b border-slate-800 pb-1">
                    ⚡ ハイブリッドウォレット内訳
                  </div>
                  <div className="flex justify-between items-center text-indigo-300">
                    <span>月次クレジット (毎月リセット):</span>
                    <span className="font-mono font-bold">{monthlyCredits} pts</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-300">
                    <span>買い切りクレジット (永久繰越):</span>
                    <span className="font-mono font-bold">{purchasedCredits} pts</span>
                  </div>
                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 leading-tight">
                    ※ 月次枠から優先消費されます。クリックでプラン変更・追加チャージ。
                  </div>
                </div>
              )}
            </div>

            {/* ユーザーアカウント & ログイン導線 */}
            {isGuest ? (
              isPortfolioMode() ? (
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>デモモード</span>
                </div>
              ) : (
                <button
                  onClick={openAuthWall}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-indigo-600/30"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>ログイン</span>
                </button>
              )
            ) : (
              <div className="flex items-center space-x-2">
                <div
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300"
                  title={user?.email || "ユーザー"}
                >
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden lg:inline max-w-[120px] truncate text-[11px]">
                    {user?.email?.split("@")[0]}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition cursor-pointer"
                  title="ログアウト"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Stripe 決済URLリダイレクト検知リスナー (Suspense境界で安全に分離) */}
      <Suspense fallback={null}>
        <StripeBillingListener
          userId={user?.id}
          fetchCredits={fetchCredits}
          setToastMessage={setToastMessage}
        />
      </Suspense>

      {/* Stripe 完了 / キャンセルトースト通知 */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div
            className={`p-4 rounded-2xl shadow-2xl border text-xs font-sans flex items-center space-x-3 ${
              toastMessage.type === "success"
                ? "bg-emerald-950/95 border-emerald-500/40 text-emerald-100"
                : "bg-slate-900/95 border-slate-700 text-slate-200"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
            )}
            <span className="font-semibold">{toastMessage.text}</span>
          </div>
        </div>
      )}
    </>
  );
}
