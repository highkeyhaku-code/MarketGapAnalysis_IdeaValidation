"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { EvaluatedCompanyNode } from "../lib/ai/evaluateMarket";
import { Sparkles, Globe, ExternalLink, Flame, ShieldAlert, BarChart3, X } from "lucide-react";

export interface GravityMapData {
  genreId: string;
  genreName: string;
  coreJtbd: string;
  subJtbds?: string[];
  companies: EvaluatedCompanyNode[];
  craters?: Array<{
    featureId: string;
    depth: number;
    description: string;
  }>;
}

export interface GravityMapVisualizerProps {
  data: GravityMapData;
  width?: number;
  height?: number;
}

interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  type: "star" | "planet";
  name: string;
  tagline?: string;
  description?: string;
  homepageUrl?: string;
  pullScore?: number;
  frictionScore?: number;
  intensity?: number;
  radius: number;
  color: string;
  rawCompany?: EvaluatedCompanyNode;
}

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  source: string | SimulationNode;
  target: string | SimulationNode;
  distance: number;
}

/**
 * D3.js 物理演算ベース重力マップ描画コンポーネント (GravityMapVisualizer)
 * 中心JTBD星と競合企業惑星を引力・反発力モデルでシミュレーション描画する。
 */
export function GravityMapVisualizer({
  data,
  width = 900,
  height = 560,
}: GravityMapVisualizerProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<EvaluatedCompanyNode | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data || !data.companies || data.companies.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // 1. ノードとリンクの構築
    const starNode: SimulationNode = {
      id: "jtbd-center-star",
      type: "star",
      name: data.coreJtbd || data.genreName,
      radius: 42,
      color: "#6366f1", // インディゴ/パープル
      fx: width / 2, // 中心に固定
      fy: height / 2,
    };

    const planetNodes: SimulationNode[] = data.companies.map((c, i) => {
      const angle = (i / data.companies.length) * 2 * Math.PI;
      const dist = 160 + (100 - c.pullScore) * 1.5;
      // 摩擦が大きいほど赤・橙、引力が強いほど青・紫
      const hue = Math.max(10, 240 - c.frictionScore * 2.2);
      const color = `hsl(${hue}, 85%, 60%)`;

      return {
        id: c.companyId || `comp-${i}`,
        type: "planet",
        name: c.name,
        tagline: c.tagline,
        description: c.description,
        homepageUrl: c.homepageUrl,
        pullScore: c.pullScore,
        frictionScore: c.frictionScore,
        intensity: c.intensity,
        radius: c.radius || 24,
        color,
        x: width / 2 + Math.cos(angle) * dist,
        y: height / 2 + Math.sin(angle) * dist,
        rawCompany: c,
      };
    });

    const allNodes: SimulationNode[] = [starNode, ...planetNodes];

    const links: SimulationLink[] = planetNodes.map((p) => {
      const pull = p.pullScore ?? 50;
      // 引力が強いほど中心に近づく
      const distance = Math.max(90, 240 - pull * 1.4);
      return {
        source: starNode.id,
        target: p.id,
        distance,
      };
    });

    // 2. SVG コンテナ & Zoom グループ
    const g = svg.append("g").attr("class", "gravity-map-container");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // 3. 背景グラデーション・グローフィルター
    const defs = svg.append("defs");

    const glowFilter = defs
      .append("filter")
      .attr("id", "glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    glowFilter.append("feGaussianBlur").attr("stdDeviation", "6").attr("result", "coloredBlur");
    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // 4. 重力リンク (ライン)
    const linkGroup = g.append("g").attr("class", "links");
    const linkElements = linkGroup
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "rgba(99, 102, 241, 0.2)")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4,4");

    // 5. ノードグループ
    const nodeGroup = g.append("g").attr("class", "nodes");
    const nodeElements = nodeGroup
      .selectAll("g.node")
      .data(allNodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, SimulationNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            if (d.type !== "star") {
              d.fx = null;
              d.fy = null;
            }
          })
      )
      .on("click", (_event, d) => {
        if (d.rawCompany) {
          setSelectedCompany(d.rawCompany);
        }
      });

    // ノードサークル
    nodeElements
      .append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => d.color)
      .attr("stroke", (d) => (d.type === "star" ? "#e0e7ff" : "rgba(255, 255, 255, 0.4)"))
      .attr("stroke-width", (d) => (d.type === "star" ? 3 : 1.5))
      .attr("filter", "url(#glow)")
      .attr("opacity", 0.9);

    // 中心星のパルスオーラ
    nodeElements
      .filter((d) => d.type === "star")
      .append("circle")
      .attr("r", 56)
      .attr("fill", "none")
      .attr("stroke", "rgba(129, 140, 248, 0.3)")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "6,6");

    // テキストラベル
    nodeElements
      .append("text")
      .text((d) => d.name)
      .attr("dy", (d) => (d.type === "star" ? 6 : d.radius + 14))
      .attr("text-anchor", "middle")
      .attr("fill", "#f1f5f9")
      .attr("font-size", (d) => (d.type === "star" ? "12px" : "11px"))
      .attr("font-weight", (d) => (d.type === "star" ? "700" : "500"))
      .attr("pointer-events", "none")
      .style("text-shadow", "0 2px 4px rgba(0,0,0,0.8)");

    // 6. D3 Force Simulation
    const simulation = d3
      .forceSimulation<SimulationNode>(allNodes)
      .force(
        "link",
        d3
          .forceLink<SimulationNode, SimulationLink>(links)
          .id((d) => d.id)
          .distance((d) => d.distance)
          .strength(0.6)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("collide", d3.forceCollide<SimulationNode>().radius((d) => d.radius + 20))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .on("tick", () => {
        linkElements
          .attr("x1", (d) => (d.source as SimulationNode).x ?? 0)
          .attr("y1", (d) => (d.source as SimulationNode).y ?? 0)
          .attr("x2", (d) => (d.target as SimulationNode).x ?? 0)
          .attr("y2", (d) => (d.target as SimulationNode).y ?? 0);

        nodeElements.attr("transform", (d) => `translate(${d.x ?? 0}, ${d.y ?? 0})`);
      });

    return () => {
      simulation.stop();
    };
  }, [data, width, height]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl font-sans">
      {/* 重力マップヘッダー */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800 flex items-center space-x-3 text-slate-200">
        <Sparkles className="w-4 h-4 text-indigo-400" />
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Market Gravity Topology</h4>
          <p className="text-sm font-bold text-slate-100">{data.genreName}</p>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto block select-none"
        style={{ minHeight: "520px" }}
      />

      {/* 凡例 / コントロール */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800 flex items-center space-x-4 text-xs text-slate-400">
        <div className="flex items-center space-x-1.5">
          <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
          <span>Core JTBD Star</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <span>Low Friction (Stable)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-3 h-3 rounded-full bg-rose-500" />
          <span>High Friction (Market Gap)</span>
        </div>
      </div>

      {/* 企業詳細サイドインスペクター */}
      {selectedCompany && (
        <div className="absolute top-4 right-4 z-20 w-80 bg-slate-900/95 backdrop-blur-lg border border-slate-800 rounded-2xl p-5 shadow-2xl text-slate-100 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-base text-slate-100">{selectedCompany.name}</h3>
            </div>
            <button
              onClick={() => setSelectedCompany(null)}
              className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 space-y-3 text-xs">
            <p className="text-slate-300 italic">"{selectedCompany.tagline}"</p>
            <p className="text-slate-400 line-clamp-3">{selectedCompany.description}</p>

            {/* スコア指標 */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Pull Score</span>
                  <BarChart3 className="w-3 h-3 text-indigo-400" />
                </div>
                <div className="text-lg font-bold font-mono text-indigo-400">
                  {selectedCompany.pullScore}
                  <span className="text-xs text-slate-500 font-normal">/100</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Friction</span>
                  <Flame className="w-3 h-3 text-rose-400" />
                </div>
                <div className="text-lg font-bold font-mono text-rose-400">
                  {selectedCompany.frictionScore}
                  <span className="text-xs text-slate-500 font-normal">/100</span>
                </div>
              </div>
            </div>

            {/* 主要摩擦ポイント */}
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start space-x-2 text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Primary Friction Feature:</span>
                <span className="font-mono text-[11px] text-rose-200">
                  {selectedCompany.targetFeatureId} (Intensity: {selectedCompany.intensity}/10)
                </span>
              </div>
            </div>

            {/* 外部リンク */}
            {selectedCompany.homepageUrl && (
              <a
                href={selectedCompany.homepageUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center justify-center space-x-1.5 w-full py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-xl border border-indigo-500/30 transition"
              >
                <span>Visit Homepage</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
