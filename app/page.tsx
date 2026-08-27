"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Compass,
  GitBranch,
  Search,
  Sparkles,
  Rocket,
  ArrowRight,
  Layers,
  Flame,
  Zap,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { JobPollingTracker } from "../components/JobPollingTracker";
import { GravityMapVisualizer, GravityMapData } from "../components/GravityMapVisualizer";

const POPULAR_GENRES = [
  {
    id: "genre-pm",
    name: "Project Management & Workflow Automation",
    desc: "Notion, Linear, Asana, Monday.com, ClickUp",
    frictionRate: "78% config friction",
  },
  {
    id: "genre-crm",
    name: "B2B Sales CRM & Lead Intelligence",
    desc: "HubSpot, Salesforce, Attio, Folk, Pipedrive",
    frictionRate: "84% pricing & setup overhead",
  },
  {
    id: "genre-devtools",
    name: "Developer Infrastructure & AI Code Tools",
    desc: "GitHub, GitLab, Supabase, Vercel, Cursor",
    frictionRate: "62% learning curve",
  },
];

export default function GarageDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"discover" | "validate">("discover");
  const [selectedGenre, setSelectedGenre] = useState(POPULAR_GENRES[0].name);
  const [customKeyword, setCustomKeyword] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [analyzingGenreName, setAnalyzingGenreName] = useState<string>("");
  const [mapResult, setMapResult] = useState<GravityMapData | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);

  // 探索ジョブの開始
  const handleStartDiscovery = async (genreNameToAnalyze: string) => {
    try {
      setIsTriggering(true);
      setMapResult(null);
      setAnalyzingGenreName(genreNameToAnalyze);

      const res = await fetch("/api/market/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genreName: genreNameToAnalyze,
        }),
      });

      const data = await res.json();
      if (data.success && data.jobId) {
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

  // ジョブ完了時のハンドラ
  const handleJobComplete = (resultData: any) => {
    if (resultData && resultData.companies) {
      setMapResult(resultData as GravityMapData);
    } else {
      // フォールバック用データ構造
      setMapResult({
        genreId: "cached-genre",
        genreName: analyzingGenreName || selectedGenre,
        coreJtbd: `Empower teams to execute ${analyzingGenreName || selectedGenre} with zero friction`,
        companies: [],
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* ナビゲーションバー */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-[0_0_16px_rgba(99,102,241,0.5)]">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                THE GARAGE
              </span>
              <span className="ml-2 px-2 py-0.5 text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-md">
                v2.0 Beta
              </span>
            </div>
          </div>

          {/* モード切替タブ */}
          <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("discover")}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "discover"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Discover (市場の穴調査)</span>
            </button>

            <button
              onClick={() => setActiveTab("validate")}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "validate"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <GitBranch className="w-4 h-4" />
              <span>Validate (Git for Ideas)</span>
            </button>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Credits:</span>
              <span className="font-mono font-bold text-amber-300">10 pts</span>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        {/* ========================================================================= */}
        {/* モード 1: DISCOVER (市場の穴調査) */}
        {/* ========================================================================= */}
        {activeTab === "discover" && (
          <div className="space-y-8">
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
                  Product Huntのプロダクト群とフォーラムの摩擦（Friction）をGeminiが多角的に分析。D3.js物理演算トポロジー上に、競合の引力と反発力のクレーターを描画します。
                </p>
              </div>

              {/* クイック検索バー */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3 max-w-2xl">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={customKeyword}
                    onChange={(e) => setCustomKeyword(e.target.value)}
                    placeholder="調べたいSaaS領域・市場キーワードを入力（例: AI Video Editor, CRM）"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <button
                  disabled={isTriggering}
                  onClick={() => handleStartDiscovery(customKeyword || selectedGenre)}
                  className="inline-flex items-center justify-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                >
                  <Rocket className="w-4 h-4" />
                  <span>{isTriggering ? "起動中..." : "Run Discovery"}</span>
                </button>
              </div>
            </div>

            {/* おすすめのプリセットジャンル */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Featured Target Markets (プリセット市場)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {POPULAR_GENRES.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => {
                      setSelectedGenre(g.name);
                      handleStartDiscovery(g.name);
                    }}
                    className={`p-5 rounded-2xl border transition cursor-pointer group relative overflow-hidden ${
                      selectedGenre === g.name
                        ? "bg-slate-900/90 border-indigo-500/60 shadow-lg shadow-indigo-500/10"
                        : "bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/70 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-md font-mono text-[10px]">
                        {g.frictionRate}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-200 group-hover:text-indigo-300 transition">
                      {g.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">{g.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 非同期ジョブ進捗トラッカー */}
            {activeJobId && !mapResult && (
              <div className="pt-4 animate-in fade-in duration-300">
                <JobPollingTracker
                  jobId={activeJobId}
                  onComplete={handleJobComplete}
                  onError={(err) => console.error("Job failed:", err)}
                />
              </div>
            )}

            {/* D3 重力マップ可視化エリア */}
            {mapResult && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Analysis Complete: {mapResult.companies.length} Competitors Topology Mapped</span>
                  </div>
                  <button
                    onClick={() => handleStartDiscovery(mapResult.genreName)}
                    className="flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-xl border border-indigo-500/30 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Re-analyze</span>
                  </button>
                </div>

                <GravityMapVisualizer data={mapResult} width={1000} height={580} />
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* モード 2: VALIDATION (Git for Ideas & 仮説クラッシュ) */}
        {/* ========================================================================= */}
        {activeTab === "validate" && (
          <div className="space-y-6 max-w-4xl mx-auto">
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

              <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-4 text-xs">
                <div className="space-y-2">
                  <label className="font-semibold text-slate-300 block">Q1: Target Pain (対象のペイン - 30〜1000文字)</label>
                  <textarea
                    rows={3}
                    placeholder="例: 中小企業のリモートチームにおいて、プロジェクト管理ツールの設定とAPI連携が複雑すぎてメンバーが定着しない..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-semibold text-slate-300 block">Q2: Solution (提供する解決策 - 30〜1000文字)</label>
                  <textarea
                    rows={3}
                    placeholder="例: 自然言語で指示するだけで、プロジェクトのワークフローと権限設定が全自動構築されるAIネイティブ管理ハブ..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-semibold text-slate-300 block">Q3: Core Edge (競合に対するコアな優位性 - 20〜1000文字)</label>
                  <input
                    type="text"
                    placeholder="例: 既存のSaaS APIと0-configで双方向同期し、初期学習コストをゼロにする"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>

                <button
                  onClick={() => router.push("/validate")}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 transition cursor-pointer flex items-center justify-center space-x-2"
                >
                  <GitBranch className="w-4 h-4" />
                  <span>Launch Full Idea Wizard & Run Reality Crash Engine</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
