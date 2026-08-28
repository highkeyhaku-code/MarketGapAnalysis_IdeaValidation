"use client";

import React from "react";
import { AlertCircle, Flame, Shield, Brain, Sparkles, Scale } from "lucide-react";

export interface NutritionMetrics {
  cognitiveLoad: number; // 脳疲労度 (0-100)
  statusQuoGravity: number; // 現状維持力 (0-100)
  anxietyLevel: number; // 不安感 (0-100)
  totalScore?: number; // 3xペナルティネットスコア
  penalizedCount?: number; // 3倍ペナルティ対象要素数
}

export interface EmotionalNutritionLabelProps {
  metrics: NutritionMetrics;
  overallScore?: number; // 0-100
}

/**
 * 2.5 感情の成分表示コンポーネント (EmotionalNutritionLabel)
 * 食品の栄養成分表示 (Nutrition Facts) 風の太枠・タイポグラフィUIで、
 * ユーザーの心理的摩擦と認知的負荷、3xペナルティ影響度を可視化する。
 */
export function EmotionalNutritionLabel({
  metrics,
  overallScore = 65,
}: EmotionalNutritionLabelProps) {
  const {
    cognitiveLoad = 48,
    statusQuoGravity = 72,
    anxietyLevel = 38,
    totalScore = -4,
    penalizedCount = 2,
  } = metrics;

  return (
    <div className="w-full max-w-sm bg-white text-slate-900 border-4 border-black p-5 rounded-2xl shadow-2xl font-mono select-none">
      {/* 1. タイトルヘッダー (Nutrition Facts タイポグラフィ) */}
      <div className="border-b-8 border-black pb-2">
        <h2 className="text-3xl font-black tracking-tighter uppercase font-sans leading-none">
          Emotional Facts
        </h2>
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 pt-1 font-sans">
          <span>Serving Size</span>
          <span>1 Startup Hypothesis</span>
        </div>
      </div>

      {/* 2. カロリー型スコアサマリー */}
      <div className="border-b-4 border-black py-2.5 flex items-baseline justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase text-slate-600 font-sans block">
            Survives Gravity
          </span>
          <div className="flex items-baseline space-x-1">
            <span className="text-4xl font-black font-sans tracking-tight">{overallScore}</span>
            <span className="text-xs text-slate-500 font-normal">/ 100</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase text-slate-600 font-sans block">
            3x Penalty Impact
          </span>
          <span className="text-xl font-black text-rose-600 font-sans tracking-tight">
            {penalizedCount} Elements
          </span>
        </div>
      </div>

      {/* 3. % Daily Value ヘッダー */}
      <div className="text-right text-[10px] font-extrabold py-1 border-b-2 border-black text-slate-800 font-sans">
        % Psychological Daily Value *
      </div>

      {/* 指標 1: 脳疲労度 (Cognitive Load) */}
      <div className="py-2.5 border-b border-slate-300 space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold font-sans">
          <div className="flex items-center space-x-1.5">
            <Brain className="w-3.5 h-3.5 text-purple-600" />
            <span className="font-extrabold">Cognitive Load (脳疲労度)</span>
          </div>
          <span className="font-mono font-black text-purple-700">{cognitiveLoad}%</span>
        </div>
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-300">
          <div
            className="bg-purple-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(5, cognitiveLoad))}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-600 font-sans leading-tight">
          初期設定やUI学習コストによる、乗り換え時の脱落抵抗
        </p>
      </div>

      {/* 指標 2: 現状維持力 (Status Quo Gravity) */}
      <div className="py-2.5 border-b border-slate-300 space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold font-sans">
          <div className="flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-extrabold">Status Quo Gravity (現状維持力)</span>
          </div>
          <span className="font-mono font-black text-blue-700">{statusQuoGravity}%</span>
        </div>
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-300">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(5, statusQuoGravity))}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-600 font-sans leading-tight">
          既存ツールへの慣れと蓄積データによるスイッチング障壁
        </p>
      </div>

      {/* 指標 3: 価格・リスク不安 (Price & Risk Anxiety) */}
      <div className="py-2.5 border-b-4 border-black space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold font-sans">
          <div className="flex items-center space-x-1.5">
            <Flame className="w-3.5 h-3.5 text-rose-600" />
            <span className="font-extrabold">Risk & Price Anxiety (不安感)</span>
          </div>
          <span className="font-mono font-black text-rose-700">{anxietyLevel}%</span>
        </div>
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-300">
          <div
            className="bg-rose-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(5, anxietyLevel))}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-600 font-sans leading-tight">
          セキュリティ審査や継続課金に対する意思決定の心理的障壁
        </p>
      </div>

      {/* 4. フッター注意書き (FDA スタイル注記) */}
      <div className="pt-2 text-[9px] text-slate-600 leading-tight space-y-1 font-sans">
        <p>
          * % Psychological Daily Value represents the human resistance coefficient when migrating from incumbents in 2026.
        </p>
        <div className="flex items-center space-x-1.5 text-slate-900 font-bold pt-1 font-mono">
          <Scale className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Net Loss-Aversion Penalty: {totalScore} pts</span>
        </div>
      </div>
    </div>
  );
}
