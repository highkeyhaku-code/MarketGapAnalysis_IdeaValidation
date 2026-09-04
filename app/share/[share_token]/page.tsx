"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Eye,
  FileText,
  Swords,
  Flame,
  UserCheck,
  CheckCircle2,
  Skull,
  ExternalLink,
  Copy,
  Info,
  TrendingUp,
  AlertTriangle,
  Building2,
  LockKeyhole,
} from "lucide-react";
import { EmotionalNutritionLabel } from "../../../components/EmotionalNutritionLabel";
import { VSCardBoard } from "../../../components/VSCardBoard";
import {
  GravityMapVisualizer,
  GravityMapData,
  CustomPlanetData,
} from "../../../components/GravityMapVisualizer";
import { EvaluatedCompanyNode } from "../../../lib/ai/evaluateMarket";
import { VisibilityFlags } from "../../../schemas/zod";

interface SharedData {
  idea: {
    id: string;
    title: string;
    share_token: string;
    is_public: boolean;
    created_at: string;
    updated_at: string;
    totalCommitsCount: number;
  };
  headCommit: {
    id: string;
    idea_id: string;
    status: string;
    emotional_score: number | null;
    semantic_diff: string | null;
    created_at: string;
    q1_target_pain: string;
    q2_solution: string;
    q3_core_edge: string;
    q4_target_literacy: string;
    q4_monetization_model: string;
    visibility_flags: VisibilityFlags;
    scores?: any;
    competitorProfile?: any;
    tribunal?: any;
    personas?: any[];
    githubAutopsy?: any;
  };
  visibilityFlags: VisibilityFlags;
}

