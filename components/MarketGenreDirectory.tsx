"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Compass,
  Search,
  Flame,
  Skull,
  Layers,
  Sparkles,
  ArrowRight,
  Loader2,
  Filter,
  CheckCircle2,
  FolderTree,
  AlertTriangle,
  RotateCcw,
  Zap,
} from "lucide-react";
import { computeMarketTags } from "../lib/marketTags";

export interface GenreItem {
  id: string;
  level: number;
  parent_id: string | null;
  canonical_name: string;
  description: string | null;
  status: "active" | "stagnant" | "deprecated";
  subgenres?: GenreItem[];
}

export interface MarketGenreDirectoryProps {
  onSelectGenre: (genreName: string, genreId?: string) => void;
  selectedGenreName?: string;
  isAnalyzing?: boolean;
}

const L1_ICONS: Record<string, string> = {
  "プロジェクト管理・業務自動化": "📋",
  "営業・CRM・GTM": "💼",
  "開発者ツール・AIインフラ": "🛠️",
  "デザイン・クリエイティブ・メディア": "🎨",
};

export function MarketGenreDirectory({
  onSelectGenre,
  selectedGenreName,
  isAnalyzing = false,
}: MarketGenreDirectoryProps) {
  const [hierarchicalGenres, setHierarchicalGenres] = useState<GenreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedL1Id, setSelectedL1Id] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "stagnant">("all");
  const [fetchError, setFetchError] = useState<string | null>(null);

  // 1. DBから市場辞書 (genres) をフェッチ
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        setLoading(true);
        setFetchError(null);
        const res = await fetch("/api/genres");
        const data = await res.json();
        if (data.success && Array.isArray(data.hierarchical)) {
          setHierarchicalGenres(data.hierarchical);
        } else {
          setFetchError(data.error || "Failed to load market taxonomy");
        }
      } catch (err: any) {
        console.error("Failed to load genres:", err);
        setFetchError(err.message || "Network error loading genres");
      } finally {
        setLoading(false);
      }
    };

    fetchGenres();
  }, []);

  // 2. フィルタリングロジック
  const filteredGenres = useMemo(() => {
    let l1List = hierarchicalGenres;

    if (selectedL1Id !== "all") {
      l1List = l1List.filter((l1) => l1.id === selectedL1Id);
    }

    return l1List
      .map((l1) => {
        let subs = l1.subgenres || [];

        // ステータス絞り込み
        if (statusFilter !== "all") {
          subs = subs.filter((s) => s.status === statusFilter);
        }

        // 検索クエリ絞り込み
        if (searchQuery.trim().length > 0) {
          const q = searchQuery.toLowerCase();
          const l1Matches = l1.canonical_name.toLowerCase().includes(q) || (l1.description && l1.description.toLowerCase().includes(q));
          
          if (!l1Matches) {
            subs = subs.filter(
              (s) =>
                s.canonical_name.toLowerCase().includes(q) ||
                (s.description && s.description.toLowerCase().includes(q))
            );
          }
        }

        return {
          ...l1,
          subgenres: subs,
        };
      })
      .filter((l1) => (l1.subgenres && l1.subgenres.length > 0) || searchQuery.length > 0);
  }, [hierarchicalGenres, selectedL1Id, statusFilter, searchQuery]);

  const totalL2Count = useMemo(() => {
    return filteredGenres.reduce((acc, l1) => acc + (l1.subgenres?.length || 0), 0);
  }, [filteredGenres]);

  return (
    <div className="w-full space-y-6 font-sans">
      {/* ディレクトリヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 text-xs font-semibold mb-2">
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            <span>Serendipity Seeker: 市場ジャンル辞書 (Taxonomy)</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-100 flex items-center space-x-2">
            <span>市場の穴ディレクトリー (L1 / L2 カテゴリブラウザ)</span>
          </h2>
          <p className="text-xs text-slate-400">
            白紙状態から構造化辞書を巡回し、異常な重力（需要）と摩擦（不満）が集中する未開拓市場を発見します。
          </p>
        </div>

        {/* 統計バッジ */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-slate-300 flex items-center space-x-2">
            <FolderTree className="w-4 h-4 text-indigo-400" />
            <span>
              <strong className="text-indigo-300">{totalL2Count}</strong> Core Markets Mapped
            </span>
          </div>
        </div>
      </div>

      {/* 検索 & フィルターコントロールバー */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* 検索入力欄 */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="市場名やキーワードで検索（例: CRM, Workflow, Code, Video...）"
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-3 text-xs text-slate-500 hover:text-slate-300"
            >
              Clear
            </button>
          )}
        </div>

        {/* ステータスフィルター (Active / Stagnant ☠️) */}
        <div className="flex items-center space-x-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-500 ml-2" />
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              statusFilter === "all"
                ? "bg-slate-800 text-slate-100 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All Markets
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition ${
              statusFilter === "active"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Flame className="w-3 h-3 text-amber-300" />
            <span>Active Gaps Only</span>
          </button>
          <button
            onClick={() => setStatusFilter("stagnant")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition ${
              statusFilter === "stagnant"
                ? "bg-rose-950 text-rose-200 border border-rose-500/40 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Skull className="w-3 h-3 text-rose-400" />
            <span>☠️ 巨人の墓場 (Stagnant)</span>
          </button>
        </div>
      </div>

      {/* L1 マクロカテゴリ切り替えタブ */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedL1Id("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
            selectedL1Id === "all"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Macro Sectors</span>
        </button>

        {hierarchicalGenres.map((l1) => {
          const icon = Object.entries(L1_ICONS).find(([k]) => l1.canonical_name.includes(k))?.[1] || "📁";
          return (
            <button
              key={l1.id}
              onClick={() => setSelectedL1Id(l1.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-2 ${
                selectedL1Id === l1.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <span>{icon}</span>
              <span className="truncate max-w-[220px]">{l1.canonical_name.split("(")[0].trim()}</span>
            </button>
          );
        })}
      </div>

      {/* コンテンツ本体: ローディング / エラー / グリッド */}
      {loading ? (
        <div className="py-24 text-center text-xs text-slate-400 font-mono flex items-center justify-center space-x-3">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          <span>Loading dynamic market taxonomy from Supabase...</span>
        </div>
      ) : fetchError ? (
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl text-center space-y-2">
          <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto" />
          <p className="text-xs text-slate-300 font-semibold">{fetchError}</p>
        </div>
      ) : filteredGenres.length === 0 ? (
        <div className="py-20 text-center text-xs text-slate-500 font-mono bg-slate-900/30 rounded-2xl border border-slate-800/60">
          該当する市場カテゴリが見つかりませんでした。条件を変更して再検索してください。
        </div>
      ) : (
        <div className="space-y-8">
          {filteredGenres.map((l1) => {
            const icon = Object.entries(L1_ICONS).find(([k]) => l1.canonical_name.includes(k))?.[1] || "📁";
            const subgenres = l1.subgenres || [];
            if (subgenres.length === 0) return null;

            return (
              <div key={l1.id} className="space-y-4">
                {/* L1 セクションタイトル */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{icon}</span>
                    <h3 className="font-extrabold text-sm text-slate-200">{l1.canonical_name}</h3>
                    <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 rounded-md">
                      {subgenres.length} Markets
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 hidden md:block">{l1.description}</p>
                </div>

                {/* L2 コア市場カードグリッド */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subgenres.map((l2) => {
                    const isSelected = selectedGenreName === l2.canonical_name;
                    const isStagnant = l2.status === "stagnant";

                    return (
                      <div
                        key={l2.id}
                        onClick={() => onSelectGenre(l2.canonical_name, l2.id)}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between ${
                          isSelected
                            ? "bg-indigo-950/40 border-indigo-500 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/30"
                            : isStagnant
                            ? "bg-slate-950/60 border-slate-800/70 hover:border-rose-500/40 hover:bg-rose-950/10"
                            : "bg-slate-900/50 border-slate-800/80 hover:bg-slate-900/90 hover:border-slate-700"
                        }`}
                      >
                        <div>
                          {/* ステータスバッジ (決定論的 5種市場タグ) */}
                          <div className="flex items-center justify-between text-xs mb-2.5">
                            <div className="flex flex-wrap items-center gap-1">
                              {(() => {
                                const l2Tags = computeMarketTags(
                                  {
                                    status: l2.status,
                                    rawTextCorpus: `${l2.canonical_name} ${l2.description || ""}`,
                                  },
                                  l2.status
                                );
                                if (l2Tags.length > 0) {
                                  return l2Tags.map((tag) => (
                                    <span
                                      key={tag.id}
                                      title={tag.description}
                                      className={`px-2 py-0.5 rounded-md font-mono text-[9px] font-bold border flex items-center space-x-1 ${tag.colorClass.badgeBg}`}
                                    >
                                      <span>{tag.label}</span>
                                    </span>
                                  ));
                                }
                                return (
                                  <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-md font-mono text-[9px] font-bold flex items-center space-x-1">
                                    <Flame className="w-3 h-3 text-emerald-400" />
                                    <span>Active Market</span>
                                  </span>
                                );
                              })()}
                            </div>

                            <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-2">L2 Core</span>
                          </div>

                          {/* タイトル */}
                          <h4 className="font-bold text-sm text-slate-100 group-hover:text-indigo-300 transition line-clamp-1 mb-1.5">
                            {l2.canonical_name}
                          </h4>

                          {/* 説明 */}
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {l2.description || "No description provided."}
                          </p>
                        </div>

                        {/* アクションバー */}
                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                          <span className="text-[11px] font-mono text-slate-500">
                            {isStagnant ? "High Entry Risk" : "Explore Topology"}
                          </span>

                          <button
                            disabled={isAnalyzing}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                              isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-800 group-hover:bg-indigo-600 text-slate-300 group-hover:text-white"
                            }`}
                          >
                            <span>{isSelected && isAnalyzing ? "分析中..." : "Run Discovery"}</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
