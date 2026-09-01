"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import {
  IdeaInput,
  PhysicalElement,
  PhysicalElementEnum,
} from "../schemas/zod";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  ChevronDown,
  ChevronUp,
  Ghost,
  ShieldCheck,
  Send,
  Loader2,
  Target,
  Swords,
  Check,
  RotateCcw,
  Edit3,
} from "lucide-react";
import { PreviewSummary } from "../app/api/validate/preview-summary/route";

export interface IdeaWizardProps {
  initialValues?: Partial<IdeaInput>;
  isRestoredFromPastCommit?: boolean;
  onSubmit: (data: IdeaInput & { detectedElements?: PhysicalElement[]; previewSummary?: PreviewSummary | null }) => void;
  isSubmitting?: boolean;
}

const STEPS = [
  { id: 1, title: "Q1: Target & Pain", short: "Target & Pain" },
  { id: 2, title: "Q2: Solution", short: "Solution" },
  { id: 3, title: "Q3: Core Edge", short: "Core Edge" },
  { id: 4, title: "Q4: Business & Defaults", short: "Business & Defaults" },
  { id: 5, title: "Step 5: Pre-Flight Review", short: "事前承認 (Review)" },
];

const PHYSICAL_ELEMENT_LABELS: Record<PhysicalElement, { label: string; desc: string }> = {
  integration_cost: { label: "1. 導入・移行コスト (SETUP_COST)", desc: "0-Config / 初期設定や既存データ移行の手間" },
  switching_barrier: { label: "2. スイッチング障壁 (SWITCHING_BARRIER)", desc: "既存ツールからの乗り換え抵抗とデータロックイン" },
  learning_curve: { label: "3. UI学習コスト (LEARNING_CURVE)", desc: "直感的な操作感と教育コストの削減" },
  security_compliance: { label: "4. セキュリティ・信頼性 (SECURITY)", desc: "SOC2、暗号化、エンタープライズ水準の安全性" },
  customizability: { label: "5. カスタマイズ性 (CUSTOMIZABILITY)", desc: "モジュール拡張・柔軟なデータモデル" },
  realtime_performance: { label: "6. 処理速度・リアルタイム性 (SPEED)", desc: "ローカル実行・超低遅延レスポンス" },
  price_sensitivity: { label: "7. 料金・価格破壊 (PRICE)", desc: "10xの費用対効果・透明な課金体系" },
  ui_simplicity: { label: "8. 出力品質・情緒的満足度 (EMOTION)", desc: "触って気持ちいいUX・高品質なアウトプット" },
  network_effect: { label: "9. エコシステム・連携性 (ECOSYSTEM)", desc: "外部SaaS連携・バイラル性・チーム利用" },
};

/**
 * アイディア引き出しウィザードコンポーネント (IdeaWizard)
 * - 設計書 1.3: 文字数に応じたリアルタイム対話型フキダシ（15文字以下、25文字以下、30文字突破）
 * - 設計書 1.2: AI Smart Defaults の救済UX（トグル展開・手動復活）
 * - 設計書 1.4: プレビュー要約による事前承認UX（JTBD、競合領域、倒すべき宿敵の確認）
 */
