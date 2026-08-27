"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  IdeaInput,
  TargetLiteracyEnum,
  MonetizationModelEnum,
  PhysicalElement,
  PhysicalElementEnum,
} from "../schemas/zod";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sliders,
  ChevronDown,
  ChevronUp,
  Ghost,
  ShieldCheck,
  Send,
  Loader2,
} from "lucide-react";

export interface IdeaWizardProps {
  initialValues?: Partial<IdeaInput>;
  onSubmit: (data: IdeaInput & { detectedElements?: PhysicalElement[] }) => void;
  isSubmitting?: boolean;
}

const STEPS = [
  { id: 1, title: "Q1: Target & Pain", short: "Target & Pain" },
  { id: 2, title: "Q2: Solution", short: "Solution" },
  { id: 3, title: "Q3: Core Edge", short: "Core Edge" },
  { id: 4, title: "Q4: Business & Model", short: "Business Model" },
];

const PHYSICAL_ELEMENT_LABELS: Record<PhysicalElement, string> = {
  integration_cost: "導入コスト削減 (0-Config / Fast Setup)",
  switching_barrier: "スイッチング障壁打破 (Data Import)",
  learning_curve: "学習コスト極小化 (Intuitive UX)",
  security_compliance: "セキュリティ・コンプライアンス (SOC2)",
  customizability: "高いカスタマイズ性 (Modular / Plugin)",
  realtime_performance: "リアルタイム超高速性 (Low Latency)",
  price_sensitivity: "価格破壊 (10x Cost Efficiency)",
  ui_simplicity: "極限のシンプルさ (Minimal Friction)",
  network_effect: "ネットワーク効果・バイラル性 (Multiplayer)",
};

/**
 * アイディア引き出しウィザードコンポーネント (IdeaWizard)
 * Q1〜Q4のマルチステップフォーム、Stickyヘッダー、対話型フキダシ、Smart Defaults UI を提供。
 */
