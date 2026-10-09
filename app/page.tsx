"use client";

import React, { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  GitBranch,
  Search,
  Sparkles,
  Rocket,
  ArrowRight,
  Layers,
  Flame,
  Zap,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { TheGarageKanban } from "../components/TheGarageKanban";
import { JobPollingTracker } from "../components/JobPollingTracker";
import { GravityMapVisualizer, GravityMapData } from "../components/GravityMapVisualizer";
import { MarketGenreDirectory } from "../components/MarketGenreDirectory";
import { GarageHeader } from "../components/GarageHeader";
import { PricingModal } from "../components/PricingModal";
import { AuthWallModal } from "../components/AuthWallModal";
import { GuestMigrationModal } from "../components/GuestMigrationModal";
import { useUserSession } from "../hooks/useUserSession";

export default function GarageDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"kanban" | "discover" | "validate">("kanban");
  const [selectedGenre, setSelectedGenre] = useState("Project Management & Workflow Automation");
  const [customKeyword, setCustomKeyword] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [analyzingGenreName, setAnalyzingGenreName] = useState<string>("");
  const [mapResult, setMapResult] = useState<GravityMapData | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);

  // プログレッシブサインアップ & セッション管理
  const {
    user,
    showAuthWall,
    showMigrationModal,
    closeAuthWall,
    handleMigrationCompleted,
    handleMigrationDiscarded,
  } = useUserSession();

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "discover" || tabParam === "validate" || tabParam === "kanban") {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // 探索ジョブの開始 & 専用マップ画面への遷移
  const handleStartDiscovery = async (genreNameToAnalyze: string, genreId?: string) => {
    if (genreId) {
      router.push(`/map/${genreId}`);
      return;
    }

    try {
      setIsTriggering(true);
      setAnalyzingGenreName(genreNameToAnalyze);
      setSelectedGenre(genreNameToAnalyze);

      const res = await fetch("/api/market/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genreName: genreNameToAnalyze,
        }),
      });

      const data = await res.json();
      if (data.success && data.genreId) {
        router.push(`/map/${data.genreId}`);
      } else if (data.success && data.jobId) {
        setActiveJobId(data.jobId);
      } else {
        alert(`Failed to start job: ${data.error || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`Network error starting job: ${err.message}`);
    } finally {
      setIsTriggering(false);
    }
  };

  // ジョブ完了時のハンドラ (専用画面へ遷移)
  const handleJobComplete = (resultData: any) => {
    if (resultData && resultData.genreId) {
      router.push(`/map/${resultData.genreId}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white pb-16">
      {/* ナビゲーションバー (GarageHeader) */}
      <Suspense fallback={<div className="h-16 border-b border-slate-800/80 bg-slate-900/80 sticky top-0 z-40" />}>
        <GarageHeader activeTab={activeTab} onTabChange={setActiveTab} />
      </Suspense>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        {/* ========================================================================= */}
        {/* モード 0: KANBAN HUB */}
        {/* ========================================================================= */}
        {activeTab === "kanban" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <TheGarageKanban />
          </div>
        )}

        {/* ========================================================================= */}
        {/* モード 1: DISCOVER (市場の穴調査) */}
        {/* ========================================================================= */}
        {activeTab === "discover" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* ヒーローバナー */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-purple-950/40 border border-slate-800 p-8 shadow-2xl">
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-medium">
                  <Flame className="w-3.5 h-3.5 text-indigo-400" />
                  <span>AI Gravity & Friction Topological Map</span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 sm:text-4xl">
                  市場の<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">「見えない穴（Gap）」</span>を暴く
                </h1>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Product Huntのプロダクト群とフォーラムの摩擦（Friction）をGeminiが多角的に分析。以下の市場ジャンル辞書（Serendipity Seeker）から関心のある市場を選択して重力トポロジーを描画してください。
                </p>
              </div>
            </div>

            {/* 市場ジャンル辞書ディレクトリー (Serendipity Seeker) */}
            <MarketGenreDirectory
              onSelectGenre={(name, id) => handleStartDiscovery(name, id)}
              selectedGenreName={selectedGenre}
              isAnalyzing={isTriggering || Boolean(activeJobId && !mapResult)}
            />

            {/* 非同期ジョブ進捗トラッカー */}
            {activeJobId && (
              <div className="pt-4 animate-in fade-in duration-300">
                <JobPollingTracker
                  jobId={activeJobId}
                  onComplete={handleJobComplete}
                  onError={(err) => console.error("Job failed:", err)}
                />
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* モード 2: VALIDATION (Git for Ideas & 仮説クラッシュ) */}
        {/* ========================================================================= */}
        {activeTab === "validate" && (
          <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs font-medium">
                <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                <span>Git for Ideas & Reality Crash Engine</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-100">
                アイデアの仮説コミットと死骸検証 (Autopsy)
              </h2>
              <p className="text-slate-400 text-sm">
                あなたのアイデアをイミュータブルなコミット履歴として管理し、GitHubの過去の死骸リポジトリ（放棄された類似プロジェクト）と照合して3xペナルティスコアを算出します。
              </p>

              <button
                onClick={() => router.push("/validate")}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-purple-600/30 transition cursor-pointer flex items-center justify-center space-x-2"
              >
                <GitBranch className="w-5 h-5" />
                <span>Launch Full Multi-Step Idea Wizard & Crash Engine</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* プラン選択 & 追加クレジット購入モーダル */}
      <PricingModal />

      {/* 認証ウォール & ゲスト移行モーダル */}
      <AuthWallModal
        isOpen={showAuthWall}
        onClose={closeAuthWall}
        title="アカウント連携で仮説・市場マップを永続化する"
        description="作成した仮説や探索した市場データを安全に保護し、追加の機能を利用するにはログインが必要です。"
      />

      <GuestMigrationModal
        isOpen={showMigrationModal}
        userEmail={user?.email}
        onMigrated={(count) => {
          handleMigrationCompleted(count);
          window.location.reload();
        }}
        onDiscarded={handleMigrationDiscarded}
      />
    </div>
  );
}
