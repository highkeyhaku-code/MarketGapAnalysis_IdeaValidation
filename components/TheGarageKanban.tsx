"use client";

import React, { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  GitBranch,
  Flame,
  CheckCircle2,
  Clock,
  Archive,
  Plus,
  RotateCcw,
  ExternalLink,
  AlertTriangle,
  Loader2,
  X,
  FileText,
  Trash2,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { IdeaWizard } from "./IdeaWizard";
import { IdeaInput, PhysicalElement } from "../schemas/zod";
import { computeCommitTreeVersions } from "../lib/versioning";
import { AuthWallModal } from "./AuthWallModal";
import { GuestMigrationModal } from "./GuestMigrationModal";
import { PricingModal } from "./PricingModal";
import { useUserSession } from "../hooks/useUserSession";
import { upsertDraftToGuestSession } from "../lib/guestSession";
import { isPortfolioMode } from "../lib/portfolio";

export type KanbanColumnId = "DRAFT" | "DISCOVERED" | "VALIDATING" | "VALIDATED" | "ARCHIVED";

export interface KanbanCardItem {
  id: string;
  commitId: string;
  ideaId: string;
  title: string;
  targetPain: string;
  solution: string;
  coreEdge: string;
  score?: number | null;
  version: string;
  totalCommitsCount: number;
  badgeText: string;
  columnId: KanbanColumnId;
  createdAt: string;
  jobId?: string;
  parentCommitId?: string | null;
  isLocalDraft?: boolean;
}

const COLUMN_CONFIG: Record<
  KanbanColumnId,
  { label: string; icon: React.ElementType; color: string; bg: string; borderColor: string }
> = {
  DRAFT: {
    label: "DRAFT (下書き)",
    icon: FileText,
    color: "text-slate-400",
    bg: "bg-slate-900/50",
    borderColor: "border-slate-800",
  },
  DISCOVERED: {
    label: "DISCOVERED (市場調査済)",
    icon: Sparkles,
    color: "text-indigo-400",
    bg: "bg-indigo-950/20",
    borderColor: "border-indigo-500/30",
  },
  VALIDATING: {
    label: "VALIDATING (検証中)",
    icon: Clock,
    color: "text-purple-400",
    bg: "bg-purple-950/20",
    borderColor: "border-purple-500/30",
  },
  VALIDATED: {
    label: "VALIDATED (検証完了)",
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-950/20",
    borderColor: "border-emerald-500/30",
  },
  ARCHIVED: {
    label: "ARCHIVED (死骸・保管)",
    icon: Archive,
    color: "text-slate-500",
    bg: "bg-slate-950/60",
    borderColor: "border-slate-800/80",
  },
};

export function TheGarageKanban() {
  const router = useRouter();
  const [cards, setCards] = useState<KanbanCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "info" | "success" | "warning" } | null>(null);
  const [editingCardForWizard, setEditingCardForWizard] = useState<KanbanCardItem | null>(null);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);

  // プログレッシブサインアップ & セッション管理
  const {
    user,
    isGuest,
    guestSession,
    showAuthWall,
    showMigrationModal,
    openAuthWall,
    closeAuthWall,
    handleMigrationCompleted,
    handleMigrationDiscarded,
  } = useUserSession();

  const showToast = (text: string, type: "info" | "success" | "warning" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. アイデア・コミット一覧フェッチ (未ログイン時はローカルゲストセッションのみ、ログイン時は自ユーザーのDBデータ)
  useEffect(() => {
    const fetchIdeasFromDb = async () => {
      try {
        setLoading(true);

        // 未ログイン (ゲスト) の場合: サーバーのDBはフェッチせず、LocalStorageのゲストドラフトのみを表示
        if (isGuest) {
          const guestDrafts = guestSession?.draftIdeas || [];
          const localCards: KanbanCardItem[] = guestDrafts.map((draft: any) => ({
            id: draft.id,
            commitId: draft.id,
            ideaId: draft.id,
            title: draft.title || "ドラフト仮説",
            targetPain: draft.ideaInput.q1_target_pain,
            solution: draft.ideaInput.q2_solution,
            coreEdge: draft.ideaInput.q3_core_edge,
            score: null,
            version: "v1 (Local Draft)",
            totalCommitsCount: 1,
            badgeText: "v1 (Local 48h TTL)",
            columnId: "DRAFT",
            createdAt: draft.createdAt,
            isLocalDraft: true,
          }));

          setCards(localCards);
          return;
        }

        // ログイン済みの場合: 自ユーザーIDで絞り込んでフェッチ
        const url = user?.id ? `/api/ideas?userId=${encodeURIComponent(user.id)}` : "/api/ideas";
        const res = await fetch(url);
        const json = await res.json();
        if (json.success && Array.isArray(json.ideas)) {
          const loadedCards: KanbanCardItem[] = [];

          json.ideas.forEach((idea: any) => {
            const commits = idea.idea_commits || [];
            if (commits.length === 0) return;

            // バージョン採番ツリーを計算
            const versionMap = computeCommitTreeVersions(commits, idea.active_commit_id);

            // ideas.active_commit_id が指し示す HEAD コミットを取得（未設定時は最新コミットにフォールバック）
            let headCommit = idea.active_commit_id
              ? commits.find((c: any) => c.id === idea.active_commit_id)
              : null;
            if (!headCommit) {
              headCommit = commits[commits.length - 1];
            }

            const headVersion = versionMap.get(headCommit.id) || "v1";
            const badgeText = `${headVersion} (Total ${commits.length} commit${commits.length > 1 ? "s" : ""})`;

            let columnId: KanbanColumnId = "DRAFT";

            if (headCommit.status === "completed" || headCommit.status === "validated") {
              columnId = "VALIDATED";
            } else if (headCommit.status === "analyzing") {
              columnId = "VALIDATING";
            } else if (headCommit.status === "archived") {
              columnId = "ARCHIVED";
            } else if (
              headCommit.q1_target_pain &&
              headCommit.q1_target_pain.length >= 30 &&
              !headCommit.q1_target_pain.startsWith("未定義")
            ) {
              columnId = "DISCOVERED";
            }

            loadedCards.push({
              id: idea.id,
              commitId: headCommit.id,
              ideaId: idea.id,
              title: idea.title,
              targetPain: headCommit.q1_target_pain || "ペイン未設定",
              solution: headCommit.q2_solution || "ソリューション未設定",
              coreEdge: headCommit.q3_core_edge || "優位性未設定",
              score: headCommit.emotional_score,
              version: headVersion,
              totalCommitsCount: commits.length,
              badgeText,
              columnId,
              createdAt: idea.created_at,
              jobId: headCommit.job_id,
              parentCommitId: headCommit.parent_commit_id,
            });
          });

          setCards(loadedCards);
        }
      } catch (err) {
        console.error("Failed to fetch ideas:", err);
        showToast("仮説データの取得に失敗しました", "warning");
      } finally {
        setLoading(false);
      }
    };

    fetchIdeasFromDb();
  }, [isGuest, guestSession, user?.id]);

  // ドラッグ＆ドロップ終了時のハンドラ
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const sourceCol = source.droppableId as KanbanColumnId;
    const destCol = destination.droppableId as KanbanColumnId;
    const card = cards.find((c) => c.id === draggableId);

    if (!card) return;

    // [ケース 1]: DRAFT -> DISCOVERED (入力バリデーションチェック)
    if (sourceCol === "DRAFT" && destCol === "DISCOVERED") {
      const isQ1Valid = card.targetPain.trim().length >= 30 && !card.targetPain.startsWith("未定義");
      const isQ2Valid = card.solution.trim().length >= 30 && !card.solution.startsWith("未定義");

      if (!isQ1Valid || !isQ2Valid) {
        showToast("⚠️ Q1/Q2の文字数が30文字未満です。ウィザードで思考を深めてください。", "warning");
        setEditingCardForWizard(card);
        return; // リバート
      }
    }

    // [ケース 2]: DISCOVERED -> VALIDATING (Inngest 検証ジョブ起動)
    if (sourceCol === "DISCOVERED" && destCol === "VALIDATING") {
      if (!isPortfolioMode() && isGuest) {
        openAuthWall();
        showToast("🔒 検証ジョブの実行にはアカウント連携が必要です", "warning");
        return;
      }
      showToast(`🚀 [${card.title}] の仮説クラッシュジョブを起動しました...`, "info");
      
      let createdJobId: string | undefined;
      let createdCommitId: string | undefined;
      let createdIdeaId: string | undefined;

      try {
        const res = await fetch("/api/ideas/commit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ideaInput: {
              q1_target_pain: card.targetPain,
              q2_solution: card.solution,
              q3_core_edge: card.coreEdge,
              q4_target_literacy: "intermediate",
              q4_monetization_model: "subscription",
              q4_supplementary_pains: [],
            },
            ideaId: card.isLocalDraft ? null : card.ideaId,
            parentCommitId: card.isLocalDraft ? null : (card.commitId || null),
            domain: "B2B_SME",
          }),
        });
        const json = await res.json();
        if (json.success) {
          createdJobId = json.jobId;
          createdCommitId = json.commitId;
          createdIdeaId = json.ideaId;
          showToast(`⚡ 検証中: Inngest Job #${json.jobId.slice(0, 8)} 進行中`, "success");
        }
      } catch (err) {
        console.warn("Failed to trigger validation job:", err);
      }

      // 状態を更新して終了
      setCards((prev) =>
        prev.map((c) => {
          if (c.id === draggableId) {
            return {
              ...c,
              columnId: destCol,
              jobId: createdJobId || c.jobId,
              commitId: createdCommitId || c.commitId,
              ideaId: createdIdeaId || c.ideaId,
              isLocalDraft: createdIdeaId ? false : c.isLocalDraft,
            };
          }
          return c;
        })
      );
      return;
    }

    // [ケース 3]: VALIDATING -> DRAFT or ARCHIVED (実行中ジョブのキャンセル)
    if (sourceCol === "VALIDATING" && (destCol === "DRAFT" || destCol === "ARCHIVED")) {
      if (card.jobId) {
        fetch("/api/job/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: card.jobId }),
        }).catch((err) => console.warn("Job cancel error:", err));
      }
      showToast(`🛑 [${card.title}] の検証ジョブを中断・キャンセルしました。`, "warning");
    }

    // カートの配列を更新
    setCards((prev) => {
      const updated = prev.map((c) => {
        if (c.id === draggableId) {
          return {
            ...c,
            columnId: destCol,
          };
        }
        return c;
      });
      return updated;
    });
  };

  // 新規ドラフトカード追加 (本番 DB に INSERT して正規 UUID を取得)
  const handleAddNewDraft = async () => {
    try {
      setIsCreatingDraft(true);

      if (isGuest) {
        const localId = crypto.randomUUID();
        const newCard: KanbanCardItem = {
          id: localId,
          commitId: localId,
          ideaId: localId,
          title: "新規仮説ドラフト (ローカル)",
          targetPain: "未定義のターゲットペイン（ウィザードで入力してください）",
          solution: "未定義のソリューション（ウィザードで入力してください）",
          coreEdge: "未定義のコア優位性（ウィザードで入力してください）",
          version: "v1 (Local)",
          totalCommitsCount: 1,
          badgeText: "v1 (Local 48h TTL)",
          columnId: "DRAFT",
          createdAt: new Date().toISOString(),
          isLocalDraft: true,
        };

        upsertDraftToGuestSession({
          id: localId,
          title: newCard.title,
          domain: "B2B_SME",
          ideaInput: {
            q1_target_pain: newCard.targetPain,
            q2_solution: newCard.solution,
            q3_core_edge: newCard.coreEdge,
            q4_target_literacy: "intermediate",
            q4_monetization_model: "subscription",
            q4_supplementary_pains: [],
          },
          keywords: [],
        });

        setCards((prev) => [newCard, ...prev]);
        setEditingCardForWizard(newCard);
        showToast("💾 ローカルに下書きを作成しました (48時間保存)", "info");
        return;
      }

      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "新規仮説ドラフト",
        }),
      });
      const json = await res.json();

      if (json.success && json.commit && json.idea) {
        const newCard: KanbanCardItem = {
          id: json.idea.id,
          commitId: json.commit.id,
          ideaId: json.idea.id,
          title: json.idea.title,
          targetPain: json.commit.q1_target_pain,
          solution: json.commit.q2_solution,
          coreEdge: json.commit.q3_core_edge,
          version: "v1",
          totalCommitsCount: 1,
          badgeText: "v1 (Total 1 commit)",
          columnId: "DRAFT",
          createdAt: new Date().toLocaleDateString(),
        };

        setCards((prev) => [newCard, ...prev]);
        setEditingCardForWizard(newCard);
        showToast("✨ 新規ドラフトを作成しました。ウィザードで詳細を入力してください。", "info");
      } else {
        alert(`Failed to create draft in database: ${json.error || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`Network error creating draft: ${err.message}`);
    } finally {
      setIsCreatingDraft(false);
    }
  };

  // プロジェクト完全削除 (Hard Delete)
  const handleDeleteIdea = async (ideaId: string, cardTitle: string) => {
    const confirmed = window.confirm(
      `【確認】プロジェクト「${cardTitle}」と全バージョン履歴を完全に削除してよろしいですか？\nこの操作は取り消せません。`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/ideas/${ideaId}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (json.success) {
        setCards((prev) => prev.filter((c) => c.ideaId !== ideaId && c.id !== ideaId));
        showToast(`🗑️ プロジェクト「${cardTitle}」を完全に削除しました。`, "success");
      } else {
        alert(`削除に失敗しました: ${json.error || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`ネットワークエラーにより削除できませんでした: ${err.message}`);
    }
  };

  // ウィザード完了時の反映 (即時コミット作成 & 検証画面へシームレス遷移)
  const handleWizardComplete = async (
    data: IdeaInput & {
      detectedElements?: PhysicalElement[];
      visibilityFlags?: any;
    }
  ) => {
    if (!editingCardForWizard) return;
    try {
      showToast("🚀 アイデアコミットを作成し、仮説クラッシュ検証を開始します...", "info");
      
      const isLocal = Boolean(editingCardForWizard.isLocalDraft);

      const res = await fetch("/api/ideas/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaInput: {
            q1_target_pain: data.q1_target_pain,
            q2_solution: data.q2_solution,
            q3_core_edge: data.q3_core_edge,
            q4_target_literacy: data.q4_target_literacy || "intermediate",
            q4_monetization_model: data.q4_monetization_model || "subscription",
            q4_supplementary_pains: data.q4_supplementary_pains || [],
          },
          ideaId: isLocal ? null : editingCardForWizard.ideaId,
          parentCommitId: isLocal ? null : (editingCardForWizard.commitId || null),
          visibilityFlags: data.visibilityFlags,
          domain: "B2B_SME",
        }),
      });

      const json = await res.json();
      if (json.success && json.commitId) {
        const targetIdeaId = json.ideaId || editingCardForWizard.ideaId;
        const jobQuery = json.jobId ? `&jobId=${encodeURIComponent(json.jobId)}` : "";
        setEditingCardForWizard(null);
        showToast("⚡ 検証ジョブが正常にキックされました。リポジトリ詳細へ遷移します...", "success");
        // リポジトリ詳細画面へ即時ルーティング
        router.push(`/ideas/${targetIdeaId}?commitId=${json.commitId}${jobQuery}`);
      } else {
        alert(`Failed to start validation: ${json.error || "Unknown error"}`);
      }
    } catch (err: any) {
      console.error("Failed to commit and validate from Kanban wizard:", err);
      alert(`Network error starting validation: ${err.message}`);
    }
  };

  const columns: KanbanColumnId[] = ["DRAFT", "DISCOVERED", "VALIDATING", "VALIDATED", "ARCHIVED"];

  return (
    <div className="w-full space-y-6 font-sans">
      {/* カンバン操作バー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-100 flex items-center space-x-2">
            <span>The Garage Kanban Pipeline</span>
            <span className="px-2 py-0.5 text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-md">
              Lifecycle
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            仮説カードをドラッグ＆ドロップして、探索・検証・アーカイブのライフサイクルを操作します。
          </p>
        </div>

        <button
          disabled={isCreatingDraft}
          onClick={handleAddNewDraft}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
        >
          {isCreatingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          <span>{isCreatingDraft ? "Creating..." : "New Hypothesis Draft"}</span>
        </button>
      </div>

      {/* 未ログイン時のローカル隔離表示バッジ (データ安全性の視覚的担保) */}
      {isGuest && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-amber-950/30 border border-amber-500/40 rounded-2xl text-xs text-amber-200 gap-3">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-amber-300">
                  {isPortfolioMode()
                    ? "ポートフォリオ・デモモード（完全ゲスト動作中）"
                    : "ローカル保存データ（ゲストセッション: 48時間限定）"}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {isPortfolioMode() ? "Demo Portfolio" : "隔離保護中"}
                </span>
              </div>
              <p className="text-slate-400 text-[11px]">
                {isPortfolioMode()
                  ? "お使いのブラウザ内（LocalStorage）に安全に保持されます。ログイン不要で極限検証や探索など全機能を無制限に体験いただけます。"
                  : "お使いのブラウザ内（LocalStorage）のみに安全に保持されています。他人のデータが表示されることは一切ありません。"}
              </p>
            </div>
          </div>
          {!isPortfolioMode() && (
            <button
              onClick={openAuthWall}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition cursor-pointer shrink-0"
            >
              ログインしてクラウド永続化
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 font-mono flex items-center justify-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Loading ideas from database...</span>
        </div>
      ) : (
        /* カンバンボードコンテナ */
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {columns.map((colId) => {
              const col = COLUMN_CONFIG[colId];
              const colCards = cards.filter((c) => c.columnId === colId);
              const Icon = col.icon;

              return (
                <div
                  key={colId}
                  className={`flex flex-col rounded-2xl border ${col.borderColor} ${col.bg} p-4 min-h-[480px] shadow-lg`}
                >
                  {/* カラムヘッダー */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                    <div className="flex items-center space-x-2">
                      <Icon className={`w-4 h-4 ${col.color}`} />
                      <span className="font-bold text-xs text-slate-200">{col.label}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-900 text-slate-400 text-[10px] font-mono rounded-md border border-slate-800">
                      {colCards.length}
                    </span>
                  </div>

                  {/* Droppable エリア */}
                  <Droppable droppableId={colId}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 space-y-3 transition rounded-xl p-1 ${
                          snapshot.isDraggingOver ? "bg-indigo-500/5 ring-2 ring-indigo-500/30" : ""
                        }`}
                      >
                        {colCards.length === 0 && (
                          <div className="py-12 text-center text-[11px] text-slate-500 font-mono select-none">
                            No cards in {colId}
                          </div>
                        )}

                        {colCards.map((card, index) => (
                          <Draggable key={card.id} draggableId={card.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                onClick={() => router.push(`/ideas/${card.ideaId}`)}
                                className={`p-4 rounded-2xl bg-slate-900 border transition shadow-md select-none group relative cursor-pointer ${
                                  dragSnapshot.isDragging
                                    ? "border-indigo-500 shadow-2xl scale-105 rotate-1 bg-slate-850 z-50"
                                    : "border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850"
                                }`}
                              >
                                {/* カードヘッダー */}
                                <div className="flex items-center justify-between text-xs mb-2 gap-1.5">
                                  <div className="flex items-center space-x-1.5 overflow-hidden">
                                    <span
                                      className="flex items-center space-x-1 px-2 py-0.5 bg-slate-950 font-mono text-[10px] text-indigo-300 rounded-md border border-slate-800 shadow-inner truncate"
                                      title={`HEAD: ${card.version}, Total Commits: ${card.totalCommitsCount}`}
                                    >
                                      <GitBranch className="w-3 h-3 text-indigo-400 shrink-0" />
                                      <span className="font-bold truncate">{card.badgeText || card.version}</span>
                                    </span>
                                  </div>
                                  {card.score !== null && card.score !== undefined && (
                                    <span
                                      className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                                        card.score >= 60
                                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                                          : "bg-rose-500/10 text-rose-300 border border-rose-500/30"
                                      }`}
                                    >
                                      Score: {card.score}
                                    </span>
                                  )}
                                </div>

                                {/* タイトル & ペイン */}
                                <h4 className="font-bold text-sm text-slate-100 line-clamp-1 mb-1 group-hover:text-indigo-300 transition">
                                  {card.title}
                                </h4>
                                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                  {card.targetPain}
                                </p>

                                {/* アクションバー */}
                                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400" onClick={(e) => e.stopPropagation()}>
                                  <span className="font-mono text-[10px] text-slate-500">{card.createdAt}</span>

                                  <div className="flex items-center space-x-1.5">
                                    {/* リポジトリ詳細・検証結果リンク */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/ideas/${card.ideaId}`);
                                      }}
                                      className="p-1 hover:text-indigo-300 hover:bg-slate-800 rounded-md transition"
                                      title="アイデア詳細 (Repository View) を開く"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </button>

                                    {/* ピボットボタン */}
                                    {card.commitId && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          router.push(`/validate?pivotFrom=${card.commitId}`);
                                        }}
                                        className="p-1 hover:text-purple-300 hover:bg-slate-800 rounded-md transition"
                                        title="このコミットからピボット"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    {/* 編集ボタン */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingCardForWizard(card);
                                      }}
                                      className="p-1 hover:text-slate-200 hover:bg-slate-800 rounded-md transition"
                                      title="ウィザードで編集"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                    </button>

                                    {/* 削除ボタン */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteIdea(card.ideaId, card.title);
                                      }}
                                      className="p-1 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition"
                                      title="プロジェクトを完全に削除"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* ウィザードモーダル */}
      {editingCardForWizard && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm text-slate-100">
                  仮説の詳細定義ウィザード: {editingCardForWizard.title}
                </h3>
              </div>
              <button
                onClick={() => setEditingCardForWizard(null)}
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <IdeaWizard
              initialValues={{
                q1_target_pain: editingCardForWizard.targetPain.startsWith("未定義") ? "" : editingCardForWizard.targetPain,
                q2_solution: editingCardForWizard.solution.startsWith("未定義") ? "" : editingCardForWizard.solution,
                q3_core_edge: editingCardForWizard.coreEdge.startsWith("未定義") ? "" : editingCardForWizard.coreEdge,
              }}
              onSubmit={handleWizardComplete}
            />
          </div>
        </div>
      )}

      {/* ライブトースト通知 */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-in slide-in-from-bottom-5 duration-300">
          <div
            className={`p-4 rounded-2xl shadow-2xl border text-xs font-sans flex items-center space-x-3 ${
              toastMessage.type === "warning"
                ? "bg-amber-950/90 border-amber-500/40 text-amber-200"
                : toastMessage.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-200"
                : "bg-slate-900/95 border-indigo-500/40 text-slate-100"
            }`}
          >
            {toastMessage.type === "warning" ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : toastMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            )}
            <span className="flex-1">{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AUTH WALL & GUEST MIGRATION MODALS */}
      {/* ========================================================================= */}
      <AuthWallModal
        isOpen={showAuthWall}
        onClose={closeAuthWall}
        title="アカウント連携でカンバンを永続化する"
        description="作成したドラフト仮説を保存し、チームや投資家と共有するにはログインが必要です。"
      />

      <GuestMigrationModal
        isOpen={showMigrationModal}
        userEmail={user?.email}
        onMigrated={(count) => {
          handleMigrationCompleted(count);
          showToast(`${count}件の仮説をアカウントに引き継ぎました！`, "success");
          window.location.reload();
        }}
        onDiscarded={handleMigrationDiscarded}
      />

      {/* プラン選択 & 追加クレジット購入モーダル */}
      <PricingModal />
    </div>
  );
}