export function IdeaWizard({
  initialValues,
  onSubmit,
  isSubmitting = false,
}: IdeaWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isClassifyingQ3, setIsClassifyingQ3] = useState(false);
  const [detectedElements, setDetectedElements] = useState<PhysicalElement[]>([]);
  const [q3Reasoning, setQ3Reasoning] = useState<string>("");
  const [isSmartDefaultsOpen, setIsSmartDefaultsOpen] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
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

  // Q3の自動分類呼び出し
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
        // 補足ペインにも反映
        setValue(
          "q4_supplementary_pains",
          data.detected_elements.map((e: string) => `Target Physical Edge: ${e}`)
        );
      }
    } catch (err) {
      console.warn("Failed to classify Q3:", err);
    } finally {
      setIsClassifyingQ3(false);
    }
  };

  const handleNextStep = async () => {
    if (currentStep === 3) {
      await triggerQ3Classification();
    }
    setCurrentStep((prev) => Math.min(STEPS.length, prev + 1));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const onFormSubmit = (data: IdeaInput) => {
    onSubmit({
      ...data,
      detectedElements,
    });
  };

  // 文字数判定とバリデーション
  const isQ1Valid = q1Value.trim().length >= 30;
  const isQ2Valid = q2Value.trim().length >= 30;
  const isQ3Valid = q3Value.trim().length >= 20;

  const canProceed =
    (currentStep === 1 && isQ1Valid) ||
    (currentStep === 2 && isQ2Valid) ||
    (currentStep === 3 && isQ3Valid) ||
    currentStep === 4;

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
            className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition shrink-0"
          >
            編集
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ステップ進行インジケーター */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
        <div className="grid grid-cols-4 gap-2">
          {STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                if (s.id < currentStep || canProceed) {
                  setCurrentStep(s.id);
                }
              }}
              className={`p-2.5 rounded-xl text-left transition flex flex-col justify-between ${
                currentStep === s.id
                  ? "bg-indigo-600/20 border border-indigo-500 text-indigo-200"
                  : currentStep > s.id
                  ? "bg-slate-950/60 border border-emerald-500/30 text-emerald-300"
                  : "bg-slate-950/30 border border-slate-800/60 text-slate-500"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                <span>STEP 0{s.id}</span>
                {currentStep > s.id && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
              </div>
              <span className="text-xs font-semibold truncate">{s.short}</span>
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
        {/* STEP 1: Q1 Target & Pain */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                Step 1 / 4
              </span>
              <h2 className="text-xl font-bold text-slate-100">
                Q1: ターゲットと解決したい深い痛み (Target & Pain)
              </h2>
              <p className="text-xs text-slate-400">
                「誰が、どのような状況で、何に最も苦しんでいるか」を具体的に記入してください。（30〜1000文字）
              </p>
            </div>

            <div className="space-y-2">
              <textarea
                {...register("q1_target_pain")}
                rows={5}
                placeholder="例: 中小企業のリモート営業チームにおいて、各担当者がCRM（HubSpot等）の入力とワークフロー設定に1日2時間以上浪費しており、導入後3ヶ月で入力の形骸化とリード情報の欠落が多発している..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition leading-relaxed"
              />
              <div className="flex justify-between text-[11px] font-mono">
                <span className={q1Value.length < 30 ? "text-amber-400" : "text-emerald-400"}>
                  {q1Value.length} / 1000 文字 (最低30文字)
                </span>
              </div>
            </div>

            {/* 対話型フキダシ (文字数不足時のアシスト) */}
            {q1Value.length < 30 && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start space-x-3 text-amber-300 text-xs animate-in slide-in-from-bottom-2 duration-300">
                <Ghost className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">👻 ターゲットが「幽霊」になっていませんか？</span>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    「みんなが困っている」ではなく、「具体的にどの役職・組織・シチュエーションの誰か」と、彼らが直面している現実的な摩擦を30文字以上で記述してください。
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Q2 Solution */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                Step 2 / 4
              </span>
              <h2 className="text-xl font-bold text-slate-100">
                Q2: 提供するソリューション (Solution)
              </h2>
              <p className="text-xs text-slate-400">
                「どのようにしてその痛みを劇的に解消するのか」を具体的に記入してください。（30〜1000文字）
              </p>
            </div>

            <div className="space-y-2">
              <textarea
                {...register("q2_solution")}
                rows={5}
                placeholder="例: ZoomやGoogle Meetの商談音声をリアルタイム解析し、議事録要約・ネクストアクション・CRM項目を0クリックで全自動入力・同期するAIバックオフィスハブ..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition leading-relaxed"
              />
              <div className="flex justify-between text-[11px] font-mono">
                <span className={q2Value.length < 30 ? "text-amber-400" : "text-emerald-400"}>
                  {q2Value.length} / 1000 文字 (最低30文字)
                </span>
              </div>
            </div>

            {/* 対話型フキダシ */}
            {q2Value.length < 30 && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start space-x-3 text-amber-300 text-xs animate-in slide-in-from-bottom-2 duration-300">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">⚡ ソリューションの解像度を上げましょう</span>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    単に「AIで自動化する」だけでなく、どのような入力からどのような価値を生み出し、ユーザーの手間をどう削減するかを30文字以上で記述してください。
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Q3 Core Edge */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                Step 3 / 4
              </span>
              <h2 className="text-xl font-bold text-slate-100">
                Q3: 競合に対するコアな優位性・構造的堀 (Core Edge)
              </h2>
              <p className="text-xs text-slate-400">
                「既存の巨大競合が真似できない、または構造的に劣る理由（9つの物理要素）」を記入してください。（20〜1000文字）
              </p>
            </div>

            <div className="space-y-2">
              <textarea
                {...register("q3_core_edge")}
                rows={4}
                placeholder="例: 既存のSaaS APIと0-configで接続し、設定工数（integration_cost）をゼロにしつつ、ローカル実行により超低遅延（realtime_performance）を実現する。"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition leading-relaxed"
              />
              <div className="flex justify-between text-[11px] font-mono">
                <span className={q3Value.length < 20 ? "text-amber-400" : "text-emerald-400"}>
                  {q3Value.length} / 1000 文字 (最低20文字)
                </span>
              </div>
            </div>

            {q3Value.length < 20 && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start space-x-3 text-amber-300 text-xs animate-in slide-in-from-bottom-2 duration-300">
                <Sliders className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">🎯 構造的エッジを明確にしましょう</span>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    「機能が多い」はエッジになりません。導入コスト、学習コスト、リアルタイム性、価格感度など、どの物理要素で競合を上回るかを20文字以上で記入してください。
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Q4 Business & Smart Defaults */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                Step 4 / 4
              </span>
              <h2 className="text-xl font-bold text-slate-100">
                Q4: ビジネス属性 & AI Smart Defaults
              </h2>
              <p className="text-xs text-slate-400">
                ターゲットリテラシーと収益化モデルを選択し、AIが推定した物理要素を確認してください。
              </p>
            </div>

            {/* Smart Defaults UI (折りたたみ & 手動トグル) */}
            <div className="bg-slate-950 border border-indigo-500/30 rounded-2xl p-5 space-y-3">
              <div
                onClick={() => setIsSmartDefaultsOpen(!isSmartDefaultsOpen)}
                className="flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center space-x-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-xs text-indigo-200 uppercase tracking-wide">
                    AI Smart Defaults (特定された物理要素)
                  </h3>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <span>{detectedElements.length} elements detected</span>
                  {isSmartDefaultsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {isClassifyingQ3 && (
                <div className="flex items-center space-x-2 text-xs text-indigo-300 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gemini is analyzing Core Edge physical elements...</span>
                </div>
              )}

              {isSmartDefaultsOpen && (
                <div className="pt-2 space-y-3 border-t border-slate-800/80 text-xs">
                  {q3Reasoning && (
                    <p className="text-slate-400 text-[11px] italic bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                      💡 {q3Reasoning}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PhysicalElementEnum.options.map((elem) => {
                      const isSelected = detectedElements.includes(elem);
                      return (
                        <button
                          key={elem}
                          type="button"
                          onClick={() => {
                            setDetectedElements((prev) =>
                              prev.includes(elem)
                                ? prev.filter((e) => e !== elem)
                                : [...prev, elem]
                            );
                          }}
                          className={`p-2.5 rounded-xl text-left text-[11px] border transition flex items-center justify-between ${
                            isSelected
                              ? "bg-indigo-600/20 border-indigo-500 text-indigo-200 font-semibold"
                              : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          <span className="truncate">{PHYSICAL_ELEMENT_LABELS[elem]}</span>
                          <span className="font-mono text-[10px] ml-2">
                            {isSelected ? "ON" : "OFF"}
                          </span>
                        </button>
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

          {currentStep < 4 ? (
            <button
              type="button"
              disabled={!canProceed || isClassifyingQ3}
              onClick={handleNextStep}
              className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <span>{isClassifyingQ3 ? "AI解析中..." : "次へ"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-xl shadow-purple-600/30 transition cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>仮説クラッシュジョブ起動中...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Create Commit & Run Hypothesis Crash</span>
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
