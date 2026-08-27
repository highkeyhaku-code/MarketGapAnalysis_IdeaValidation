"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useRouter } from "next/navigation";
import { IdeaCommitNode } from "../lib/treeTypes";
import {
  GitBranch,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Flame,
  CheckCircle2,
  Calendar,
  Layers,
  X,
} from "lucide-react";

export interface IdeaLineageTreeProps {
  commits: IdeaCommitNode[];
  activeCommitId?: string;
  width?: number;
  height?: number;
  onSelectCommit?: (commit: IdeaCommitNode) => void;
}

interface StratifiedNodeDatum extends IdeaCommitNode {
  // d3.stratify用
}

/**
 * Git for Ideas ツリー描画コンポーネント (IdeaLineageTree)
 * D3.js (d3.stratify + d3.tree) を用いて、仮説のピボット履歴をGitコミットツリー風にSVG描画する。
 */
export function IdeaLineageTree({
  commits,
  activeCommitId,
  width = 800,
  height = 500,
  onSelectCommit,
}: IdeaLineageTreeProps) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<IdeaCommitNode | null>(null);

  useEffect(() => {
    if (!svgRef.current || !commits || commits.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // 1. ルートノードの検証とフォールバック
    // d3.stratify には parentId が null / undefined のノードが厳密に1つ必要
    const cleanedCommits: StratifiedNodeDatum[] = [...commits];
    let rootFound = cleanedCommits.find((c) => !c.parentId);
    if (!rootFound) {
      cleanedCommits[0] = { ...cleanedCommits[0], parentId: null };
      rootFound = cleanedCommits[0];
    }

    let rootHierarchy: d3.HierarchyNode<StratifiedNodeDatum>;
    try {
      const stratify = d3
        .stratify<StratifiedNodeDatum>()
        .id((d) => d.id)
        .parentId((d) => d.parentId ?? "");

      rootHierarchy = stratify(cleanedCommits);
    } catch (err) {
      console.warn("Stratify error, falling back to sequential tree:", err);
      // 単一線形フォールバック
      const dummyStratify = d3
        .stratify<StratifiedNodeDatum>()
        .id((d) => d.id)
        .parentId((d, i) => (i === 0 ? "" : cleanedCommits[i - 1].id));
      rootHierarchy = dummyStratify(cleanedCommits);
    }

    // 2. d3.tree レイアウトの適用 (縦方向: Top to Bottom)
    const margin = { top: 40, right: 60, bottom: 40, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const treeLayout = d3
      .tree<StratifiedNodeDatum>()
      .size([innerWidth, innerHeight])
      .separation((a, b) => (a.parent === b.parent ? 1.4 : 2));

    const treeData = treeLayout(rootHierarchy);

    // 3. SVG グループ
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // 4. ブランチライン (Links)
    g.selectAll("path.branch-link")
      .data(treeData.links())
      .enter()
      .append("path")
      .attr("class", "branch-link")
      .attr("fill", "none")
      .attr("stroke", (d) => (d.target.data.id === activeCommitId ? "#a855f7" : "rgba(99, 102, 241, 0.4)"))
      .attr("stroke-width", 2.5)
      .attr("stroke-dasharray", (d) => (d.target.data.status === "draft" ? "4,4" : "none"))
      .attr(
        "d",
        d3
          .linkVertical<d3.HierarchyPointLink<StratifiedNodeDatum>, d3.HierarchyPointNode<StratifiedNodeDatum>>()
          .x((d) => d.x)
          .y((d) => d.y)
      );

    // 5. コミットノード (Nodes)
    const nodeGroup = g
      .selectAll("g.commit-node")
      .data(treeData.descendants())
      .enter()
      .append("g")
      .attr("class", "commit-node")
      .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
      .style("cursor", "pointer")
      .on("click", (_event, d) => {
        setSelectedCommit(d.data);
        if (onSelectCommit) {
          onSelectCommit(d.data);
        }
      });

    // コミット丸型バッジ (外枠オーラ)
    nodeGroup
      .append("circle")
      .attr("r", 20)
      .attr("fill", (d) => {
        if (d.data.status === "validated") return "rgba(16, 185, 129, 0.15)";
        if (d.data.status === "analyzing") return "rgba(168, 85, 247, 0.2)";
        return "rgba(99, 102, 241, 0.15)";
      })
      .attr("stroke", (d) => {
        if (d.data.id === activeCommitId) return "#a855f7";
        if (d.data.status === "validated") return "#10b981";
        if (d.data.score && d.data.score < 50) return "#f43f5e";
        return "#6366f1";
      })
      .attr("stroke-width", (d) => (d.data.id === activeCommitId ? 3 : 2));

    // コミットアイコン / バージョン名
    nodeGroup
      .append("text")
      .text((d) => `v${d.data.version || "1.0"}`)
      .attr("dy", 4)
      .attr("text-anchor", "middle")
      .attr("fill", "#f8fafc")
      .attr("font-size", "10px")
      .attr("font-family", "monospace")
      .attr("font-weight", "bold");

    // コミットタイトルラベル
    nodeGroup
      .append("text")
      .text((d) => d.data.title || "Untitled Commit")
      .attr("dy", 32)
      .attr("text-anchor", "middle")
      .attr("fill", "#cbd5e1")
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .style("text-shadow", "0 2px 4px rgba(0,0,0,0.8)");

    // スコアバッジテキスト
    nodeGroup
      .filter((d) => d.data.score !== null && d.data.score !== undefined)
      .append("text")
      .text((d) => `★ ${d.data.score} pts`)
      .attr("dy", -26)
      .attr("text-anchor", "middle")
      .attr("fill", (d) => ((d.data.score ?? 0) >= 60 ? "#34d399" : "#fb7185"))
      .attr("font-size", "10px")
      .attr("font-family", "monospace")
      .attr("font-weight", "bold");
  }, [commits, activeCommitId, width, height, onSelectCommit]);

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl font-sans select-none">
      {/* ヘッダー */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <GitBranch className="w-5 h-5 text-purple-400" />
          <div>
            <h3 className="font-bold text-sm text-slate-100">Git for Ideas Lineage Tree</h3>
            <p className="text-xs text-slate-400">ビジネスモデルのピボット履歴とコミット分岐グラフ</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
          <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg">
            {commits.length} Total Commits
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full overflow-x-auto pt-4 flex justify-center">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-full h-auto block"
          style={{ minHeight: "420px" }}
        />
      </div>

      {/* ノードクリック時のコミット詳細インスペクター */}
      {selectedCommit && (
        <div className="absolute top-20 right-6 z-20 w-84 bg-slate-900/95 backdrop-blur-xl border border-purple-500/40 rounded-3xl p-5 shadow-2xl text-slate-100 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h4 className="font-bold text-sm text-slate-100">
                Commit: v{selectedCommit.version || "1.0"}
              </h4>
            </div>
            <button
              onClick={() => setSelectedCommit(null)}
              className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 space-y-3 text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Title</span>
              <p className="font-semibold text-slate-200">{selectedCommit.title}</p>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 font-mono">
              <span className="text-slate-400">Score</span>
              <span
                className={`font-bold ${
                  (selectedCommit.score ?? 0) >= 60 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {selectedCommit.score !== null ? `${selectedCommit.score} / 100` : "Analyzing..."}
              </span>
            </div>

            {selectedCommit.metadata?.semanticDiff && (
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Semantic Diff</span>
                <p className="text-[11px] text-slate-300 italic bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  {selectedCommit.metadata.semanticDiff}
                </p>
              </div>
            )}

            <div className="pt-2 grid grid-cols-2 gap-2">
              {/* ピボットボタン */}
              <button
                type="button"
                onClick={() => router.push(`/validate?pivotFrom=${selectedCommit.id}`)}
                className="flex items-center justify-center space-x-1 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-xl border border-purple-500/30 transition text-xs font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Pivot Here</span>
              </button>

              {/* 検証結果を開く */}
              <button
                type="button"
                onClick={() => router.push(`/validate/${selectedCommit.id}/result`)}
                className="flex items-center justify-center space-x-1 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-xl border border-indigo-500/30 transition text-xs font-semibold"
              >
                <span>View Result</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
