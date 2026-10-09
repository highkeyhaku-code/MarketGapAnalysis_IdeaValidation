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
  Zap,
} from "lucide-react";
import { IdeaWizard } from "../../components/IdeaWizard";
import { JobPollingTracker } from "../../components/JobPollingTracker";
import { DetachedHeadStickyBanner } from "../../components/DetachedHeadStickyBanner";
import { AuthWallModal } from "../../components/AuthWallModal";
import { GuestMigrationModal } from "../../components/GuestMigrationModal";
import { PricingModal } from "../../components/PricingModal";
import { useUserSession } from "../../hooks/useUserSession";
import { useBillingStore } from "../../lib/store/useBillingStore";
import { upsertDraftToGuestSession } from "../../lib/guestSession";
import { useIdeaStore } from "../../lib/store/useIdeaStore";
import { isPortfolioMode } from "../../lib/portfolio";
import { IdeaInput, PhysicalElement } from "../../schemas/zod";
import { PivotSuggestionResponse } from "../api/ideas/pivot-suggestion/route";

function ValidateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pivotFrom = searchParams.get("pivotFrom");
  const socraticQuestion = searchParams.get("socraticQuestion");
  const pivotTag = searchParams.get("pivotTag");
  const targetCraterParam = searchParams.get("targetCrater") || "未充足の深い摩擦領域";
  const targetPainQuery = searchParams.get("targetPain");
  const solutionQuery = searchParams.get("solution");
  const coreEdgeQuery = searchParams.get("coreEdge");
  const targetLiteracyQuery = searchParams.get("targetLiteracy");

  const [loadingInitial, setLoadingInitial] = useState(Boolean(pivotFrom));
  const [initialValues, setInitialValues] = useState<Partial<IdeaInput> | undefined>(undefined);
  const [pivotCommitMeta, setPivotCommitMeta] = useState<any>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [createdCommitId, setCreatedCommitId] = useState<string | null>(null);
  const [createdIdeaId, setCreatedIdeaId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // プログレッシブサインアップ & セッション管理
  const {
    user,
    isGuest,
    showAuthWall,
    showMigrationModal,
    openAuthWall,
    closeAuthWall,
    handleMigrationCompleted,
    handleMigrationDiscarded,
  } = useUserSession();

  const {
    planTier,
    monthlyCredits,
    purchasedCredits,
    totalCredits,
    openPricingModal,
    fetchCredits,
  } = useBillingStore();

  useEffect(() => {
    fetchCredits(user?.id);
  }, [user?.id, fetchCredits]);

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

  const { isDetachedHead, viewingVersion, activeVersion, active_commit_id, setIdeaContext, setViewingCommit, checkoutLatest } = useIdeaStore();

  // Time-Travel: 過去のコミットから状態を復元 (設計書 2.7 / 3.3)
  useEffect(() => {
    if (!pivotFrom) return;

    const fetchPivotSource = async () => {
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

          // アイデア親情報と全コミット群を取得して Zustand ストアにセット
          if (c.idea_id) {
            try {
              const ideasRes = await fetch("/api/ideas");
              const ideasJson = await ideasRes.json();
              if (ideasJson.success && Array.isArray(ideasJson.ideas)) {
                const currentIdea = ideasJson.ideas.find((i: any) => i.id === c.idea_id);
                if (currentIdea) {
                  setIdeaContext(
                    currentIdea.id,
                    currentIdea.active_commit_id,
                    currentIdea.idea_commits || [c]
                  );
                  setViewingCommit(pivotFrom);
                }
              }
            } catch (treeErr) {
              console.warn("Failed to load idea commits tree for store:", treeErr);
            }
          }
        }
      } catch (err) {
        console.error("Failed to restore pivot commit:", err);
      } finally {
        setLoadingInitial(false);
      }
    };

    fetchPivotSource();
  }, [pivotFrom, setIdeaContext, setViewingCommit]);

  // 最新状態へ即時復帰 (Checkout HEAD)
  const handleCheckoutLatest = () => {
    checkoutLatest();
    if (active_commit_id && active_commit_id !== pivotFrom) {
      router.push(`/validate?pivotFrom=${active_commit_id}`);
    } else {
      router.push("/validate");
    }
  };

  // ウィザード送信ハンドラ
  const handleWizardSubmit = async (
    data: IdeaInput & {
      detectedElements?: PhysicalElement[];
      visibilityFlags?: any;
      previewSummary?: any;
    }
  ) => {
    try {
      setIsSubmitting(true);

      // ゲストセッション (LocalStorage, 48h TTL) にドラフトを退避
      upsertDraftToGuestSession({
        id: pivotCommitMeta?.idea_id || undefined,
        title: data.q1_target_pain.slice(0, 40),
        domain: "B2B_SME",
        ideaInput: {
          q1_target_pain: data.q1_target_pain,
          q2_solution: data.q2_solution,
          q3_core_edge: data.q3_core_edge,
          q4_target_literacy: data.q4_target_literacy,
          q4_monetization_model: data.q4_monetization_model,
          q4_supplementary_pains: data.q4_supplementary_pains,
        },
        keywords: data.previewSummary?.targetDomainKeywords || [],
      });

      // 未ログインの場合、アカウント永続化のために Auth Wall を表示し、コミット送信を確実に中断
      // ポートフォリオモード（デモモード）時は完全ゲスト動作のため中断せず続行
      if (!isPortfolioMode() && isGuest && !searchParams.get("guestContinue")) {
        openAuthWall();
        setIsSubmitting(false);
        return;
      }

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
          ideaId: pivotCommitMeta?.idea_id || null,
          visibilityFlags: data.visibilityFlags,
          domain: "B2B_SME",
          keywords: data.previewSummary?.targetDomainKeywords || [],
        }),
      });

      const json = await res.json();
      if (json.success && json.commitId && json.jobId) {
        setCreatedCommitId(json.commitId);
        setCreatedIdeaId(json.ideaId || pivotCommitMeta?.idea_id || null);
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

  // ジョブ完了時の画面遷移 (統合リポジトリビュー /ideas/[ideaId] へ遷移)
  const handleJobComplete = () => {
    const targetIdeaId = createdIdeaId || pivotCommitMeta?.idea_id;
    if (targetIdeaId && createdCommitId) {
      router.push(`/ideas/${targetIdeaId}?commitId=${createdCommitId}`);
    } else if (createdCommitId) {
      router.push(`/validate/${createdCommitId}/result`);
    } else {
      router.push("/");
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

          <div className="flex items-center space-x-3 text-xs">
            {/* プランバッジ & クレジットボタン */}
            <button
              onClick={openPricingModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 transition cursor-pointer"
              title="プラン変更・クレジット追加チャージ"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="font-mono font-bold text-slate-100">{totalCredits} pts</span>
              <span className="hidden sm:inline text-[10px] text-slate-400">
                (月:{monthlyCredits}/買:{purchasedCredits})
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {planTier}
              </span>
            </button>

            {/* ログインボタン (未ログイン時) */}
            {isGuest && (
              isPortfolioMode() ? (
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>デモモード</span>
                </div>
              ) : (
                <button
                  onClick={openAuthWall}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer"
                >
                  ログイン
                </button>
              )
            )}
          </div>
        </div>
      </header>

      {/* 4. Detached HEAD Sticky フローティングヘッダー (過去バージョン閲覧時) */}
      <DetachedHeadStickyBanner onCheckoutLatest={handleCheckoutLatest} />

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

        {/* 2.7 ソクラテス式対話バナー (Socratic Challenge: 思考の足場常設 Sticky Header) */}
        {socraticQuestion && (
          <div className="sticky top-20 z-40 p-5 bg-slate-900/95 backdrop-blur-md border border-purple-500/50 rounded-3xl shadow-2xl space-y-2.5 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Lightbulb className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-purple-300 tracking-wider block">
                    🔄 戦略的ピボット進行中 {pivotTag ? `[ 💡 "${pivotTag}" ]` : ""}
                  </span>
                  <h3 className="text-xs font-bold text-slate-100">
                    AI共同創業者・審査員からの問いかけ (思考の足場 / Socratic Question)
                  </h3>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/90 border border-purple-500/30 rounded-2xl">
              <p className="text-xs text-purple-200 italic font-medium leading-relaxed">
                "{socraticQuestion}"
              </p>
            </div>

            <p className="text-[10px] text-slate-400 leading-tight">
              ※ 確証バイアスを破壊しオーナーシップを保つため、AIによる回答の自動書き換えは行われません。上記の問いを手がかりに、ご自身で回答を再構築してください。
            </p>
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
              onRetry={() => {
                setActiveJobId(null);
                setCreatedCommitId(null);
              }}
              timeoutSeconds={180}
            />
          </div>
        ) : (
          <IdeaWizard
            key={`${pivotFrom || "fresh"}-${JSON.stringify(initialValues)}`}
            initialValues={initialValues}
            isRestoredFromPastCommit={Boolean(pivotFrom)}
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

      {/* ========================================================================= */}
      {/* 5. AUTH WALL & GUEST MIGRATION MODALS */}
      {/* ========================================================================= */}
      <AuthWallModal
        isOpen={showAuthWall}
        onClose={closeAuthWall}
        title="アカウント連携で検証を永続化する"
        description="入力した仮説データやAI審査レポートを保護し、タイムトラベル・ピボット（Git for Ideas）を利用するにはログインが必要です。"
      />

      <GuestMigrationModal
        isOpen={showMigrationModal}
        userEmail={user?.email}
        onMigrated={handleMigrationCompleted}
        onDiscarded={handleMigrationDiscarded}
      />

      {/* プラン選択 & 追加クレジット購入モーダル */}
      <PricingModal />
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
