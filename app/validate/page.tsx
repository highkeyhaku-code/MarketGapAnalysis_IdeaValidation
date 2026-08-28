"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  GitBranch,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Layers,
  Flame,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lightbulb,
  ArrowRight,
  Check,
} from "lucide-react";
import { IdeaWizard } from "../../components/IdeaWizard";
import { JobPollingTracker } from "../../components/JobPollingTracker";
import { IdeaInput, PhysicalElement } from "../../schemas/zod";
import { PivotSuggestionResponse } from "../api/ideas/pivot-suggestion/route";

function ValidateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pivotFrom = searchParams.get("pivotFrom");
  const targetCraterParam = searchParams.get("targetCrater") || "未充足の深い摩擦領域";
  const targetPainQuery = searchParams.get("targetPain");
  const solutionQuery = searchParams.get("solution");
  const coreEdgeQuery = searchParams.get("coreEdge");
  const targetLiteracyQuery = searchParams.get("targetLiteracy");

  const [loadingInitial, setLoadingInitial] = useState(Boolean(pivotFrom));
  const [initialValues, setInitialValues] = useState<Partial<IdeaInput> | undefined>(undefined);
  const [pivotCommitMeta, setPivotCommitMeta] = useState<any>(null);
  const [pivotSuggestion, setPivotSuggestion] = useState<PivotSuggestionResponse | null>(null);
  const [isApplyingDiff, setIsApplyingDiff] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [createdCommitId, setCreatedCommitId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // What-If カードからのクエリ復元
  useEffect(() => {
    if (pivotFrom) return;
    if (targetPainQuery || solutionQuery || coreEdgeQuery) {
      setInitialValues({
        q1_target_pain: targetPainQuery || "",
        q2_solution: solutionQuery || "",
        q3_core_edge: coreEdgeQuery || "",
        q4_target_literacy: (targetLiteracyQuery as any) || "beginner",
        q4_monetization_model: "subscription",
        q4_supplementary_pains: [],
      });
    }
  }, [pivotFrom, targetPainQuery, solutionQuery, coreEdgeQuery, targetLiteracyQuery]);

  // Time-Travel: 過去のコミットから状態を復元 & ピボット提案を生成 (設計書 3.3)
  useEffect(() => {
    if (!pivotFrom) return;

    const fetchPivotSourceAndSuggestion = async () => {
      try {
        setLoadingInitial(true);
        const res = await fetch(`/api/ideas/commit/${pivotFrom}`);
        const json = await res.json();
        if (json.success && json.commit) {
          const c = json.commit;
          setPivotCommitMeta(c);
          const restoredValues: Partial<IdeaInput> = {
            q1_target_pain: c.q1_target_pain || "",
            q2_solution: c.q2_solution || "",
            q3_core_edge: c.q3_core_edge || "",
            q4_target_literacy: c.q4_target_literacy || "intermediate",
            q4_monetization_model: c.q4_monetization_model || "subscription",
            q4_supplementary_pains: c.q4_supplementary_pains || [],
          };
          setInitialValues(restoredValues);

          // 3.3 LLM自動生成のピボット提案 (Diffハイライト) を取得
          try {
            const sugRes = await fetch("/api/ideas/pivot-suggestion", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                parentCommit: c,
                targetCrater: targetCraterParam,
              }),
            });
            const sugJson = await sugRes.json();
            if (sugJson.success) {
              setPivotSuggestion(sugJson);
            }
          } catch (sugErr) {
            console.warn("Failed to fetch pivot suggestion:", sugErr);
          }
        }
      } catch (err) {
        console.error("Failed to restore pivot commit:", err);
      } finally {
        setLoadingInitial(false);
      }
    };

    fetchPivotSourceAndSuggestion();
  }, [pivotFrom, targetCraterParam]);

  // ピボット案の適用ハンドラ
  const handleApplyPivotDiff = () => {
    if (!pivotSuggestion) return;
    setIsApplyingDiff(true);
    setInitialValues((prev) => ({
      ...prev,
      q1_target_pain: pivotSuggestion.suggestedQ1,
      q3_core_edge: pivotSuggestion.suggestedQ3,
    }));
    setTimeout(() => setIsApplyingDiff(false), 500);
  };

  // ウィザード送信ハンドラ
  const handleWizardSubmit = async (
    data: IdeaInput & { detectedElements?: PhysicalElement[] }
  ) => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/ideas/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaInput: {
            q1_target_pain: data.q1_target_pain,
            q2_solution: data.q2_solution,
            q3_core_edge: data.q3_core_edge,
            q4_target_literacy: data.q4_target_literacy,
            q4_monetization_model: data.q4_monetization_model,
            q4_supplementary_pains: data.q4_supplementary_pains,
          },
          parentCommitId: pivotFrom || null,
          domain: "B2B_SME",
        }),
      });

      const json = await res.json();
      if (json.success && json.commitId && json.jobId) {
        setCreatedCommitId(json.commitId);
        setActiveJobId(json.jobId);
      } else {
        alert(`Failed to commit: ${json.error || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`Network error creating commit: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ジョブ完了時の画面遷移
  const handleJobComplete = () => {
    if (createdCommitId) {
      router.push(`/validate/${createdCommitId}/result`);
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono text-sm">
        <div className="flex items-center space-x-3 text-purple-400 animate-pulse">
          <RotateCcw className="w-5 h-5 animate-spin" />
          <span>Traveling back in time to restore commit {pivotFrom?.slice(0, 8)}...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500 selection:text-white pb-24">
      {/* ナビゲーションヘッダー */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Garage</span>
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center space-x-2">
              <GitBranch className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-sm text-slate-200">Git for Ideas & Reality Crash</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-300 rounded-lg font-mono">
              Mode: Validation Engine
            </span>
          </div>
        </div>
      </header>

      {/* メインエリア */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* タイトルヘッダー */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-300 text-xs font-medium">
            <Flame className="w-3.5 h-3.5 text-purple-400" />
            <span>Structured Idea Pull & 3x Penalty Stress-Test</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-100">
            アイデア仮説コミット作成ウィザード
          </h1>
          <p className="text-xs text-slate-400 max-w-xl mx-auto">
            Q1〜Q4の問いに答えることで、あなたのアイデアをイミュータブルなコミットとして保存し、冷徹なAI審査員とGitHub死骸データで叩き潰します。
          </p>
        </div>

        {/* 3.3 ピボット提案バナー (Diffハイライト表示) */}
        {pivotSuggestion && (
          <div className="p-6 bg-gradient-to-br from-indigo-950/70 via-slate-900/90 to-purple-950/70 border border-amber-500/40 rounded-3xl shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <Lightbulb className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-400 tracking-wider block">
                    AI Strategic Pivot Recommendation (Time-Travel Diff)
                  </span>
                  <p className="text-sm font-bold text-slate-100">
                    {pivotSuggestion.pivotRationale}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleApplyPivotDiff}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center space-x-1.5 shrink-0"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>{isApplyingDiff ? "適用中..." : "✨ このピボット案を採用する"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-800/80">
              {/* Q1 Diff */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between text-indigo-400 font-bold font-mono text-[11px]">
                  <span>Target Pain 提案 (Q1)</span>
                  <span className="text-slate-500 text-[10px]">{pivotSuggestion.diffQ1Explanation}</span>
                </div>
                <p className="text-slate-300 line-clamp-3 italic">
                  "{pivotSuggestion.suggestedQ1}"
                </p>
              </div>

              {/* Q3 Diff */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between text-purple-400 font-bold font-mono text-[11px]">
                  <span>Core Edge 提案 (Q3)</span>
                  <span className="text-slate-500 text-[10px]">{pivotSuggestion.diffQ3Explanation}</span>
                </div>
                <p className="text-slate-300 line-clamp-3 italic">
                  "{pivotSuggestion.suggestedQ3}"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ジョブ進行中の場合はポーリングトラッカーを表示 */}
        {activeJobId ? (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="text-center py-2 text-xs text-purple-400 font-mono">
              🚀 Running Crash Engine on Commit {createdCommitId?.slice(0, 8)}...
            </div>
            <JobPollingTracker
              jobId={activeJobId}
              onComplete={handleJobComplete}
              onError={(err) => console.error("Crash job failed:", err)}
            />
          </div>
        ) : (
          <IdeaWizard
            key={`${pivotFrom || "fresh"}-${JSON.stringify(initialValues)}`}
            initialValues={initialValues}
            onSubmit={handleWizardSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </main>

      {/* ========================================================================= */}
      {/* 4. TIME-TRAVEL PIVOT トースト通知 (画面下部固定) */}
      {/* ========================================================================= */}
      {pivotFrom && (
        <div className="fixed bottom-6 inset-x-0 max-w-lg mx-auto z-50 px-4">
          <div className="bg-gradient-to-r from-purple-900/90 via-slate-900/90 to-indigo-900/90 backdrop-blur-md border border-purple-500/40 rounded-2xl p-4 shadow-2xl text-xs flex items-center justify-between space-x-4 animate-in slide-in-from-bottom-6 duration-500">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-purple-200 block text-xs">
                  🪐 v{pivotFrom.slice(0, 7)} の世界線に戻りました
                </span>
                <p className="text-[11px] text-slate-300">
                  フォーム内容を再検証すると、このコミットを親とする新ブランチが作成されます。
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/validate")}
              className="px-2 py-1 text-[10px] bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition shrink-0 cursor-pointer"
            >
              クリア
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ValidatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono text-sm">
          <span>Loading validation page...</span>
        </div>
      }
    >
      <ValidateContent />
    </Suspense>
  );
}
