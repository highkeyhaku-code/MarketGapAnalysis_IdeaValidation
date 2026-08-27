"use client";

import React from "react";
import { Swords, ShieldAlert, Sparkles, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PhysicalElement } from "../schemas/zod";

export interface VSCardBoardProps {
  ideaTitle: string;
  competitorName: string;
  competitorTagline?: string;
  elementDiffs: Partial<Record<PhysicalElement, number>>;
  overallScore: number;
}

const ELEMENT_DISPLAY_NAMES: Record<PhysicalElement, string> = {
  integration_cost: "導入工数 (Integration)",
  switching_barrier: "乗り換え障壁 (Switching)",
  learning_curve: "初期学習コスト (Learning)",
  security_compliance: "セキュリティ (Compliance)",
  customizability: "カスタマイズ性 (Flexibility)",
  realtime_performance: "処理速度 (Realtime)",
  price_sensitivity: "コスト感度 (Pricing)",
  ui_simplicity: "UIの簡潔さ (Simplicity)",
  network_effect: "バイラル効果 (Network)",
};

/**
 * VS Card Board コンポーネント (VSCardBoard)
 * 標的競合と自社アイデアの9物理要素スペック差分（3xペナルティ適用）を対比描画する。
 */
export function VSCardBoard({
  ideaTitle,
  competitorName,
  competitorTagline,
  elementDiffs,
  overallScore,
}: VSCardBoardProps) {
  const elements = Object.keys(ELEMENT_DISPLAY_NAMES) as PhysicalElement[];

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 font-sans text-slate-100">
      {/* VS 対戦ヘッダー */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        {/* 自社 */}
        <div className="flex-1 space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">
            Challenger (Your Idea)
          </span>
          <h3 className="text-base font-bold text-slate-100 truncate">{ideaTitle || "New Startup Hypothesis"}</h3>
          <div className="inline-flex items-center space-x-1 px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded-md text-[11px]">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Score: {overallScore} pts</span>
          </div>
        </div>

        {/* VS バッジ */}
        <div className="px-4 flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-slate-700">
            <Swords className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-mono font-black text-slate-400 mt-1">HEAD-TO-HEAD</span>
        </div>

        {/* 標的競合 */}
        <div className="flex-1 text-right space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400">
            Incumbent Target (標的)
          </span>
          <h3 className="text-base font-bold text-slate-100 truncate">{competitorName}</h3>
          <p className="text-[11px] text-slate-400 truncate">{competitorTagline || "Market Leader"}</p>
        </div>
      </div>

      {/* 9物理要素スペック天秤バー */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Physical Elements Comparison (9要素スペック比較)
        </h4>

        <div className="space-y-2.5">
          {elements.map((elem) => {
            const diff = elementDiffs[elem] ?? 0;
            const isAdvantage = diff > 0;
            const isDisadvantage = diff < 0;
            const isTie = diff === 0;

            return (
              <div
                key={elem}
                className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs transition hover:border-slate-700"
              >
                {/* 自社側の優位表示 */}
                <div className="w-1/3 flex items-center space-x-2">
                  {isAdvantage ? (
                    <div className="flex items-center space-x-1 text-emerald-400 font-bold">
                      <ArrowUpRight className="w-4 h-4" />
                      <span>+{diff} Advantage</span>
                    </div>
                  ) : (
                    <span className="text-slate-600 text-[11px]">-</span>
                  )}
                </div>

                {/* 中央要素ラベル */}
                <div className="w-1/3 text-center">
                  <span className="font-semibold text-slate-200 block text-xs">
                    {ELEMENT_DISPLAY_NAMES[elem]}
                  </span>
                  {isDisadvantage && (
                    <span className="text-[10px] text-rose-400 font-mono">
                      [3x Penalty: {diff * 3} pts]
                    </span>
                  )}
                </div>

                {/* 競合側の優位表示 */}
                <div className="w-1/3 flex items-center justify-end space-x-2 text-right">
                  {isDisadvantage ? (
                    <div className="flex items-center space-x-1 text-rose-400 font-bold">
                      <span>{Math.abs(diff)} Incumbent Superior</span>
                      <ArrowDownRight className="w-4 h-4" />
                    </div>
                  ) : isTie ? (
                    <span className="text-slate-500 text-[11px]">Parity (互角)</span>
                  ) : (
                    <span className="text-slate-600 text-[11px]">-</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
