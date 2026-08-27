"use client";

import React from "react";
import { AlertCircle, Flame, Shield, Brain, HeartPulse } from "lucide-react";

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
 * 感情の成分表示コンポーネント (EmotionalNutritionLabel)
 * 食品の栄養成分表示 (Nutrition Facts) 風のUIで、ユーザーの心理的摩擦と認知的負荷を表示する。
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
      {/* タイトルヘッダー */}
      <div className="border-b-8 border-black pb-2">
        <h2 className="text-2xl font-black tracking-tighter uppercase font-sans">
          Emotional Facts
        </h2>
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
          <span>Serving Size</span>
          <span>1 Startup Hypothesis</span>
        </div>
      </div>

      {/* スコアサマリー */}
      <div className="border-b-4 border-black py-2.5 flex items-baseline justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Survives Friction</span>
          <span className="text-3xl font-black font-sans">{overallScore}</span>
          <span className="text-xs text-slate-600 font-normal"> / 100 pts</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">3x Penalty Count</span>
          <span className="text-xl font-bold text-rose-600 font-sans">{penalizedCount} Elements</span>
        </div>
      </div>

      {/* % Daily Value ヘッダー */}
      <div className="text-right text-[10px] font-bold py-1 border-b border-black text-slate-600">
        % Psychological Load *
      </div>

      {/* 指標 1: 脳疲労度 (Cognitive Load) */}
      <div className="py-2.5 border-b border-slate-300 space-y-1">
        <div className="flex items-center justify-between text-xs font-bold">
          <div className="flex items-center space-x-1.5 font-sans">
            <Brain className="w-3.5 h-3.5 text-purple-600" />
            <span>Cognitive Load (脳疲労度)</span>
          </div>
          <span className="text-purple-700">{cognitiveLoad}%</span>
        </div>
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div
            className="bg-purple-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${cognitiveLoad}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-500 font-sans">
          初期設定・学習コストによるユーザーの脱落負荷
        </p>
      </div>

      {/* 指標 2: 現状維持力 (Status Quo Gravity) */}
      <div className="py-2.5 border-b border-slate-300 space-y-1">
        <div className="flex items-center justify-between text-xs font-bold">
          <div className="flex items-center space-x-1.5 font-sans">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Status Quo Gravity (現状維持力)</span>
          </div>
          <span className="text-blue-700">{statusQuoGravity}%</span>
        </div>
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${statusQuoGravity}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-500 font-sans">
          既存ツールからの乗り換え（スイッチング）障壁の強さ
        </p>
      </div>

      {/* 指標 3: 不安感 (Anxiety Level) */}
      <div className="py-2.5 border-b-4 border-black space-y-1">
        <div className="flex items-center justify-between text-xs font-bold">
          <div className="flex items-center space-x-1.5 font-sans">
            <Flame className="w-3.5 h-3.5 text-rose-600" />
            <span>Pricing Anxiety (価格・リスク不安)</span>
          </div>
          <span className="text-rose-700">{anxietyLevel}%</span>
        </div>
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div
            className="bg-rose-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${anxietyLevel}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-500 font-sans">
          セキュリティ審査や継続課金に対する意思決定の抵抗感
        </p>
      </div>

      {/* フッター注意書き */}
      <div className="pt-2 text-[9px] text-slate-500 leading-tight space-y-1 font-sans">
        <p>
          * Percent Psychological Load reflects simulated human resistance when evaluating new B2B/B2C software in 2026.
        </p>
        <div className="flex items-center space-x-1 text-slate-700 font-semibold pt-1">
          <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
          <span>Net 3x Penalty Impact: {totalScore} pts</span>
        </div>
      </div>
    </div>
  );
}
