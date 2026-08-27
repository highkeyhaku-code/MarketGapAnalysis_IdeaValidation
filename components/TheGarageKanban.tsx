"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { IdeaWizard } from "./IdeaWizard";
import { IdeaInput, PhysicalElement } from "../schemas/zod";

export type KanbanColumnId = "DRAFT" | "DISCOVERED" | "VALIDATING" | "VALIDATED" | "ARCHIVED";

export interface KanbanCardItem {
  id: string;
  commitId?: string;
  ideaId?: string;
  title: string;
  targetPain: string;
  solution: string;
  coreEdge: string;
  score?: number | null;
  version: string;
  columnId: KanbanColumnId;
  createdAt: string;
  jobId?: string;
  parentCommitId?: string | null;
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

const INITIAL_CARDS: KanbanCardItem[] = [
  {
    id: "card-1",
    commitId: "c-101",
    ideaId: "idea-1",
    title: "0-Config CRM Sync AI",
    targetPain: "営業担当者がCRM入力に追われ、リード入力の形骸化と情報欠落が多発している。",
    solution: "商談音声をリアルタイム解析し、議事録要約・CRM項目を0クリックで全自動同期する。",
    coreEdge: "0-config双方向同期で導入コストと学習コストをゼロにする。",
    score: 78,
    version: "v1.2",
    columnId: "VALIDATED",
    createdAt: "2026-08-27",
  },
  {
    id: "card-2",
    commitId: "c-102",
    ideaId: "idea-2",
    title: "AI Video Fast Clipper",
    targetPain: "長尺動画の切り抜きと字幕配置に編集者が1本3時間かけている。",
    solution: "バイラルスコアの高い瞬間を自動抽出し、縦型9:16動画を1クリックで量産する。",
    coreEdge: "高速レンダリングとソーシャルバイラル予測モデル。",
    score: 42,
    version: "v1.0",
    columnId: "DISCOVERED",
    createdAt: "2026-08-26",
  },
  {
    id: "card-3",
    commitId: "c-103",
    ideaId: "idea-3",
    title: "Micro-SaaS Billing Engine",
    targetPain: "Stripeの設定と税率計算が複雑で、個人の開発者が海外販売を躊躇している。",
    solution: "1行のSDK導入でグローバルMoR（販売業者代理）決済とインボイス発行を完結する。",
    coreEdge: "ゼロ開発・1分で決済開始できる超低導入コスト。",
    score: null,
    version: "v0.1",
    columnId: "DRAFT",
    createdAt: "2026-08-27",
  },
];

export function TheGarageKanban() {
  const router = useRouter();
  const [cards, setCards] = useState<KanbanCardItem[]>(INITIAL_CARDS);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "info" | "success" | "warning" } | null>(null);
  const [editingCardForWizard, setEditingCardForWizard] = useState<KanbanCardItem | null>(null);

