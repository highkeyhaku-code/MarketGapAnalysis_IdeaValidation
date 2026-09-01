"use client";

import React from "react";
import { useIdeaStore } from "../lib/store/useIdeaStore";
import { RotateCcw, ArrowRight, Compass, Sparkles } from "lucide-react";

interface DetachedHeadStickyBannerProps {
  onCheckoutLatest?: () => void;
  customViewingVersion?: string;
  customActiveVersion?: string;
  customIsDetached?: boolean;
}

/**
 * タイムトラベル（Detached HEAD）時の Sticky フローティングヘッダー CTA
 * 
 * 過去バージョンを閲覧中の場合、画面上部に
 * 「🕰️ 現在 v2 を閲覧中 [最新の v3 に戻る]」
 * というStickyバーを常時表示し、クリックで最新状態（Checkout）へ即時復帰する。
 */
export function DetachedHeadStickyBanner({
  onCheckoutLatest,
  customViewingVersion,
  customActiveVersion,
  customIsDetached,
}: DetachedHeadStickyBannerProps) {
  const { isDetachedHead, viewingVersion, activeVersion, checkoutLatest } = useIdeaStore();

  const isDetached = customIsDetached !== undefined ? customIsDetached : isDetachedHead;
  const currentVer = customViewingVersion || viewingVersion || "v1";
  const latestVer = customActiveVersion || activeVersion || "v2";

  if (!isDetached) {
    return null;
  }

  const handleCheckout = () => {
    checkoutLatest();
    if (onCheckoutLatest) {
      onCheckoutLatest();
    }
  };

  return (
    <div className="sticky top-16 z-40 w-full bg-gradient-to-r from-amber-950/95 via-purple-950/95 to-slate-900/95 backdrop-blur-xl border-b border-amber-500/40 px-6 py-2.5 shadow-2xl transition-all duration-300 animate-in slide-in-from-top-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2.5 text-amber-200 font-medium">
          <span className="text-base animate-bounce">🕰️</span>
          <span>
            Detached HEAD 状態: 現在 <strong className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded font-mono font-bold border border-amber-500/40">{currentVer}</strong> を閲覧中（過去の世界線）
          </span>
          <span className="hidden md:inline-block text-[11px] text-amber-300/70">
            — この状態でピボットすると新ブランチが作成されます
          </span>
        </div>

        <button
          type="button"
          onClick={handleCheckout}
          className="flex items-center space-x-1.5 px-4 py-1.5 bg-gradient-to-r from-amber-500 to-indigo-500 hover:from-amber-400 hover:to-indigo-400 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition transform active:scale-95 cursor-pointer text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-950" />
          <span>最新の {latestVer} に戻る (Checkout HEAD)</span>
        </button>
      </div>
    </div>
  );
}
