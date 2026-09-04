"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  Copy,
  ArrowLeft,
  HelpCircle,
  Star,
  Compass,
  Lightbulb,
  FileQuestion,
  Home,
  Layers,
  History,
  Info,
  Calendar,
  Clock,
  Send,
  Trash2,
  Eye,
} from "lucide-react";
import { EmotionalNutritionLabel } from "../../../components/EmotionalNutritionLabel";
import { VSCardBoard } from "../../../components/VSCardBoard";
import { DetachedHeadStickyBanner } from "../../../components/DetachedHeadStickyBanner";
import { IdeaLineageTree } from "../../../components/IdeaLineageTree";
import { JobPollingTracker } from "../../../components/JobPollingTracker";
import {
  GravityMapVisualizer,
  GravityMapData,
  CustomPlanetData,
} from "../../../components/GravityMapVisualizer";
import { useIdeaStore, IdeaCommitItem } from "../../../lib/store/useIdeaStore";
import { IdeaCommitNode } from "../../../lib/treeTypes";
import { computeCommitTreeVersions } from "../../../lib/versioning";
import { EvaluatedCompanyNode } from "../../../lib/ai/evaluateMarket";

function IdeaRepositoryContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const ideaId = params?.id as string;
  const initialCommitIdParam = searchParams.get("commitId");

  const [loading, setLoading] = useState(true);
  const [ideaData, setIdeaData] = useState<any>(null);
  const [selectedCommitId, setSelectedCommitId] = useState<string | null>(initialCommitIdParam);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<"crash_report" | "gravity_map">("crash_report");
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [shareToken, setShareToken] = useState<string>(ideaId || "");
  const [isUpdatingPublic, setIsUpdatingPublic] = useState(false);

  useEffect(() => {
    if (ideaData) {
      setIsPublic(ideaData.is_public ?? false);
      setShareToken(ideaData.share_token || ideaId);
    }
  }, [ideaData, ideaId]);

  const {
    active_commit_id,
    viewing_commit_id,
    isDetachedHead,
    activeVersion,
    viewingVersion,
    setIdeaContext,
    setViewingCommit,
    checkoutLatest,
  } = useIdeaStore();

  // 単一アイデア & 全コミット一覧フェッチ
  const fetchIdeaRepository = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/ideas/${ideaId}`);
      const json = await res.json();

      if (json.success && json.idea) {
        const idea = json.idea;
        setIdeaData(idea);

        const commits: IdeaCommitItem[] = idea.idea_commits || [];
        setIdeaContext(idea.id, idea.active_commit_id, commits);

        // 初期選択コミットの決定
        const targetCommitId =
          selectedCommitId ||
          initialCommitIdParam ||
          idea.active_commit_id ||
          (commits.length > 0 ? commits[commits.length - 1].id : null);

        setSelectedCommitId(targetCommitId);
        if (targetCommitId) {
          setViewingCommit(targetCommitId);
        }
      } else {
        setErrorMessage(json.error || `Idea repository "${ideaId}" not found.`);
      }
    } catch (err: any) {
      console.error("Failed to load idea repository:", err);
      setErrorMessage(err.message || "Failed to load idea repository");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ideaId) return;
    fetchIdeaRepository();
  }, [ideaId]);

  const commits: IdeaCommitItem[] = ideaData?.idea_commits || [];

  // バージョンマップ計算
  const versionMap = useMemo(() => {
    return computeCommitTreeVersions(commits, ideaData?.active_commit_id);
  }, [commits, ideaData?.active_commit_id]);

  // Tree コンポーネント用のノード変換
  const treeNodes: IdeaCommitNode[] = useMemo(() => {
    return commits.map((c) => ({
      id: c.id,
      parentId: c.parent_commit_id,
      version: versionMap.get(c.id) || "v1",
      title: c.q1_target_pain?.slice(0, 35) || "Hypothesis Commit",
      score: c.emotional_score ?? null,
      status: c.status,
      createdAt: c.created_at,
      metadata: {
        emotionalScore: c.emotional_score ?? null,
        semanticDiff: c.semantic_diff,
        shareToken: (c as any).share_token,
      },
    }));
  }, [commits, versionMap]);

  // 選択中コミットの取得
  const selectedCommit = useMemo(() => {
    if (!selectedCommitId) return commits[commits.length - 1] || null;
    return commits.find((c) => c.id === selectedCommitId) || commits[commits.length - 1] || null;
  }, [commits, selectedCommitId]);

  // HEAD コミット
  const headCommit = useMemo(() => {
    const headId = ideaData?.active_commit_id;
    if (headId) {
      const found = commits.find((c) => c.id === headId);
      if (found) return found;
    }
    return commits[commits.length - 1] || null;
  }, [commits, ideaData?.active_commit_id]);

  // ツリーノード選択時のハンドラ
  const handleSelectNode = (node: IdeaCommitNode) => {
    setSelectedCommitId(node.id);
    setViewingCommit(node.id);
  };

  // 最新へ復帰 (Checkout HEAD)
  const handleCheckoutLatest = () => {
    checkoutLatest();
    if (ideaData?.active_commit_id) {
      setSelectedCommitId(ideaData.active_commit_id);
    }
  };

  if (loading && !ideaData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono text-sm">
        <div className="flex items-center space-x-3 text-purple-400 animate-pulse">
          <Sparkles className="w-5 h-5 animate-spin" />
          <span>Loading Idea Repository & Git Lineage Tree for {ideaId?.slice(0, 8)}...</span>
        </div>
      </div>
    );
  }

  if (errorMessage || !ideaData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <FileQuestion className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-100">リポジトリが見つかりませんでした</h2>
            <p className="text-xs text-slate-400">
              指定されたアイデア ID（<span className="font-mono text-slate-300">{ideaId}</span>）は存在しないか削除されました。
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
          >
            <Home className="w-4 h-4" />
            <span>The Garage へ戻る</span>
          </Link>
        </div>
      </div>
    );
  }

  // 選択コミットのパース
  const payload = selectedCommit?.q4_supplementary_pains || {};
  const scores = payload?.scores || {};
  const competitorProfile = payload?.competitorProfile || { incumbentName: "Incumbent Leader" };
  const tribunal = payload?.tribunal || payload?.critique || null;
  const personas = Array.isArray(payload?.personas) && payload.personas.length > 0
    ? payload.personas
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
  const githubAutopsy = payload?.githubAutopsy || { items: [] };

  const overallVerdict =
    tribunal?.overall_verdict ||
    (selectedCommit?.emotional_score && selectedCommit.emotional_score >= 70
      ? "SURVIVED"
      : selectedCommit?.emotional_score && selectedCommit.emotional_score >= 40
      ? "PIVOT"
      : "KILL");
  const executiveSummaryJa =
    tribunal?.executive_summary_ja ||
    "市場の厳しい構造的摩擦とスイッチング障壁が検出されました。";

  const overallScore = selectedCommit?.emotional_score ?? scores?.emotionalScore ?? null;
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

  const defaultCompetitorList: EvaluatedCompanyNode[] =
    incumbentName === "HubSpot"
      ? [
          createCompetitor("comp-hubspot", "HubSpot", "Inbound CRM & Marketing Hub", "Market leader with expansive feature set", "https://hubspot.com", 92, 84, 42, "pricing_and_setup_overhead", 9),
          createCompetitor("comp-salesforce", "Salesforce", "Enterprise Cloud CRM", "Complex legacy enterprise standard", "https://salesforce.com", 95, 88, 46, "configuration_complexity", 9),
          createCompetitor("comp-attio", "Attio", "Data-driven modern CRM", "Realtime data sync and custom model", "https://attio.com", 82, 45, 30, "learning_curve", 5),
          createCompetitor("comp-folk", "Folk", "All-in-one relationship management", "Lightweight contact CRM", "https://folk.app", 76, 40, 26, "integrations", 4),
          createCompetitor("comp-pipedrive", "Pipedrive", "Pipeline CRM for sales teams", "Visual deal tracking tool", "https://pipedrive.com", 78, 55, 28, "ai_automation", 6),
        ]
      : incumbentName === "GitHub"
      ? [
          createCompetitor("comp-github", "GitHub", "Where the world builds software", "Monolithic repository & actions platform", "https://github.com", 98, 68, 46, "workflow_complexity", 7),
          createCompetitor("comp-gitlab", "GitLab", "The DevSecOps Platform", "End-to-end devops suite", "https://gitlab.com", 90, 72, 40, "ui_simplicity", 8),
          createCompetitor("comp-vercel", "Vercel", "Frontend cloud platform", "Framework-defined deployment", "https://vercel.com", 88, 52, 34, "vendor_lockin", 5),
          createCompetitor("comp-supabase", "Supabase", "Open source Firebase alternative", "Postgres with realtime and auth", "https://supabase.com", 85, 48, 32, "db_management", 5),
          createCompetitor("comp-cursor", "Cursor", "The AI Code Editor", "VS Code fork with deep LLM repo awareness", "https://cursor.com", 86, 58, 32, "resource_consumption", 6),
        ]
      : [
          createCompetitor("comp-notion", "Notion", "All-in-one workspace", "Docs, wikis, and projects hub", "https://notion.so", 95, 78, 44, "database_speed_and_complexity", 8),
          createCompetitor("comp-linear", "Linear", "Issue tracking built for speed", "Streamline software projects and sprints", "https://linear.app", 90, 42, 34, "non_tech_customization", 5),
          createCompetitor("comp-asana", "Asana", "Work management platform", "Enterprise portfolio task tracking", "https://asana.com", 86, 70, 38, "notification_noise", 7),
          createCompetitor("comp-monday", "Monday.com", "Customizable work OS", "Visual workflow tables", "https://monday.com", 85, 74, 36, "pricing_tiers", 8),
          createCompetitor("comp-clickup", "ClickUp", "One app to replace them all", "Feature-heavy all-in-one productivity suite", "https://clickup.com", 84, 82, 36, "lag_and_overwhelm", 9),
        ];

  const customPlanet: CustomPlanetData = {
    id: selectedCommit?.id || "custom-planet",
    name: `🪐 ${selectedCommit ? versionMap.get(selectedCommit.id) || "v1" : "v1"}: あなたの仮説`,
    solution: selectedCommit?.q2_solution || "Your Challenger Solution",
    targetPain: selectedCommit?.q1_target_pain || undefined,
    coreEdge: selectedCommit?.q3_core_edge || undefined,
    pullScore: overallScore || 50,
    frictionScore: nutritionMetrics.statusQuoGravity,
    radius: 30,
    commitId: selectedCommit?.id || "",
    isUserIdea: true,
  };

  const gravityMapData: GravityMapData = {
    genreId: `domain-${incumbentName.toLowerCase()}`,
    genreName: targetGenreName,
    coreJtbd: `Empower teams to execute ${targetGenreName} workflows with zero friction`,
    companies: defaultCompetitorList,
    customPlanet,
  };

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/share/${shareToken}`;

  const handleCopyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTogglePublic = async () => {
    try {
      setIsUpdatingPublic(true);
      const nextPublic = !isPublic;
      const res = await fetch(`/api/ideas/${ideaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: nextPublic }),
      });
      const json = await res.json();
      if (json.success) {
        setIsPublic(nextPublic);
        if (json.share_token) setShareToken(json.share_token);
      } else {
        alert(`公開設定の変更に失敗しました: ${json.error || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`エラーが発生しました: ${err.message}`);
    } finally {
      setIsUpdatingPublic(false);
    }
  };

  const handleDeleteRepository = async () => {
    const confirmed = window.confirm(
      `【確認】プロジェクト「${ideaData?.title || "このアイデア"}」と全バージョン履歴を完全に削除してよろしいですか？\nこの操作は取り消せません。`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/ideas/${ideaId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        router.push("/");
      } else {
        alert(`削除に失敗しました: ${json.error || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`削除処理中にエラーが発生しました: ${err.message}`);
    }
  };

  const selectedVer = selectedCommit ? versionMap.get(selectedCommit.id) || "v1" : "v1";
  const headVer = headCommit ? versionMap.get(headCommit.id) || "v1" : "v1";
  const isViewingDetached = selectedCommit?.id !== ideaData?.active_commit_id;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500 selection:text-white pb-28">
      {/* ========================================================================= */}
      {/* 1. リポジトリヘッダー (Repository Header Navigation) */}
      {/* ========================================================================= */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>The Garage</span>
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center space-x-2">
              <GitBranch className="w-4 h-4 text-purple-400" />
              <h2 className="font-bold text-sm text-slate-100 truncate max-w-xs">
                {ideaData.title}
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded-md">
                HEAD: {headVer}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* 公開/非公開トグル */}
            <button
              onClick={handleTogglePublic}
              disabled={isUpdatingPublic}
              className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                isPublic
                  ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800"
              }`}
              title="投資家向け共有ビューの公開/非公開を切り替え"
            >
              {isPublic ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              <span>{isPublic ? "🌐 公開中" : "🔒 非公開"}</span>
            </button>

            {/* 共有リンクコピー */}
            {isPublic && (
              <>
                <button
                  onClick={handleCopyShareUrl}
                  className="flex items-center space-x-1.5 text-xs px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition cursor-pointer"
                  title="共有用URLをコピー"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Share URL"}</span>
                </button>

                <a
                  href={`/share/${shareToken}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1 text-xs px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30 transition cursor-pointer"
                  title="投資家向けピッチダッシュボードを別タブで開く"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>投資家ビュー</span>
                </a>
              </>
            )}

            {/* 新規ピボット作成ボタン */}
            {selectedCommit && (
              <button
                onClick={() => router.push(`/validate?pivotFrom=${selectedCommit.id}`)}
                className="flex items-center space-x-2 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{selectedVer} からピボット</span>
              </button>
            )}

            {/* 完全削除ボタン */}
            <button
              onClick={handleDeleteRepository}
              className="flex items-center space-x-1.5 text-xs px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 transition cursor-pointer"
              title="このプロジェクトリポジトリを完全削除"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>削除</span>
            </button>
          </div>
        </div>
      </header>

      {/* 過去バージョン閲覧時の Sticky バナー */}
      {isViewingDetached && (
        <DetachedHeadStickyBanner onCheckoutLatest={handleCheckoutLatest} />
      )}

      {/* ========================================================================= */}
      {/* メイン 3ペイン構成 */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* PANE 1: リポジトリ概要カード */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950/40 via-slate-900/70 to-indigo-950/40 border border-slate-800 p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-300 text-xs font-medium">
                <Flame className="w-3.5 h-3.5 text-purple-400" />
                <span>Idea Repository & Version Lineage Control</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-100">
                {ideaData.title}
              </h1>
              <p className="text-xs text-slate-400">
                全 {commits.length} コミットのピボット履歴を管理中。現在の HEAD は{" "}
                <span className="font-mono text-purple-300 font-bold">{headVer}</span> です。
              </p>
            </div>

            <div className="flex items-center space-x-4 bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">HEAD Score</span>
                <span className="text-3xl font-black font-mono text-purple-400">
                  {headCommit?.emotional_score !== null ? headCommit?.emotional_score : "--"}
                </span>
                <span className="text-xs text-slate-500 font-normal"> / 100</span>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Viewing</span>
                <span className="text-sm font-bold text-indigo-300 font-mono">
                  {selectedVer}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PANE 2: 系譜ツリー (Git Lineage Tree) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-base text-slate-100">
                1. Git for Ideas 系譜ツリー (Lineage Branch Tree)
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              ※ ノードをクリックすると下のインスペクターに対象バージョンの詳細が反映されます
            </span>
          </div>

          <IdeaLineageTree
            commits={treeNodes}
            activeCommitId={selectedCommit?.id || ideaData.active_commit_id}
            onSelectCommit={handleSelectNode}
          />
        </div>

        {/* PANE 3: インスペクター (Inspector / Selected Commit Details) */}
        <div className="space-y-6 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-base text-slate-100">
                    2. コミット詳細インスペクター (Inspector)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Target: {selectedVer}
                  </span>
                  {selectedCommit?.id === ideaData.active_commit_id && (
                    <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      HEAD
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  選択中コミットの仮説入力、3xペナルティスコア、AI審査員FB、重力マップ
                </p>
              </div>
            </div>

            {/* 視点切替タブ */}
            {selectedCommit?.status === "completed" && (
              <div className="flex items-center space-x-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setActiveViewTab("crash_report")}
                  className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeViewTab === "crash_report"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>3x Penalty & Autopsy Report</span>
                </button>
                <button
                  onClick={() => setActiveViewTab("gravity_map")}
                  className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeViewTab === "gravity_map"
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>🪐 Market Gravity Topology</span>
                </button>
              </div>
            )}
          </div>

          {/* コミット入力データの要約カード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-slate-900/60 border border-slate-800 rounded-3xl text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block">
                Target & Pain (Q1)
              </span>
              <p className="text-slate-200 font-medium line-clamp-3">
                {selectedCommit?.q1_target_pain || "未定義"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-purple-400 font-bold block">
                Solution (Q2)
              </span>
              <p className="text-slate-200 font-medium line-clamp-3">
                {selectedCommit?.q2_solution || "未定義"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">
                Core Edge (Q3)
              </span>
              <p className="text-slate-200 font-medium line-clamp-3">
                {selectedCommit?.q3_core_edge || "未定義"}
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 状態に応じたインスペクター本体 */}
          {/* ========================================================================= */}

          {/* 1. 検証中 (analyzing / validating) の場合: JobPollingTracker を埋め込み表示 */}
          {selectedCommit &&
            (selectedCommit.status === "analyzing" ||
              selectedCommit.status === "validating" ||
              selectedCommit.status === "pending") && (
              <div className="p-8 bg-slate-900/80 border border-purple-500/30 rounded-3xl space-y-4">
                <div className="text-center space-y-1">
                  <h4 className="text-lg font-bold text-slate-100">
                    AI仮説クラッシュ検証を実行中...
                  </h4>
                  <p className="text-xs text-slate-400">
                    コミット <span className="font-mono text-purple-300 font-bold">{selectedVer}</span> の検証進捗をリアルタイム追跡しています。
                  </p>
                </div>
                <JobPollingTracker
                  jobId={selectedCommit.id}
                  onComplete={() => fetchIdeaRepository()}
                  onError={() => fetchIdeaRepository()}
                  onRetry={() => fetchIdeaRepository()}
                  timeoutSeconds={180}
                />
              </div>
            )}

          {/* 2. 検証完了 (completed / validated) の場合: VS Card Board / Nutrition / AI審査員 / 重力マップ */}
          {selectedCommit &&
            selectedCommit.status === "completed" &&
            activeViewTab === "crash_report" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* 審査会総意の引導バナー (Tribunal Verdict) */}
                <div
                  className={`p-6 rounded-3xl border shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    overallVerdict === "KILL"
                      ? "bg-rose-950/40 border-rose-500/40"
                      : overallVerdict === "PIVOT"
                      ? "bg-amber-950/40 border-amber-500/40"
                      : "bg-emerald-950/40 border-emerald-500/40"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2.5 py-1 text-xs font-mono font-black rounded-lg uppercase tracking-wider ${
                          overallVerdict === "KILL"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : overallVerdict === "PIVOT"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        TRIBUNAL VERDICT: {overallVerdict}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">3名のAI共同創業者・審査会総意</span>
                    </div>
                    <p className="text-sm font-bold text-slate-200 leading-relaxed">
                      {executiveSummaryJa}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center space-x-2">
                    <button
                      onClick={() => router.push(`/validate?pivotFrom=${selectedCommit.id}`)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition cursor-pointer flex items-center space-x-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>このバージョンからピボット</span>
                    </button>
                  </div>
                </div>

                {/* 2カラムレイアウト: VS Card Board & Emotional Nutrition Facts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* 左: VS Card Board & GitHub Autopsy */}
                  <div className="lg:col-span-2 space-y-6">
                    <VSCardBoard
                      ideaTitle={selectedCommit.q2_solution?.slice(0, 35) || "Your Challenger Solution"}
                      competitorName={competitorProfile.incumbentName}
                      competitorTagline={competitorProfile.phDetails?.tagline}
                      elementDiffs={scores?.elementDiffs || {}}
                      overallScore={overallScore || 50}
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {(githubAutopsy.items || []).slice(0, 4).map((repo: any) => {
                          const causeOfDeath =
                            repo.death_cause ||
                            repo.autopsy_reason ||
                            repo.causeOfDeath ||
                            "メンテナンス停止・マネタイズ未達による放棄";
                          const repoName = repo.name || repo.full_name || repo.repo_name;
                          const repoUrl = repo.html_url || repo.url || `https://github.com/${repo.full_name || repo.name}`;
                          const starCount = repo.stargazers_count ?? repo.stars ?? 0;

                          return (
                            <div
                              key={repo.id || repo.full_name || repoName}
                              className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2 hover:border-slate-700 transition flex flex-col justify-between"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <a
                                    href={repoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-bold text-indigo-300 hover:underline flex items-center space-x-1 truncate"
                                  >
                                    <span className="truncate">{repoName}</span>
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                  </a>
                                  <span className="font-mono text-[10px] text-amber-400 shrink-0">★ {starCount}</span>
                                </div>
                                <p className="text-[11px] text-slate-400 line-clamp-2">
                                  {repo.description || "No description provided."}
                                </p>
                              </div>
                              <div className="pt-2 border-t border-slate-800/80">
                                <p className="text-[11px] text-rose-300/90 font-medium leading-relaxed">
                                  💀 <strong className="text-rose-400">死因:</strong> {causeOfDeath}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {(!githubAutopsy.items || githubAutopsy.items.length === 0) && (
                        <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800/60">
                          類似の放棄リポジトリは検出されませんでした（健全な市場空白地帯の可能性があります）。
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 右: 感情の成分表示 */}
                  <div className="lg:col-span-1 flex flex-col items-center">
                    <EmotionalNutritionLabel metrics={nutritionMetrics} overallScore={overallScore || 50} />
                  </div>
                </div>

                {/* 3人の懐疑的ペルソナ審査員フィードバック & ソクラテス式ピボット導線 [指示3] */}
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
                      const critiqueText = p.harsh_critique_ja || p.coreCritique || p.harsh_critique_en || "";
                      const socraticText = p.socratic_question_ja || p.socraticQuestion || p.socratic_question_en || "";
                      const pivotTag = p.pivot_hint_tag_ja || p.pivot_hint_tag_en || "戦略的ピボット";

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
                                  (p.verdict || overallVerdict) === "CRITICAL" || (p.verdict || overallVerdict) === "KILL"
                                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                                    : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                                }`}
                              >
                                {p.verdict || overallVerdict}
                              </span>
                            </div>

                            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-[10px] font-mono">
                              <span className="text-slate-400">Confidence:</span>
                              <div className="flex items-center space-x-1 text-amber-400">
                                <Star className="w-3 h-3 fill-amber-400" />
                                <span>{confidence} ({sourcesCount} sources)</span>
                              </div>
                            </div>

                            <p className="text-xs text-slate-300 italic leading-relaxed">
                              "{critiqueText}"
                            </p>
                          </div>

                          {/* ソクラテス式ピボットCTA [指示3] */}
                          <div className="space-y-2 pt-3 border-t border-slate-800/80">
                            {socraticText && (
                              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-xs space-y-2">
                                <div className="flex items-center space-x-1.5 text-purple-300 font-bold text-[10px] uppercase tracking-wider">
                                  <Lightbulb className="w-3.5 h-3.5 text-purple-400" />
                                  <span>Socratic Challenge</span>
                                </div>
                                <p className="text-[11px] text-purple-200 italic leading-relaxed">
                                  "{socraticText}"
                                </p>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const q = encodeURIComponent(socraticText);
                                    const tag = encodeURIComponent(pivotTag);
                                    router.push(
                                      `/validate?pivotFrom=${selectedCommit.id}&focus=${p.personaKey || 'persona'}&socraticQuestion=${q}&pivotTag=${tag}`
                                    );
                                  }}
                                  className="w-full mt-2 py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                  <span className="truncate">💡 "{pivotTag}" を軸にピボットする</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          {/* 3. 重力マップタブ */}
          {selectedCommit &&
            selectedCommit.status === "completed" &&
            activeViewTab === "gravity_map" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-bold text-amber-300">
                      <span className="text-base">🪐</span>
                      <span>Custom Planet Synthetic Gravity Placement</span>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg font-mono text-[10px]">
                      Target Sector: {targetGenreName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    選択中コミット（{selectedVer}）が、標的市場（{targetGenreName}）の重力場上に「<strong className="text-amber-300">🪐 Custom Planet</strong>」として自動合成配置されています。
                  </p>
                </div>

                <GravityMapVisualizer
                  data={gravityMapData}
                  customPlanet={customPlanet}
                  width={1100}
                  height={620}
                />
              </div>
            )}

          {/* 4. DRAFT 状態の場合: ウィザードで検証を開始する導線 */}
          {selectedCommit && selectedCommit.status === "draft" && (
            <div className="p-8 bg-slate-900/80 border border-slate-800 rounded-3xl text-center space-y-4">
              <h4 className="text-lg font-bold text-slate-100">
                このバージョン（{selectedVer}）はまだ検証されていません
              </h4>
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                ウィザードを開いてターゲット・ソリューション・エッジの入力を完成させ、仮説クラッシュ検証を実行してください。
              </p>
              <button
                onClick={() => router.push(`/validate?pivotFrom=${selectedCommit.id}`)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition inline-flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>ウィザードで入力を完了して検証を実行</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function IdeaRepositoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono text-sm">
          <span>Loading Idea Repository...</span>
        </div>
      }
    >
      <IdeaRepositoryContent />
    </Suspense>
  );
}
