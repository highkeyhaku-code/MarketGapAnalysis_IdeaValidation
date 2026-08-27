"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  GitBranch,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Skull,
  ExternalLink,
  Flame,
  UserCheck,
  CheckCircle2,
  Share2,
  Copy,
  ArrowLeft,
  HelpCircle,
  Star,
  Compass,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { EmotionalNutritionLabel } from "../../../../components/EmotionalNutritionLabel";
import { VSCardBoard } from "../../../../components/VSCardBoard";

export default function ValidationResultPage() {
  const params = useParams();
  const router = useRouter();
  const commitId = params?.commitId as string;

  const [loading, setLoading] = useState(true);
  const [commitData, setCommitData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showPivotToast, setShowPivotToast] = useState(false);

  useEffect(() => {
    if (!commitId) return;

    const fetchCommit = async () => {
      try {
        const res = await fetch(`/api/ideas/commit/${commitId}`);
        const json = await res.json();
        if (json.success && json.commit) {
          setCommitData(json.commit);
          const score = json.commit.emotional_score ?? 60;
          if (score < 50) {
            setShowPivotToast(true);
          }
        }
      } catch (err) {
        console.error("Failed to load commit data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCommit();
  }, [commitId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono text-sm">
        <div className="flex items-center space-x-3 text-indigo-400 animate-pulse">
          <Sparkles className="w-5 h-5 animate-spin" />
          <span>Decoding Reality Crash Report for commit {commitId?.slice(0, 8)}...</span>
        </div>
      </div>
    );
  }

  const payload = commitData?.q4_supplementary_pains || {};
  const scores = payload?.scores || {};
  const competitorProfile = payload?.competitorProfile || { incumbentName: "Incumbent Leader" };
  const personas = payload?.personas || [];
  const githubAutopsy = payload?.githubAutopsy || { items: [] };

  const overallScore = commitData?.emotional_score ?? scores?.emotionalScore ?? 62;
  const nutritionMetrics = scores?.nutritionMetrics || {
    cognitiveLoad: 48,
    statusQuoGravity: 68,
    anxietyLevel: 42,
    totalScore: scores?.domainScore?.totalScore ?? -3,
    penalizedCount: scores?.domainScore?.penalizedCount ?? 2,
  };

  const shareToken = commitData?.share_token;
  const shareUrl = shareToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${shareToken}`
    : typeof window !== "undefined"
    ? window.location.href
    : "";

  const handleCopyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500 selection:text-white pb-28">
      {/* ナビゲーションバー */}
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
              <span className="font-mono text-xs text-slate-300">
                Commit: {commitId.slice(0, 8)}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopyShareUrl}
              className="flex items-center space-x-1.5 text-xs px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition cursor-pointer"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied Share URL" : "Investor Share View"}</span>
            </button>

            {/* Time-Travel Pivot ボタン */}
            <button
              onClick={() => router.push(`/validate?pivotFrom=${commitId}`)}
              className="flex items-center space-x-2 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Time-Travel Pivot</span>
            </button>
          </div>
        </div>
      </header>

      {/* メイン検証レポート */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* レポートヘッダー */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950/40 via-slate-900/60 to-indigo-950/40 border border-slate-800 p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-300 text-xs font-medium">
                <Flame className="w-3.5 h-3.5 text-purple-400" />
                <span>Hypothesis Reality Crash Result</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-100">
                {commitData?.ideas?.title || commitData?.q1_target_pain?.slice(0, 45) || "Hypothesis Commit"}
              </h1>
              <p className="text-xs text-slate-400">
                Validated against {competitorProfile.incumbentName} with 3x penalty models & GitHub Autopsy corpus.
              </p>
            </div>

            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center space-x-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Survives Score</span>
                <span className="text-3xl font-black font-mono text-purple-400">{overallScore}</span>
                <span className="text-xs text-slate-500 font-normal"> / 100</span>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Status</span>
                <span className="text-xs font-bold text-emerald-400 uppercase font-mono">
                  {commitData?.status || "COMPLETED"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2カラムレイアウト: VS Card Board & Emotional Nutrition Facts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左側: VS Card Board */}
          <div className="lg:col-span-2 space-y-6">
            <VSCardBoard
              ideaTitle={commitData?.q2_solution?.slice(0, 35) || "Your Challenger Solution"}
              competitorName={competitorProfile.incumbentName}
              competitorTagline={competitorProfile.phDetails?.tagline}
              elementDiffs={scores?.elementDiffs || {}}
              overallScore={overallScore}
            />

            {/* 死骸報告書 (GitHub Autopsy List) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Skull className="w-5 h-5 text-rose-400" />
                  <h3 className="font-bold text-sm text-slate-100">
                    GitHub 死骸報告書 (Autopsy: 類似の放棄リポジトリ)
                  </h3>
                </div>
                <span className="text-xs font-mono text-rose-400">
                  {githubAutopsy.totalCount || githubAutopsy.items?.length || 0} Archived Repos Found
                </span>
              </div>

              <p className="text-xs text-slate-400">
                過去に同じアイデアを試みてスターを集めたものの、更新が停止しアーカイブされたプロジェクトです。彼らが何につまずいたかを分析して回避策を講じてください。
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {(githubAutopsy.items || []).slice(0, 4).map((repo: any) => (
                  <div
                    key={repo.id || repo.full_name}
                    className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-indigo-300 hover:underline flex items-center space-x-1 truncate"
                      >
                        <span className="truncate">{repo.name || repo.full_name}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                      <span className="font-mono text-[10px] text-amber-400">★ {repo.stargazers_count}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {repo.description || "No description provided."}
                    </p>
                    <div className="text-[10px] font-mono text-slate-500">
                      Last Pushed: {repo.pushed_at ? new Date(repo.pushed_at).toLocaleDateString() : "Archived"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右側: 感情の成分表示 (Nutrition Facts) */}
          <div className="lg:col-span-1 flex flex-col items-center">
            <EmotionalNutritionLabel metrics={nutritionMetrics} overallScore={overallScore} />
          </div>
        </div>

        {/* 3人の懐疑的ペルソナ審査員フィードバック & ソクラテス式ツッコミ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Skeptical Personas & Socratic Guidance (冷徹な3人の審査員と対話型ツッコミ)
              </h3>
            </div>
            <span className="text-xs text-slate-400 flex items-center space-x-1">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Grounding Transparency Active</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {personas.map((p: any, idx: number) => {
              const confidence = p.groundingConfidence || "HIGH";
              const sourcesCount = p.groundingSourcesCount || 5;

              return (
                <div
                  key={idx}
                  className="p-6 bg-slate-900/90 border border-slate-800 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-100">{p.name}</h4>
                        <p className="text-[11px] text-slate-400">{p.title}</p>
                      </div>
                      <span
                        className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border uppercase ${
                          p.verdict === "CRITICAL"
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                        }`}
                      >
                        {p.verdict}
                      </span>
                    </div>

                    {/* 4-1. 不確実性の開示 (Transparency Metric) */}
                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-[10px] font-mono">
                      <span className="text-slate-400">Grounding Confidence:</span>
                      <div className="flex items-center space-x-1 text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{confidence} ({sourcesCount} sources)</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 italic leading-relaxed">
                      "{p.coreCritique}"
                    </p>

                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs space-y-1">
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                        Fatal Vulnerability (致命的欠陥)
                      </span>
                      <p className="text-[11px] text-rose-200">{p.fatalFlaw}</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs space-y-1">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                        Recommended Countermeasure
                      </span>
                      <p className="text-[11px] text-indigo-200">{p.recommendedCountermeasure}</p>
                    </div>

                    {/* 4-2. 対話型ツッコミUI (Socratic Dialogue Prompt) */}
                    {p.socraticQuestion && (
                      <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-xs space-y-1 animate-in fade-in">
                        <div className="flex items-center space-x-1.5 text-purple-300 font-bold text-[10px] uppercase tracking-wider">
                          <Lightbulb className="w-3.5 h-3.5 text-purple-400" />
                          <span>Socratic Challenge (思考の足場)</span>
                        </div>
                        <p className="text-[11px] text-purple-200 italic">
                          "{p.socraticQuestion}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 4-3. ピボット誘導トースト (スコア50点未満の場合) */}
      {/* ========================================================================= */}
      {showPivotToast && (
        <div className="fixed bottom-6 inset-x-0 max-w-xl mx-auto z-50 px-4 animate-in slide-in-from-bottom-6 duration-500">
          <div className="bg-gradient-to-r from-rose-950/95 via-slate-900/95 to-purple-950/95 backdrop-blur-lg border border-rose-500/40 rounded-3xl p-5 shadow-2xl flex items-center justify-between space-x-4">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-rose-400 shrink-0">
                <Skull className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-rose-200 text-sm block">
                  💀 クラッシュにより仮説が大破しました (Score: {overallScore})
                </span>
                <p className="text-xs text-slate-300">
                  既存の競合の重力圏で大破しましたが、クレーター方向へピボットすることで生存率が上がります。
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/validate?pivotFrom=${commitId}`)}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition shrink-0 cursor-pointer flex items-center space-x-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>今すぐピボット</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