  const showToast = (text: string, type: "info" | "success" | "warning" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ドラッグ＆ドロップ終了時のハンドラ
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const sourceCol = source.droppableId as KanbanColumnId;
    const destCol = destination.droppableId as KanbanColumnId;
    const card = cards.find((c) => c.id === draggableId);

    if (!card) return;

    // 1-2. イベントハンドラ分岐

    // [ケース 1]: DRAFT -> DISCOVERED (入力バリデーションチェック)
    if (sourceCol === "DRAFT" && destCol === "DISCOVERED") {
      const isQ1Valid = card.targetPain.trim().length >= 30;
      const isQ2Valid = card.solution.trim().length >= 30;

      if (!isQ1Valid || !isQ2Valid) {
        showToast("⚠️ Q1/Q2の文字数が30文字未満です。ウィザードで思考を深めてください。", "warning");
        setEditingCardForWizard(card);
        return; // リバート (状態変更しない)
      }
    }

    // [ケース 2]: DISCOVERED -> VALIDATING (Inngest 検証ジョブ起動)
    if (sourceCol === "DISCOVERED" && destCol === "VALIDATING") {
      showToast(`🚀 [${card.title}] の仮説クラッシュジョブを起動しました...`, "info");
      
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
            domain: "B2B_SME",
          }),
        });
        const json = await res.json();
        if (json.success) {
          card.jobId = json.jobId;
          card.commitId = json.commitId;
          showToast(`⚡ 検証中: Inngest Job #${json.jobId.slice(0, 8)} 進行中`, "success");
        }
      } catch (err) {
        console.warn("Failed to trigger validation job:", err);
      }
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

  // 新規ドラフトカード追加
  const handleAddNewDraft = () => {
    const newCard: KanbanCardItem = {
      id: `card-${Date.now()}`,
      title: "新規仮説ドラフト",
      targetPain: "未定義のペイン...",
      solution: "未定義のソリューション...",
      coreEdge: "未定義のコア優位性...",
      version: "v0.1",
      columnId: "DRAFT",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setCards((prev) => [newCard, ...prev]);
    setEditingCardForWizard(newCard);
  };

  // ウィザード完了時の反映
  const handleWizardComplete = (data: IdeaInput & { detectedElements?: PhysicalElement[] }) => {
    if (!editingCardForWizard) return;
    setCards((prev) =>
      prev.map((c) => {
        if (c.id === editingCardForWizard.id) {
          return {
            ...c,
            title: data.q1_target_pain.slice(0, 30) + "...",
            targetPain: data.q1_target_pain,
            solution: data.q2_solution,
            coreEdge: data.q3_core_edge,
            columnId: "DISCOVERED", // バリデーション完了で DISCOVERED に昇格
          };
        }
        return c;
      })
    );
    setEditingCardForWizard(null);
    showToast("✨ ウィザード入力を保存し、DISCOVERED カラムへ移動しました！", "success");
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
          onClick={handleAddNewDraft}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Hypothesis Draft</span>
        </button>
      </div>

      {/* カンバンボードコンテナ */}
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
                      {colCards.map((card, index) => (
                        <Draggable key={card.id} draggableId={card.id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={`p-4 rounded-2xl bg-slate-900 border transition shadow-md select-none group relative ${
                                dragSnapshot.isDragging
                                  ? "border-indigo-500 shadow-2xl scale-105 rotate-1 bg-slate-850 z-50"
                                  : "border-slate-800 hover:border-slate-700 hover:bg-slate-850"
                              }`}
                            >
                              {/* カードヘッダー */}
                              <div className="flex items-center justify-between text-xs mb-2">
                                <span className="px-2 py-0.5 bg-slate-950 font-mono text-[10px] text-indigo-400 rounded-md border border-slate-800">
                                  {card.version}
                                </span>
                                {card.score !== null && card.score !== undefined && (
                                  <span
                                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md ${
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
                              <h4 className="font-bold text-sm text-slate-100 line-clamp-1 mb-1">
                                {card.title}
                              </h4>
                              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                {card.targetPain}
                              </p>

                              {/* アクションバー */}
                              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                                <span className="font-mono text-[10px] text-slate-500">{card.createdAt}</span>

                                <div className="flex items-center space-x-1.5">
                                  {/* 検証結果リンク */}
                                  {card.commitId && (
                                    <button
                                      type="button"
                                      onClick={() => router.push(`/validate/${card.commitId}/result`)}
                                      className="p-1 hover:text-indigo-300 hover:bg-slate-800 rounded-md transition"
                                      title="検証結果を開く"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* ピボットボタン */}
                                  {card.commitId && (
                                    <button
                                      type="button"
                                      onClick={() => router.push(`/validate?pivotFrom=${card.commitId}`)}
                                      className="p-1 hover:text-purple-300 hover:bg-slate-800 rounded-md transition"
                                      title="このコミットからピボット"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* 編集ボタン */}
                                  <button
                                    type="button"
                                    onClick={() => setEditingCardForWizard(card)}
                                    className="p-1 hover:text-slate-200 hover:bg-slate-800 rounded-md transition"
                                    title="ウィザードで編集"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
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

      {/* ウィザードモーダル (未入力リバート時や編集時) */}
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
                q1_target_pain: editingCardForWizard.targetPain,
                q2_solution: editingCardForWizard.solution,
                q3_core_edge: editingCardForWizard.coreEdge,
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
    </div>
  );
}