export default function InvestorSharedViewPage() {
  const params = useParams();
  const shareToken = params?.share_token as string;

  const [data, setData] = useState<SharedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!shareToken) return;

    const fetchSharedData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch(`/api/share/${shareToken}`);
        const json = await res.json();

        if (json.success && json.idea && json.headCommit) {
          setData(json);
        } else {
          setError(json.error || "公開されているアイデアが見つかりませんでした。");
        }
      } catch (err: any) {
        setError(`データの読み込み中にエラーが発生しました: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedData();
  }, [shareToken]);

  const handleCopyUrl = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-200">投資家向け市場検証ピッチを読み込み中...</h2>
        <p className="text-xs text-slate-400 font-mono mt-1">Verifying cryptographic token & applying dynamic masks...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
            <LockKeyhole className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">アクセス制限または非公開</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || "このプロジェクトは非公開に設定されているか、URLの有効期限が切れています。"}
          </p>
          <div className="pt-2">
            <p className="text-[11px] text-slate-500 font-mono">
              閲覧をご希望の場合は、ファウンダーへ共有リンクの発行をご依頼ください。
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { idea, headCommit, visibilityFlags } = data;
  const scores = headCommit?.scores || {};
  const competitorProfile = headCommit?.competitorProfile || { incumbentName: "Incumbent Leader" };
  const tribunal = headCommit?.tribunal || null;
  const personas = Array.isArray(headCommit?.personas) && headCommit.personas.length > 0
    ? headCommit.personas
    : tribunal
    ? [
        {
          personaKey: "investor",
          name: "Marcus Vance",
          title: "General Partner @ Apex Capital",
          avatarColor: "#ef4444",
          verdict: tribunal.overall_verdict,
          ...tribunal.investor,
        },
        {
          personaKey: "competitor",
          name: "Elena Rostova",
          title: "VP of Product @ Incumbent Giant",
          avatarColor: "#f59e0b",
          verdict: tribunal.overall_verdict,
          ...tribunal.competitor,
        },
        {
          personaKey: "skeptical_user",
          name: "David K.",
          title: "Head of Operations @ Tier-1 Scaleup",
          avatarColor: "#6366f1",
          verdict: tribunal.overall_verdict,
          ...tribunal.skeptical_user,
        },
      ]
    : [];

  const githubAutopsy = headCommit?.githubAutopsy || { items: [] };

  const overallVerdict =
    tribunal?.overall_verdict ||
    (headCommit.emotional_score && headCommit.emotional_score >= 70
      ? "SURVIVED"
      : headCommit.emotional_score && headCommit.emotional_score >= 40
      ? "PIVOT"
      : "KILL");

  const executiveSummaryJa =
    tribunal?.executive_summary_ja ||
    "市場の厳しい構造的摩擦とスイッチング障壁が検出されました。客観的な市場検証データを精査してください。";

  const overallScore = headCommit.emotional_score ?? scores?.emotionalScore ?? null;
  const nutritionMetrics = scores?.nutritionMetrics || {
    cognitiveLoad: 48,
    statusQuoGravity: 68,
    anxietyLevel: 42,
    totalScore: scores?.domainScore?.totalScore ?? -3,
    penalizedCount: scores?.domainScore?.penalizedCount ?? 2,
  };

  const incumbentName = competitorProfile?.incumbentName || "Incumbent Leader";
  const targetGenreName =
    incumbentName === "HubSpot" || incumbentName.toLowerCase().includes("crm")
      ? "B2B Sales CRM & Lead Intelligence"
      : incumbentName === "GitHub" ||
        incumbentName.toLowerCase().includes("git") ||
        incumbentName.toLowerCase().includes("dev")
      ? "Developer Infrastructure & AI Code Tools"
      : "Project Management & Workflow Automation";

  const createCompetitor = (
    companyId: string,
    name: string,
    tagline: string,
    description: string,
    homepageUrl: string,
    pullScore: number,
    frictionScore: number,
    radius: number,
    targetFeatureId: string,
    intensity: number
  ): EvaluatedCompanyNode => ({
    companyId,
    name,
    tagline,
    description,
    homepageUrl,
    pullScore,
    frictionScore,
    radius,
    targetFeatureId,
    intensity,
    gravityStrength: pullScore / 100,
    pullScores: {
      "jtbd-star-0": pullScore,
      "jtbd-star-1": Math.max(20, pullScore - 15),
      "jtbd-star-2": Math.min(95, pullScore + 10),
      "jtbd-star-3": pullScore,
    },
    scoreReasoning: `${name} provides key capabilities with a pull score of ${pullScore} and friction of ${frictionScore}.`,
    physicalScores: {
      integration_cost: 0,
      switching_barrier: 0,
      learning_curve: 0,
      security_compliance: 0,
      customizability: 0,
      realtime_performance: 0,
      price_sensitivity: 0,
      ui_simplicity: 0,
      network_effect: 0,
    },
  });

  const defaultCompetitorList: EvaluatedCompanyNode[] = [
    createCompetitor("comp-incumbent", incumbentName, "Industry Leader", "Market standard platform", "https://example.com", 90, 80, 42, "pricing_and_setup", 8),
    createCompetitor("comp-challenger", "Challenger Pro", "Modern Agile Alternative", "Fast and lightweight tool", "https://example.com", 78, 48, 30, "integrations", 5),
    createCompetitor("comp-oss", "Open Source Alternative", "Community Edition", "Self-hosted flexibility", "https://example.com", 72, 65, 28, "maintenance", 6),
  ];

  const customPlanet: CustomPlanetData = {
    id: headCommit.id || "custom-planet",
    name: `🪐 あなたの仮説 (Verified)`,
    solution: headCommit.q2_solution,
    targetPain: headCommit.q1_target_pain || undefined,
    coreEdge: headCommit.q3_core_edge || undefined,
    pullScore: overallScore || 50,
    frictionScore: nutritionMetrics.statusQuoGravity,
    radius: 30,
    commitId: headCommit.id,
    isUserIdea: true,
  };

  const gravityMapData: GravityMapData = {
    genreId: `domain-${incumbentName.toLowerCase()}`,
    genreName: targetGenreName,
    coreJtbd: `Empower teams to execute ${targetGenreName} workflows with zero friction`,
    companies: defaultCompetitorList,
    customPlanet,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-24">
      {/* ========================================================================= */}
      {/* 1. ピッチヘッダー (Investor Pitch Header) */}
      {/* ========================================================================= */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">
                  Investor Verification Deck
                </span>
                <span className="px-2 py-0.2 text-[9px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-md">
                  READ ONLY
                </span>
              </div>
              <h1 className="font-bold text-sm text-slate-100 truncate max-w-md">
                {idea.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopyUrl}
              className="flex items-center space-x-1.5 text-xs px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition cursor-pointer"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied Link" : "Share URL"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. メインピッチコンテンツ */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8">
        {/* セキュリティ・NDA ガードバナー */}
        <div className="bg-slate-900/60 border border-indigo-500/20 rounded-2xl p-4 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <span className="font-bold text-slate-100">セキュア共有ビュー (Secure by Default)</span>
              <p className="text-slate-400 text-[11px]">
                機密性の高い解決策やコア技術はサーバー側で自動マスクされています。全容の閲覧にはファウンダーとのNDA締結が必要です。
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono text-[10px] rounded-lg shrink-0">
            Total Commits: {idea.totalCommitsCount}
          </span>
        </div>

        {/* 審査員 Verdict & スコアバナー */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                Market Crash Simulation Verdict
              </span>
              <div className="flex items-center space-x-3">
                <span
                  className={`px-3 py-1 rounded-xl text-sm font-black font-mono tracking-wider border shadow-md ${
                    overallVerdict === "SURVIVED"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : overallVerdict === "PIVOT"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  }`}
                >
                  {overallVerdict}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  対戦宿敵: <strong className="text-slate-200">{incumbentName}</strong>
                </span>
              </div>
            </div>

            {overallScore !== null && (
              <div className="flex items-center space-x-3 bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800">
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400 block">Emotional Score</span>
                  <span className="text-xs text-slate-500">市場生存力</span>
                </div>
                <span
                  className={`text-2xl font-black font-mono ${
                    overallScore >= 60 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {overallScore}
                </span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60">
            💬 <strong>Executive Summary:</strong> {executiveSummaryJa}
          </p>
        </div>

        {/* 仮説概要カード (Q1〜Q4: 公開/非公開マスク表示) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Q1: Target & Pain */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-300 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Q1: ターゲットと深い痛み (Target & Pain)</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                  visibilityFlags.q1_target_pain
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {visibilityFlags.q1_target_pain ? "👁️ 公開" : "🔒 非公開"}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/60">
              {headCommit.q1_target_pain}
            </p>
          </div>

          {/* Q2: Solution */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-purple-300 flex items-center space-x-1.5">
                <Swords className="w-4 h-4 text-purple-400" />
                <span>Q2: 解決策 (Solution)</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                  visibilityFlags.q2_solution
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {visibilityFlags.q2_solution ? "👁️ 公開" : "🔒 非公開 (NDA保護)"}
              </span>
            </div>
            <p
              className={`text-xs leading-relaxed font-sans p-3.5 rounded-xl border ${
                visibilityFlags.q2_solution
                  ? "bg-slate-950/50 text-slate-300 border-slate-800/60"
                  : "bg-rose-950/10 text-rose-300/80 border-rose-500/20 font-mono italic"
              }`}
            >
              {headCommit.q2_solution}
            </p>
          </div>

          {/* Q3: Core Edge */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-300 flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span>Q3: 構造的エッジ (Core Edge)</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                  visibilityFlags.q3_core_edge
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {visibilityFlags.q3_core_edge ? "👁️ 公開" : "🔒 非公開 (NDA保護)"}
              </span>
            </div>
            <p
              className={`text-xs leading-relaxed font-sans p-3.5 rounded-xl border ${
                visibilityFlags.q3_core_edge
                  ? "bg-slate-950/50 text-slate-300 border-slate-800/60"
                  : "bg-rose-950/10 text-rose-300/80 border-rose-500/20 font-mono italic"
              }`}
            >
              {headCommit.q3_core_edge}
            </p>
          </div>

          {/* Q4: Business Model */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-300 flex items-center space-x-1.5">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>Q4: ビジネス属性 (Business & Literacy)</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                👁️ 公開
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/60 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-500 block">ターゲットリテラシー</span>
                <span className="text-slate-200 font-bold">{headCommit.q4_target_literacy}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">マネタイズモデル</span>
                <span className="text-slate-200 font-bold">{headCommit.q4_monetization_model}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. VS Card Board & Emotional Nutrition Label */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
            <Swords className="w-4 h-4 text-indigo-400" />
            <span>Physical & Emotional Friction Analysis (9要素比較 & 3倍ペナルティ)</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8">
              <VSCardBoard
                ideaTitle={idea.title}
                competitorName={incumbentName}
                competitorTagline={competitorProfile?.phDetails?.tagline || "Industry standard platform"}
                elementDiffs={scores?.elementDiffs || {}}
                overallScore={overallScore || 50}
              />
            </div>
            <div className="lg:col-span-4 flex justify-center">
              <EmotionalNutritionLabel
                metrics={nutritionMetrics}
                overallScore={overallScore || 65}
              />
            </div>
          </div>
        </div>

        {/* 4. GitHub 死骸報告書 (Autopsy) */}
        {githubAutopsy && Array.isArray(githubAutopsy.items) && githubAutopsy.items.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 space-y-4">
            <div className="flex items-center space-x-2.5">
              <Skull className="w-5 h-5 text-rose-400" />
              <h3 className="font-bold text-sm text-slate-100">
                GitHub 類似オープンソース死骸報告書 (Autopsy)
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {githubAutopsy.items.map((item: any, idx: number) => {
                const repoName = item.repo_name || item.name || item.full_name || "archived-repo";
                const starCount = item.stars ?? item.stargazers_count ?? 0;
                const cause =
                  item.death_cause ||
                  item.autopsy_reason ||
                  item.causeOfDeath ||
                  "メンテナンス停止・マネタイズ未達による放棄";
                const url = item.html_url || item.url || `https://github.com/${repoName}`;

                return (
                  <div key={idx} className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-2 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold font-mono text-indigo-300 hover:underline truncate"
                        >
                          {repoName}
                        </a>
                        <span className="text-[10px] text-slate-500 shrink-0">{starCount} ★</span>
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    <div className="pt-2 border-t border-slate-800/60">
                      <p className="text-[11px] text-rose-300/90 leading-relaxed font-sans">
                        💀 <strong>死因:</strong> {cause}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. 3人のAI審査員フィードバック */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
            <UserCheck className="w-4 h-4 text-purple-400" />
            <span>AI Tribunal Cross-Examination (審査員 3 人の講評)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {personas.map((p, idx) => (
              <div
                key={idx}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white"
                      style={{ backgroundColor: p.avatarColor || "#6366f1" }}
                    >
                      {p.name?.charAt(0) || "AI"}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-100">{p.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">
                        {p.title}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans pt-1">
                    "{p.comment || p.critique || "市場の移行障壁と価格感度を慎重に検証する必要があります。"}"
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-[10px] font-mono flex items-center justify-between text-slate-400">
                  <span>Score Weight: {p.weight || "1.0x"}</span>
                  <span className="text-indigo-400 font-bold">Objective Feedback</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6. D3 重力マップ (Gravity Map Visualizer) */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Competitive Gravity Map (市場引力と摩擦クレーター)</span>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
            <GravityMapVisualizer
              data={gravityMapData}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