export function IdeaWizard({
  initialValues,
  isRestoredFromPastCommit = false,
  onSubmit,
  isSubmitting = false,
}: IdeaWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isClassifyingQ3, setIsClassifyingQ3] = useState(false);
  const [detectedElements, setDetectedElements] = useState<PhysicalElement[]>([]);
  const [q3Reasoning, setQ3Reasoning] = useState<string>("");
  const [isSmartDefaultsOpen, setIsSmartDefaultsOpen] = useState(true);

  // 1.4 事前承認プレビュー状態
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewSummary, setPreviewSummary] = useState<PreviewSummary | null>(null);

  // 手動で復活させた補足ペイン記述
  const [overriddenPains, setOverriddenPains] = useState<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<IdeaInput>({
    defaultValues: {
      q1_target_pain: initialValues?.q1_target_pain || "",
      q2_solution: initialValues?.q2_solution || "",
      q3_core_edge: initialValues?.q3_core_edge || "",
      q4_target_literacy: initialValues?.q4_target_literacy || "intermediate",
      q4_monetization_model: initialValues?.q4_monetization_model || "subscription",
      q4_supplementary_pains: initialValues?.q4_supplementary_pains || [],
    },
  });

  const q1Value = watch("q1_target_pain") || "";
  const q2Value = watch("q2_solution") || "";
  const q3Value = watch("q3_core_edge") || "";
  const literacyValue = watch("q4_target_literacy") || "intermediate";

  // Q3の自動分類呼び出し (設計書 1.2)
  const triggerQ3Classification = async () => {
    if (!q3Value || q3Value.length < 10) return;
    try {
      setIsClassifyingQ3(true);
      const res = await fetch("/api/validate/classify-q3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q3_core_edge: q3Value }),
      });
      const data = await res.json();
      if (data.success && data.detected_elements) {
        setDetectedElements(data.detected_elements);
        setQ3Reasoning(data.reasoning || "");
      }
    } catch (err) {
      console.warn("Failed to classify Q3:", err);
    } finally {
      setIsClassifyingQ3(false);
    }
  };

  // 1.4 事前承認プレビューの生成
  const triggerPreviewSummary = async () => {
    try {
      setIsLoadingPreview(true);
      const res = await fetch("/api/validate/preview-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q1_target_pain: q1Value,
          q2_solution: q2Value,
          q3_core_edge: q3Value,
          domain: "B2B_SME",
        }),
      });
      const data = await res.json();
      if (data.success && data.summary) {
        setPreviewSummary(data.summary);
      }
    } catch (err) {
      console.warn("Failed to fetch preview summary:", err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleNextStep = async () => {
    if (currentStep === 3) {
      await triggerQ3Classification();
    } else if (currentStep === 4) {
      await triggerPreviewSummary();
    }
    setCurrentStep((prev) => Math.min(STEPS.length, prev + 1));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const onFormSubmit = (data: IdeaInput) => {
    const combinedSupplementary = [
      ...detectedElements.map((e) => `AI_DETECTED: ${e}`),
      ...Object.entries(overriddenPains).map(([key, val]) => `MANUAL_OVERRIDE_${key}: ${val}`),
    ];

    onSubmit({
      ...data,
      q4_supplementary_pains: combinedSupplementary,
      detectedElements,
      previewSummary,
    });
  };

  // 文字数判定
  const isQ1Valid = q1Value.trim().length >= 30;
  const isQ2Valid = q2Value.trim().length >= 30;
  const isQ3Valid = q3Value.trim().length >= 20;

  const canProceed =
    (currentStep === 1 && isQ1Valid) ||
    (currentStep === 2 && isQ2Valid) ||
    (currentStep === 3 && isQ3Valid) ||
    currentStep === 4 ||
    currentStep === 5;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 font-sans">
      {/* ========================================================================= */}
      {/* 1. STICKY ヘッダー (Q1 Target & Pain 常時表示) */}
      {/* ========================================================================= */}
      {currentStep > 1 && q1Value.trim().length > 0 && (
        <div className="sticky top-20 z-40 bg-slate-900/90 backdrop-blur-md border border-indigo-500/30 rounded-2xl p-4 shadow-xl text-xs flex items-start justify-between space-x-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start space-x-3 overflow-hidden">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400 shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block">
                Anchored Target Pain (Q1)
              </span>
              <p className="text-slate-200 line-clamp-1 italic font-medium">"{q1Value}"</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition shrink-0 cursor-pointer flex items-center space-x-1"
          >
            <Edit3 className="w-3 h-3" />
            <span>編集</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ステップ進行インジケーター */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
        <div className="grid grid-cols-5 gap-2">
          {STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                if (s.id < currentStep || canProceed) {
                  setCurrentStep(s.id);
                }
              }}
              className={`p-2 rounded-xl text-left transition flex flex-col justify-between ${
                currentStep === s.id
                  ? "bg-indigo-600/20 border border-indigo-500 text-indigo-200"
                  : currentStep > s.id
                  ? "bg-slate-950/60 border border-emerald-500/30 text-emerald-300"
                  : "bg-slate-950/30 border border-slate-800/60 text-slate-500"
              }`}
            >
              <div className="flex items-center justify-between text-[9px] font-mono mb-0.5">
                <span>STEP 0{s.id}</span>
                {currentStep > s.id && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
              </div>
              <span className="text-[11px] font-semibold truncate">{s.short}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. フォーム本体 */}
      {/* ========================================================================= */}
      <form
        onSubmit={handleSubmit(onFormSubmit)}
        className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6"
      >
        {/* ========================================================================= */}
        {/* STEP 1: Q1 Target & Pain */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                Step 1 / 5: ターゲットと課題
              </span>
              <h2 className="text-xl font-bold text-slate-100">
                Q1: ターゲットと解決したい深い痛み (Target & Pain)
              </h2>
              <p className="text-xs text-slate-400">
                「誰が、どのような作業プロセスにおいて、何に最も苦しんでいるか」を具体的に記入してください。（最低30文字）
              </p>
            </div>

            <div className="space-y-2">
              {isRestoredFromPastCommit && (
                <div className="flex items-center space-x-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[11px] font-mono w-fit animate-in fade-in">
                  <span>🍃 過去の回答から復元されました</span>
                </div>
              )}
              <textarea
                {...register("q1_target_pain")}
                rows={5}
                placeholder="例: 中小企業のリモート営業チームにおいて、各担当者がCRM（HubSpot等）の入力とワークフロー設定に1日2時間以上浪費しており、導入後3ヶ月で入力の形骸化とリード情報の欠落が多発している..."
                className={`w-full border rounded-2xl p-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition leading-relaxed ${
                  isRestoredFromPastCommit
                    ? "bg-amber-950/20 border-amber-500/40 focus:border-amber-400"
                    : "bg-slate-950 border-slate-800 focus:border-indigo-500"
                }`}
              />
              <div className="flex justify-between text-[11px] font-mono">
                <span className={q1Value.length < 30 ? "text-amber-400" : "text-emerald-400"}>
                  {q1Value.length} / 1000 文字 (最低30文字)
                </span>
              </div>
            </div>

            {/* 1.3 対話型フキダシ (文字数に応じたリアルタイムツッコミ) */}
            {q1Value.length === 0 ? (
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl text-slate-400 text-xs flex items-center space-x-2.5">
                <Ghost className="w-4 h-4 text-slate-500" />
                <span>AI共同創業者: 具体的なターゲットと現場の摩擦を教えてください。</span>
              </div>
            ) : q1Value.length <= 15 ? (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start space-x-3 text-rose-300 text-xs animate-in slide-in-from-bottom-2 duration-300">
                <Ghost className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">👻 「ターゲットが幽霊になっています。『誰の』作業プロセスですか？」</span>
                  <p className="text-[11px] text-rose-200/80">
                    「みんな」ではなく、「〇〇職の誰が」直面しているペインかを指定してください。
                  </p>
                </div>
              </div>
            ) : q1Value.length <= 25 ? (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start space-x-3 text-amber-300 text-xs animate-in slide-in-from-bottom-2 duration-300">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">⚠️ 「その不満は、本当に血が流れるほど痛い不満（Hard Pain）ですか？」</span>
                  <p className="text-[11px] text-amber-200/80">
                    「あったら便利（Nice-to-have）」ではなく、作業が止まるレベルの痛みをあと5文字追加してください。
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start space-x-3 text-emerald-300 text-xs animate-in slide-in-from-bottom-2 duration-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">🎉 「Good。解像度が上がってきました。そのままソリューションの記述に進みましょう！」</span>
                  <p className="text-[11px] text-emerald-200/80">
                    条件達成（{q1Value.length}文字）。「次へ」を押してソリューションを定義してください。
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: Q2 Solution */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                Step 2 / 5: 解決策
              </span>
              <h2 className="text-xl font-bold text-slate-100">
                Q2: 提供するソリューション (Solution)
              </h2>
              <p className="text-xs text-slate-400">
                「どのようにしてその痛みを劇的に解消するのか」を具体的に記入してください。（最低30文字）
              </p>
            </div>

            <div className="space-y-2">
              {isRestoredFromPastCommit && (
                <div className="flex items-center space-x-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[11px] font-mono w-fit animate-in fade-in">
                  <span>🍃 過去の回答から復元されました</span>
                </div>
              )}
              <textarea
                {...register("q2_solution")}
                rows={5}
                placeholder="例: ZoomやGoogle Meetの商談音声をリアルタイム解析し、議事録要約・ネクストアクション・CRM項目を0クリックで全自動入力・同期するAIバックオフィスハブ..."
                className={`w-full border rounded-2xl p-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition leading-relaxed ${
                  isRestoredFromPastCommit
                    ? "bg-amber-950/20 border-amber-500/40 focus:border-amber-400"
                    : "bg-slate-950 border-slate-800 focus:border-indigo-500"
                }`}
              />
              <div className="flex justify-between text-[11px] font-mono">
                <span className={q2Value.length < 30 ? "text-amber-400" : "text-emerald-400"}>
                  {q2Value.length} / 1000 文字 (最低30文字)
                </span>
              </div>
            </div>

            {/* 1.3 対話型フキダシ (Q2 リアルタイムツッコミ) */}
            {q2Value.length === 0 ? (
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl text-slate-400 text-xs flex items-center space-x-2.5">
                <Sliders className="w-4 h-4 text-slate-500" />
                <span>AI共同創業者: 解決アプローチと仕組みを記述してください。</span>
              </div>
            ) : q2Value.length <= 15 ? (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start space-x-3 text-rose-300 text-xs animate-in slide-in-from-bottom-2 duration-300">
                <Ghost className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">👻 「解決策が抽象的すぎます。具体的にどのような仕組みで動きますか？」</span>
                  <p className="text-[11px] text-rose-200/80">
                    ユーザーが実際に何を操作し、システムが何を自動化するのかを明記してください。
                  </p>
                </div>
              </div>
            ) : q2Value.length <= 25 ? (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start space-x-3 text-amber-300 text-xs animate-in slide-in-from-bottom-2 duration-300">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">⚡ 「単なる『AIで便利にする』ではなく、ユーザーの操作ステップをどう減らすかを記述してください。」</span>
                  <p className="text-[11px] text-amber-200/80">
                    具体的な機能連携や自動化のポイントをあと数文字追加してください。
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start space-x-3 text-emerald-300 text-xs animate-in slide-in-from-bottom-2 duration-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">✨ 「Excellent。具体的な解決像が見えてきました。Core Edgeに進みましょう！」</span>
                  <p className="text-[11px] text-emerald-200/80">
                    条件達成（{q2Value.length}文字）。「次へ」を押して競合に対するエッジを定義してください。
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: Q3 Core Edge */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                Step 3 / 5: 構造的エッジ
              </span>
              <h2 className="text-xl font-bold text-slate-100">
                Q3: 競合に対するコアな優位性・構造的堀 (Core Edge)
              </h2>
              <p className="text-xs text-slate-400">
                「既存の巨大競合が真似できない、または構造的に劣る理由（9つの物理要素）」を記入してください。（最低20文字）
              </p>
            </div>

            <div className="space-y-2">
              {isRestoredFromPastCommit && (
                <div className="flex items-center space-x-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[11px] font-mono w-fit animate-in fade-in">
                  <span>🍃 過去の回答から復元されました</span>
                </div>
              )}
              <textarea
                {...register("q3_core_edge")}
                rows={4}
                placeholder="例: 既存のSaaS APIと0-configで接続し、設定工数（SETUP_COST）をゼロにしつつ、ローカル実行により超低遅延（SPEED）を実現する。"
                className={`w-full border rounded-2xl p-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition leading-relaxed ${
                  isRestoredFromPastCommit
                    ? "bg-amber-950/20 border-amber-500/40 focus:border-amber-400"
                    : "bg-slate-950 border-slate-800 focus:border-indigo-500"
                }`}
              />
              <div className="flex justify-between text-[11px] font-mono">
                <span className={q3Value.length < 20 ? "text-amber-400" : "text-emerald-400"}>
                  {q3Value.length} / 1000 文字 (最低20文字)
                </span>
              </div>
            </div>

            {q3Value.length < 20 ? (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start space-x-3 text-amber-300 text-xs animate-in slide-in-from-bottom-2 duration-300">
                <Sliders className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">🎯 「他社との差別化がまだ見えません。どの物理要素で勝ちますか？」</span>
                  <p className="text-[11px] text-amber-200/80">
                    導入コスト、学習コスト、リアルタイム性、価格感度など、どの物理要素で競合を上回るかを20文字以上で記入してください。
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-start space-x-3 text-indigo-300 text-xs animate-in slide-in-from-bottom-2 duration-300">
                <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">🚀 「OK。構造的エッジが定義されました。Q4でSmart Defaultsを生成します。」</span>
                  <p className="text-[11px] text-indigo-200/80">
                    「次へ」を押すと、Gemini が9つの物理要素から既に言及された項目を自動判定します。
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: Q4 Business & Smart Defaults 救済UX */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                Step 4 / 5: ビジネス属性 & Smart Defaults
              </span>
              <h2 className="text-xl font-bold text-slate-100">
                Q4: ビジネス属性 & Smart Defaults 救済設定
              </h2>
              <p className="text-xs text-slate-400">
                ターゲットリテラシーと収益化モデルを選択し、AIが自動反映した要素を確認・上書きしてください。
              </p>
            </div>

            {/* 1.2 Smart Defaults の救済UX (アコーディオン & 手動復活) */}
            <div className="bg-slate-950 border border-indigo-500/40 rounded-2xl p-5 space-y-4">
              <div
                onClick={() => setIsSmartDefaultsOpen(!isSmartDefaultsOpen)}
                className="flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center space-x-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-xs text-indigo-200 uppercase tracking-wide">
                    🤖 AIによる自動反映項目（クリックして上書き・救済）
                  </h3>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <span className="font-mono text-[11px] text-indigo-300">
                    {detectedElements.length} / 9 Elements Detected
                  </span>
                  {isSmartDefaultsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {isClassifyingQ3 && (
                <div className="flex items-center space-x-2 text-xs text-indigo-300 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gemini is classifying Core Edge physical elements...</span>
                </div>
              )}

              {isSmartDefaultsOpen && (
                <div className="pt-2 space-y-3 border-t border-slate-800/80 text-xs">
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    AIが「Q3で既に語られている」と判定した要素はQ4入力から自動スキップされます。AIの判定が誤っている場合は、該当タグをクリックして手動補足フォームを復活させてください。
                  </p>

                  {q3Reasoning && (
                    <div className="p-2.5 bg-slate-900/90 rounded-xl border border-indigo-500/20 text-[11px] text-slate-300">
                      💡 <strong>AI判定根拠:</strong> {q3Reasoning}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {PhysicalElementEnum.options.map((elem) => {
                      const isDetected = detectedElements.includes(elem);
                      const isOverridden = elem in overriddenPains;

                      return (
                        <div
                          key={elem}
                          className={`p-3 rounded-xl border transition ${
                            isDetected
                              ? "bg-indigo-950/40 border-indigo-500 text-indigo-200"
                              : "bg-slate-900/40 border-slate-800/80 text-slate-400"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-[11px] truncate">
                              {PHYSICAL_ELEMENT_LABELS[elem].label}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (isDetected) {
                                  // AI判定を外して手動補足を復活
                                  setDetectedElements((prev) => prev.filter((e) => e !== elem));
                                  setOverriddenPains((prev) => ({
                                    ...prev,
                                    [elem]: "",
                                  }));
                                } else {
                                  // AI判定としてチェック
                                  setDetectedElements((prev) => [...prev, elem]);
                                  setOverriddenPains((prev) => {
                                    const next = { ...prev };
                                    delete next[elem];
                                    return next;
                                  });
                                }
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                                isDetected
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                              }`}
                            >
                              {isDetected ? "✨ AI自動反映済" : "手動で補足"}
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400">{PHYSICAL_ELEMENT_LABELS[elem].desc}</p>

                          {/* 手動復活された場合の補足入力欄 */}
                          {!isDetected && (
                            <div className="mt-2 pt-2 border-t border-slate-800">
                              <input
                                type="text"
                                value={overriddenPains[elem] || ""}
                                onChange={(e) =>
                                  setOverriddenPains((prev) => ({
                                    ...prev,
                                    [elem]: e.target.value,
                                  }))
                                }
                                placeholder="この要素に関する独自の対応方針を記入..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ドメイン & リテラシー */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <label className="font-semibold text-slate-300 block">ターゲットのリテラシー</label>
                <select
                  {...register("q4_target_literacy")}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="non_tech">Non-Tech (非エンジニア・一般ユーザー)</option>
                  <option value="beginner">Beginner (初心者ビジネス層)</option>
                  <option value="intermediate">Intermediate (一般ビジネス層・SME)</option>
                  <option value="tech_savvy">Tech-Savvy (ITリテラシー高め)</option>
                  <option value="developer">Developer (開発者・テクニカル)</option>
                  <option value="expert">Expert (業界エキスパート)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-slate-300 block">マネタイズモデル</label>
                <select
                  {...register("q4_monetization_model")}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="subscription">Subscription (月額/年額SaaS)</option>
                  <option value="freemium">Freemium (無料枠 + 有料プラン)</option>
                  <option value="usage_based">Usage-based (従量課金 / Token課金)</option>
                  <option value="one_time">One-time (買い切りライセンス)</option>
                  <option value="marketplace_take_rate">Marketplace Take-rate (手数料)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: 事前承認UX (設計書 1.4: Pre-Flight Confirmation) */}
        {/* ========================================================================= */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-300 text-xs font-semibold mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Pre-Flight Confirmation (事前承認フェーズ)</span>
              </div>
              <h2 className="text-xl font-bold text-slate-100">
                システムが認識した「あなたのアイデアの骨子」
              </h2>
              <p className="text-xs text-slate-400">
                高額な検証APIを的外れなキーワードで回さないよう、システムが解析した以下の3点をご確認ください。
              </p>
            </div>

            {isLoadingPreview ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                <p className="text-xs font-mono text-slate-400">
                  Gemini is synthesizing JTBD, target domain, and primary nemesis...
                </p>
              </div>
            ) : previewSummary ? (
              <div className="space-y-4">
                {/* 1. 解決する課題 (JTBD) */}
                <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1.5">
                  <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold font-mono">
                    <Target className="w-4 h-4" />
                    <span>1. 解決する課題 (Core JTBD)</span>
                  </div>
                  <p className="text-sm font-bold text-slate-100 leading-relaxed">
                    "{previewSummary.coreJtbd}"
                  </p>
                </div>

                {/* 2. 競合とみなす領域 */}
                <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center space-x-2 text-purple-400 text-xs font-bold font-mono">
                    <Sliders className="w-4 h-4" />
                    <span>2. 競合とみなす領域 (Target Domain Keywords)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {previewSummary.targetDomainKeywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-xs rounded-lg font-semibold"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 3. 倒すべき最大の宿敵 */}
                <div className="p-5 bg-slate-950/80 border border-rose-500/30 rounded-2xl space-y-1.5">
                  <div className="flex items-center space-x-2 text-rose-400 text-xs font-bold font-mono">
                    <Swords className="w-4 h-4" />
                    <span>3. 倒すべき最大の宿敵 (Primary Incumbent Nemesis)</span>
                  </div>
                  <div className="text-sm font-bold text-rose-200">
                    {previewSummary.primaryNemesis}
                  </div>
                  <p className="text-xs text-slate-400 italic">
                    {previewSummary.nemesisReason}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ナビゲーションフッター */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={handlePrevStep}
            className="flex items-center space-x-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>前へ</span>
          </button>

          {currentStep < 5 ? (
            <button
              type="button"
              disabled={!canProceed || isClassifyingQ3}
              onClick={handleNextStep}
              className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <span>{isClassifyingQ3 ? "AI解析中..." : currentStep === 4 ? "骨子の確認 (事前承認) へ" : "次へ"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition cursor-pointer flex items-center space-x-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>いいえ、修正する</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isLoadingPreview}
                className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-xl shadow-purple-600/30 transition cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>仮説クラッシュ検証をキック中...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>🚀 はい、これで検証を開始する (Approve & Run Crash)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
