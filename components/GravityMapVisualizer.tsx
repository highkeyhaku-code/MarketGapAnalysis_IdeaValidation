"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { EvaluatedCompanyNode } from "../lib/ai/evaluateMarket";
import {
  Sparkles,
  Globe,
  ExternalLink,
  Flame,
  ShieldAlert,
  BarChart3,
  X,
  GitBranch,
  RotateCcw,
  Star,
  Target,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";

export interface CustomPlanetData {
  id: string;
  name: string;
  solution: string;
  targetPain?: string;
  coreEdge?: string;
  pullScore: number;
  frictionScore: number;
  radius?: number;
  commitId?: string;
  isUserIdea?: boolean;
}

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
  customPlanet?: CustomPlanetData | null;
}

export interface GravityMapVisualizerProps {
  data: GravityMapData;
  customPlanet?: CustomPlanetData | null;
  width?: number;
  height?: number;
  onPivotToCrater?: (jtbd: string) => void;
}

interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  type: "star" | "planet" | "custom_planet";
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
  rawCustomPlanet?: CustomPlanetData;
}

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  source: string | SimulationNode;
  target: string | SimulationNode;
  distance: number;
  isCustomLink?: boolean;
}

/**
 * D3.js 物理演算ベース重力マップ描画コンポーネント (GravityMapVisualizer)
 * 中心JTBD星、競合企業惑星、およびユーザーの仮説 (🪐 Custom Planet) を引力・反発力モデルでリアルタイムシミュレーション描画する。
 */
export function GravityMapVisualizer({
  data,
  customPlanet: overrideCustomPlanet,
  width = 900,
  height = 560,
  onPivotToCrater,
}: GravityMapVisualizerProps) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<EvaluatedCompanyNode | null>(null);
  const [selectedCustomPlanet, setSelectedCustomPlanet] = useState<CustomPlanetData | null>(null);

  const activeCustomPlanet = overrideCustomPlanet || data.customPlanet || null;

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const companies = data.companies || [];

    // 1. 固定中心星 (Core JTBD Star)
    const starNode: SimulationNode = {
      id: "jtbd-center-star",
      type: "star",
      name: data.coreJtbd || data.genreName,
      radius: 44,
      color: "#6366f1", // Indigo / Purple
      fx: width / 2, // 中心固定
      fy: height / 2,
    };

    // 2. 競合企業惑星 (Competitor Planets)
    const planetNodes: SimulationNode[] = companies.map((c, i) => {
      const angle = (i / Math.max(1, companies.length)) * 2 * Math.PI;
      const dist = 160 + (100 - (c.pullScore || 50)) * 1.4;
      // 摩擦が大きいほど赤・橙、引力が強いほど青・紫
      const hue = Math.max(10, 240 - (c.frictionScore || 50) * 2.2);
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

    // 3. ユーザーの仮説 (🪐 Custom Planet) の合成配置
    const customPlanetNodes: SimulationNode[] = [];
    if (activeCustomPlanet) {
      const pull = activeCustomPlanet.pullScore ?? 60;
      const frict = activeCustomPlanet.frictionScore ?? 40;
      const customDist = Math.max(100, 220 - pull * 1.3);
      // 競合とは反対側の角度（または少しずらした位置）に初期配置
      const customAngle = -Math.PI / 4;

      customPlanetNodes.push({
        id: `custom-planet-${activeCustomPlanet.id || "my-idea"}`,
        type: "custom_planet",
        name: activeCustomPlanet.name || "🪐 あなたの仮説",
        tagline: activeCustomPlanet.solution,
        description: activeCustomPlanet.targetPain || activeCustomPlanet.solution,
        pullScore: pull,
        frictionScore: frict,
        radius: activeCustomPlanet.radius || 28,
        color: "#f59e0b", // Amber/Gold glowing
        x: width / 2 + Math.cos(customAngle) * customDist,
        y: height / 2 + Math.sin(customAngle) * customDist,
        rawCustomPlanet: activeCustomPlanet,
      });
    }

    const allNodes: SimulationNode[] = [starNode, ...planetNodes, ...customPlanetNodes];

    // 4. 重力リンク (Links)
    const links: SimulationLink[] = [
      ...planetNodes.map((p) => {
        const pull = p.pullScore ?? 50;
        const distance = Math.max(90, 240 - pull * 1.4);
        return {
          source: starNode.id,
          target: p.id,
          distance,
          isCustomLink: false,
        };
      }),
      ...customPlanetNodes.map((cp) => {
        const pull = cp.pullScore ?? 60;
        const distance = Math.max(80, 210 - pull * 1.3);
        return {
          source: starNode.id,
          target: cp.id,
          distance,
          isCustomLink: true,
        };
      }),
    ];

    // 5. SVG コンテナ & Zoom グループ
    const g = svg.append("g").attr("class", "gravity-map-container");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // 6. 背景グラデーション・グローフィルター
    const defs = svg.append("defs");

    // Standard Glow
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

    // Custom Planet Gold Glow
    const goldGlow = defs
      .append("filter")
      .attr("id", "gold-glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    goldGlow.append("feGaussianBlur").attr("stdDeviation", "9").attr("result", "coloredBlur");
    const goldMerge = goldGlow.append("feMerge");
    goldMerge.append("feMergeNode").attr("in", "coloredBlur");
    goldMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // 7. 重力リンク描画
    const linkGroup = g.append("g").attr("class", "links");
    const linkElements = linkGroup
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", (d) => (d.isCustomLink ? "rgba(245, 158, 11, 0.6)" : "rgba(99, 102, 241, 0.25)"))
      .attr("stroke-width", (d) => (d.isCustomLink ? 2.5 : 1.5))
      .attr("stroke-dasharray", (d) => (d.isCustomLink ? "5,3" : "4,4"));

    // 8. ノードグループ
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
        if (d.rawCustomPlanet) {
          setSelectedCompany(null);
          setSelectedCustomPlanet(d.rawCustomPlanet);
        } else if (d.rawCompany) {
          setSelectedCustomPlanet(null);
          setSelectedCompany(d.rawCompany);
        }
      });

    // ノードサークル描画
    nodeElements
      .append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => d.color)
      .attr("stroke", (d) => {
        if (d.type === "custom_planet") return "#fef08a";
        if (d.type === "star") return "#e0e7ff";
        return "rgba(255, 255, 255, 0.4)";
      })
      .attr("stroke-width", (d) => {
        if (d.type === "custom_planet") return 3.5;
        if (d.type === "star") return 3;
        return 1.5;
      })
      .attr("filter", (d) => (d.type === "custom_planet" ? "url(#gold-glow)" : "url(#glow)"))
      .attr("opacity", (d) => (d.type === "custom_planet" ? 1 : 0.9));

    // Custom Planet 🪐 の土星リング (Planetary Orbit Ring)
    const customPlanetElements = nodeElements.filter((d) => d.type === "custom_planet");

    customPlanetElements
      .append("ellipse")
      .attr("rx", (d) => d.radius + 14)
      .attr("ry", (d) => d.radius / 2.5)
      .attr("fill", "none")
      .attr("stroke", "#f59e0b")
      .attr("stroke-width", 2.5)
      .attr("transform", "rotate(-25)")
      .attr("opacity", 0.85);

    customPlanetElements
      .append("ellipse")
      .attr("rx", (d) => d.radius + 20)
      .attr("ry", (d) => d.radius / 2.2)
      .attr("fill", "none")
      .attr("stroke", "rgba(251, 191, 36, 0.4)")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .attr("transform", "rotate(-25)");

    // 中心星のパルスオーラ
    nodeElements
      .filter((d) => d.type === "star")
      .append("circle")
      .attr("r", 58)
      .attr("fill", "none")
      .attr("stroke", "rgba(129, 140, 248, 0.35)")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "6,6");

    // テキストラベル
    nodeElements
      .append("text")
      .text((d) => d.name)
      .attr("dy", (d) => (d.type === "star" ? 6 : d.radius + 15))
      .attr("text-anchor", "middle")
      .attr("fill", (d) => (d.type === "custom_planet" ? "#fef08a" : "#f1f5f9"))
      .attr("font-size", (d) => (d.type === "star" ? "12px" : d.type === "custom_planet" ? "12px" : "11px"))
      .attr("font-weight", (d) => (d.type === "star" || d.type === "custom_planet" ? "800" : "500"))
      .attr("pointer-events", "none")
      .style("text-shadow", "0 2px 5px rgba(0,0,0,0.9)");

    // 9. D3 Force Simulation
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
      .force("charge", d3.forceManyBody().strength(-350))
      .force("collide", d3.forceCollide<SimulationNode>().radius((d) => d.radius + 22))
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
  }, [data, activeCustomPlanet, width, height]);

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl font-sans">
      {/* 重力マップヘッダー */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-800 flex items-center space-x-3 text-slate-200 shadow-lg">
        <Sparkles className="w-4 h-4 text-indigo-400" />
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
            Market Gravity Topology
          </h4>
          <p className="text-xs font-bold text-slate-100">{data.genreName}</p>
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
      <div className="absolute bottom-4 left-4 z-10 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-800 flex flex-wrap items-center gap-3 text-xs text-slate-400 shadow-lg">
        <div className="flex items-center space-x-1.5">
          <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
          <span>Core JTBD Star</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <span>Low Friction</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-3 h-3 rounded-full bg-rose-500" />
          <span>High Friction (Gap)</span>
        </div>
        {activeCustomPlanet && (
          <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-800 text-amber-300 font-semibold">
            <span className="text-sm">🪐</span>
            <span>Your Idea (Custom Planet)</span>
          </div>
        )}
      </div>

      {/* 競合企業詳細サイドインスペクター */}
      {selectedCompany && (
        <div className="absolute top-4 right-4 z-20 w-80 bg-slate-900/95 backdrop-blur-lg border border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-100 animate-in fade-in slide-in-from-right-4 duration-300">
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

      {/* 🪐 Custom Planet (あなたの仮説) 詳細サイドインスペクター */}
      {selectedCustomPlanet && (
        <div className="absolute top-4 right-4 z-20 w-84 bg-slate-900/95 backdrop-blur-lg border border-amber-500/40 rounded-3xl p-5 shadow-2xl text-slate-100 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="text-xl">🪐</span>
              <div>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-mono text-[10px] rounded-md border border-amber-500/30">
                  Challenger Hypothesis
                </span>
                <h3 className="font-bold text-sm text-slate-100 mt-0.5">
                  {selectedCustomPlanet.name}
                </h3>
              </div>
            </div>
            <button
              onClick={() => setSelectedCustomPlanet(null)}
              className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 space-y-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="font-semibold text-slate-400 text-[10px] uppercase font-mono block mb-1">
                Solution Concept
              </span>
              <p className="text-slate-200 leading-relaxed">{selectedCustomPlanet.solution}</p>
            </div>

            {selectedCustomPlanet.targetPain && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="font-semibold text-slate-400 text-[10px] uppercase font-mono block mb-1">
                  Target Pain
                </span>
                <p className="text-slate-300 line-clamp-3">{selectedCustomPlanet.targetPain}</p>
              </div>
            )}

            {/* スコア指標 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-amber-950/20 rounded-xl border border-amber-500/30">
                <div className="flex items-center justify-between text-amber-300 mb-1">
                  <span>Survives Pull</span>
                  <Zap className="w-3 h-3 text-amber-400" />
                </div>
                <div className="text-lg font-bold font-mono text-amber-400">
                  {selectedCustomPlanet.pullScore}
                  <span className="text-xs text-slate-500 font-normal">/100</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Gravity Friction</span>
                  <Target className="w-3 h-3 text-purple-400" />
                </div>
                <div className="text-lg font-bold font-mono text-purple-400">
                  {selectedCustomPlanet.frictionScore}
                  <span className="text-xs text-slate-500 font-normal">/100</span>
                </div>
              </div>
            </div>

            {/* Time-Travel Pivot アクションボタン */}
            {selectedCustomPlanet.commitId && (
              <button
                onClick={() => router.push(`/validate?pivotFrom=${selectedCustomPlanet.commitId}`)}
                className="mt-2 flex items-center justify-center space-x-1.5 w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>この世界線からピボット (Pivot)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
