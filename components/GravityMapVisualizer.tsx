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
  RotateCcw,
  Star,
  Target,
  Zap,
  Lightbulb,
  ArrowRight,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { WhatIfCard } from "../app/api/market/whatif/route";

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
  subJtbds?: string[]; // 複数 JTBD 星リスト
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
  hasCrater?: boolean;
  isTensionOverload?: boolean;
  rawCompany?: EvaluatedCompanyNode;
  rawCustomPlanet?: CustomPlanetData;
}

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  source: string | SimulationNode;
  target: string | SimulationNode;
  distance: number;
  isCustomLink?: boolean;
  isFrictionOverload?: boolean;
}

/**
 * D3.js 物理演算ベース重力マップ描画コンポーネント (GravityMapVisualizer)
 * - Directive 2: Geminiが抽出した3〜5つのJTBDをそれぞれ独立した星として中央円周上に動的配置
 * - Directive 3: 惑星の実スコア（Pull/Friction）バインドおよび「AI推論・根拠（Score Justification）」の表示
 * - 設計書 4.2: クレーター（三日月欠損）＆赤く波打つテンションライン（Friction Waves）
 * - 設計書 4.4: What-If カードのオンデマンド遅延生成
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

  // What-If オンデマンド生成状態
  const [isGeneratingWhatIf, setIsGeneratingWhatIf] = useState(false);
  const [whatIfCards, setWhatIfCards] = useState<WhatIfCard[]>([]);
  const [selectedWhatIfCard, setSelectedWhatIfCard] = useState<WhatIfCard | null>(null);

  const activeCustomPlanet = overrideCustomPlanet || data.customPlanet || null;

  // What-If 生成 API の呼び出し
  const handleGenerateWhatIf = async (company: EvaluatedCompanyNode) => {
    try {
      setIsGeneratingWhatIf(true);
      setWhatIfCards([]);
      setSelectedWhatIfCard(null);

      const res = await fetch("/api/market/whatif", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genreName: data.genreName,
          competitorName: company.name,
          targetFeatureId: company.targetFeatureId,
          frictionScore: company.frictionScore,
          pullScore: company.pullScore,
          coreJtbd: data.coreJtbd,
          description: company.description,
        }),
      });

      const json = await res.json();
      if (json.success && Array.isArray(json.cards)) {
        setWhatIfCards(json.cards);
        if (json.cards.length > 0) {
          setSelectedWhatIfCard(json.cards[0]);
        }
      }
    } catch (err) {
      console.error("Failed to generate What-If cards:", err);
    } finally {
      setIsGeneratingWhatIf(false);
    }
  };

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const companies = data.companies || [];

    // =========================================================================
    // 1. 【Directive 2】動的・複数 JTBD 星の配置 (3〜5つの JTBD 星)
    // =========================================================================
    const rawJtbds = data.subJtbds && data.subJtbds.length > 0
      ? data.subJtbds
      : [
          data.coreJtbd || `Core: ${data.genreName}`,
          `0-Config & Fast Setup`,
          `High Performance & Speed`,
          `Ecosystem & Integrations`,
        ];

    const jtbdStars: SimulationNode[] = rawJtbds.map((jtbdText, idx) => {
      const starCount = rawJtbds.length;
      const angle = (idx / starCount) * 2 * Math.PI - Math.PI / 2;
      const starOrbitRadius = starCount === 1 ? 0 : 80;

      return {
        id: `jtbd-star-${idx}`,
        type: "star",
        name: jtbdText,
        radius: starCount === 1 ? 44 : 28,
        color: idx === 0 ? "#6366f1" : "#818cf8", // プライマリ星: Indigo, サブ星: Light Indigo
        fx: width / 2 + Math.cos(angle) * starOrbitRadius,
        fy: height / 2 + Math.sin(angle) * starOrbitRadius,
      };
    });

    const primaryStar = jtbdStars[0];

    // =========================================================================
    // 2. 競合企業惑星 (Competitor Planets)
    // =========================================================================
    const planetNodes: SimulationNode[] = companies.map((c, i) => {
      const angle = (i / Math.max(1, companies.length)) * 2 * Math.PI;
      const dist = 180 + (100 - (c.pullScore || 50)) * 1.5;
      const hue = Math.max(10, 240 - (c.frictionScore || 50) * 2.2);
      const color = `hsl(${hue}, 85%, 60%)`;
      const isTensionOverload = (c.frictionScore || 0) > (c.pullScore || 0) || (c.frictionScore || 0) >= 70;
      const hasCrater = (c.frictionScore || 0) >= 50 || (c.intensity || 0) >= 6;

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
        radius: c.radius || 26,
        color,
        hasCrater,
        isTensionOverload,
        x: width / 2 + Math.cos(angle) * dist,
        y: height / 2 + Math.sin(angle) * dist,
        rawCompany: c,
      };
    });

    // =========================================================================
    // 3. ユーザーの仮説 (🪐 Custom Planet) の合成配置
    // =========================================================================
    const customPlanetNodes: SimulationNode[] = [];
    if (activeCustomPlanet) {
      const pull = activeCustomPlanet.pullScore ?? 60;
      const frict = activeCustomPlanet.frictionScore ?? 40;
      const customDist = Math.max(110, 230 - pull * 1.3);
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
        color: "#f59e0b",
        x: width / 2 + Math.cos(customAngle) * customDist,
        y: height / 2 + Math.sin(customAngle) * customDist,
        rawCustomPlanet: activeCustomPlanet,
      });
    }

    const allNodes: SimulationNode[] = [...jtbdStars, ...planetNodes, ...customPlanetNodes];

    // =========================================================================
    // 4. 重力リンク (Links - 各惑星を最も近い/対応する JTBD 星にバインド)
    // =========================================================================
    const links: SimulationLink[] = [
      ...planetNodes.map((p, i) => {
        // JTBD星が複数の場合はインデックスに応じて分散接続
        const targetStar = jtbdStars[i % jtbdStars.length] || primaryStar;
        const pull = p.pullScore ?? 50;
        const distance = Math.max(80, 220 - pull * 1.4);
        return {
          source: targetStar.id,
          target: p.id,
          distance,
          isCustomLink: false,
          isFrictionOverload: p.isTensionOverload,
        };
      }),
      ...customPlanetNodes.map((cp) => {
        const pull = cp.pullScore ?? 60;
        const distance = Math.max(80, 200 - pull * 1.3);
        return {
          source: primaryStar.id,
          target: cp.id,
          distance,
          isCustomLink: true,
          isFrictionOverload: false,
        };
      }),
    ];

    // 5. SVG フィルター & スタイル定義
    const defs = svg.append("defs");
    const styleEl = defs.append("style");
    styleEl.text(`
      @keyframes frictionWavePulse {
        0% { stroke-dashoffset: 0; }
        100% { stroke-dashoffset: -32; }
      }
      @keyframes craterWarningPulse {
        0% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.15); opacity: 0.3; }
        100% { transform: scale(1); opacity: 0.8; }
      }
      .friction-wave-active {
        stroke: #f43f5e !important;
        stroke-width: 3.5px !important;
        stroke-dasharray: 6,4 !important;
        animation: frictionWavePulse 0.7s linear infinite !important;
        filter: url(#crimson-glow) !important;
      }
    `);

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

    // Crimson Glow
    const crimsonGlow = defs
      .append("filter")
      .attr("id", "crimson-glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    crimsonGlow.append("feGaussianBlur").attr("stdDeviation", "8").attr("result", "coloredBlur");
    const crimsonMerge = crimsonGlow.append("feMerge");
    crimsonMerge.append("feMergeNode").attr("in", "coloredBlur");
    crimsonMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Gold Glow
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

    // 6. SVG コンテナ & Zoom
    const g = svg.append("g").attr("class", "gravity-map-container");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    // 7. 重力リンク描画
    const linkGroup = g.append("g").attr("class", "links");
    const linkElements = linkGroup
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("class", (d) => (d.isFrictionOverload ? "friction-wave-active" : ""))
      .attr("stroke", (d) => {
        if (d.isCustomLink) return "rgba(245, 158, 11, 0.7)";
        if (d.isFrictionOverload) return "#f43f5e";
        return "rgba(99, 102, 241, 0.25)";
      })
      .attr("stroke-width", (d) => (d.isFrictionOverload ? 3.5 : d.isCustomLink ? 2.5 : 1.5))
      .attr("stroke-dasharray", (d) => (d.isCustomLink ? "5,3" : d.isFrictionOverload ? "6,4" : "4,4"));

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
          setWhatIfCards([]);
        } else if (d.rawCompany) {
          setSelectedCustomPlanet(null);
          setSelectedCompany(d.rawCompany);
          setWhatIfCards([]);
        }
      });

    // テンション警告パルスリング
    nodeElements
      .filter((d) => Boolean(d.isTensionOverload))
      .append("circle")
      .attr("r", (d) => d.radius + 10)
      .attr("fill", "none")
      .attr("stroke", "#f43f5e")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,3")
      .attr("opacity", 0.8)
      .style("animation", "craterWarningPulse 1.5s ease-in-out infinite");

    // メインサークル
    nodeElements
      .append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => d.color)
      .attr("stroke", (d) => {
        if (d.type === "custom_planet") return "#fef08a";
        if (d.type === "star") return "#e0e7ff";
        if (d.isTensionOverload) return "#f43f5e";
        return "rgba(255, 255, 255, 0.4)";
      })
      .attr("stroke-width", (d) => {
        if (d.type === "custom_planet") return 3.5;
        if (d.type === "star") return 2.5;
        if (d.isTensionOverload) return 2.5;
        return 1.5;
      })
      .attr("filter", (d) => {
        if (d.type === "custom_planet") return "url(#gold-glow)";
        if (d.isTensionOverload) return "url(#crimson-glow)";
        return "url(#glow)";
      })
      .attr("opacity", (d) => (d.type === "custom_planet" ? 1 : 0.9));

    // クレーターマーク
    const craterNodes = nodeElements.filter((d) => Boolean(d.hasCrater));
    craterNodes
      .append("circle")
      .attr("cx", (d) => d.radius * 0.4)
      .attr("cy", (d) => -d.radius * 0.3)
      .attr("r", (d) => Math.max(3, d.radius * 0.28))
      .attr("fill", "#0f172a")
      .attr("stroke", "rgba(244, 63, 94, 0.6)")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.9);

    craterNodes
      .append("path")
      .attr("d", (d) => {
        const r = d.radius;
        return `M 0 -${r} A ${r} ${r} 0 0 1 ${r} 0 A ${r * 0.8} ${r * 0.8} 0 0 0 0 -${r} Z`;
      })
      .attr("fill", "rgba(15, 23, 42, 0.75)")
      .attr("stroke", "#f43f5e")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.95);

    // Custom Planet 土星リング
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

    // JTBD 星のパルスオーラ
    nodeElements
      .filter((d) => d.type === "star")
      .append("circle")
      .attr("r", (d) => d.radius + 14)
      .attr("fill", "none")
      .attr("stroke", "rgba(129, 140, 248, 0.35)")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4,4");

    // テキストラベル
    nodeElements
      .append("text")
      .text((d) => d.name)
      .attr("dy", (d) => (d.type === "star" ? 4 : d.radius + 16))
      .attr("text-anchor", "middle")
      .attr("fill", (d) => (d.type === "custom_planet" ? "#fef08a" : d.type === "star" ? "#e0e7ff" : d.isTensionOverload ? "#fca5a5" : "#f1f5f9"))
      .attr("font-size", (d) => (d.type === "star" ? "10px" : d.type === "custom_planet" ? "12px" : "11px"))
      .attr("font-weight", (d) => (d.type === "star" || d.type === "custom_planet" || d.isTensionOverload ? "800" : "500"))
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
      .force("charge", d3.forceManyBody().strength(-380))
      .force("collide", d3.forceCollide<SimulationNode>().radius((d) => d.radius + 24))
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
        style={{ minHeight: "560px" }}
      />

      {/* 凡例 */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-800 flex flex-wrap items-center gap-3 text-xs text-slate-400 shadow-lg">
        <div className="flex items-center space-x-1.5">
          <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
          <span>JTBD Stars ({data.subJtbds?.length || 4} Objectives)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <span>Low Friction</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-3 h-3 rounded-full bg-rose-500 border border-rose-400" />
          <span>Crater / Friction Overload</span>
        </div>
        <div className="flex items-center space-x-1.5 text-rose-400 font-mono font-bold">
          <span>⚡ Friction Waves</span>
        </div>
        {activeCustomPlanet && (
          <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-800 text-amber-300 font-semibold">
            <span className="text-sm">🪐</span>
            <span>Your Idea (Custom Planet)</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 競合企業詳細サイドインスペクター & 【Directive 3】AI推論・根拠の表示 */}
      {/* ========================================================================= */}
      {selectedCompany && (
        <div className="absolute top-4 right-4 z-20 w-88 max-h-[92%] overflow-y-auto bg-slate-900/95 backdrop-blur-lg border border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-100 animate-in fade-in slide-in-from-right-4 duration-300 scrollbar-thin">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-base text-slate-100">{selectedCompany.name}</h3>
            </div>
            <button
              onClick={() => {
                setSelectedCompany(null);
                setWhatIfCards([]);
              }}
              className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 space-y-3 text-xs">
            <p className="text-slate-300 italic">"{selectedCompany.tagline}"</p>
            <p className="text-slate-400 line-clamp-3 leading-relaxed">{selectedCompany.description}</p>

            {/* スコア指標 (Directive 3: 実スコアバインド) */}
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

            {/* 【Directive 3】なぜその点数になったのかを示す AI 推論・根拠テキスト */}
            <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl space-y-1.5">
              <div className="flex items-center space-x-1.5 text-indigo-300 font-bold text-[11px]">
                <Lightbulb className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>AI スコア推論・根拠 (Score Justification)</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {selectedCompany.scoreReasoning ||
                  `${selectedCompany.name}は機能の網羅性により高い引力を持ちますが、${selectedCompany.targetFeatureId}に関する設定工数と学習コストが強い反発力を生んでいます。`}
              </p>
            </div>

            {/* 主要摩擦ポイント (クレーター情報) */}
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start space-x-2 text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Crater Feature (摩擦集中点):</span>
                <span className="font-mono text-[11px] text-rose-200">
                  {selectedCompany.targetFeatureId} (Intensity: {selectedCompany.intensity}/10)
                </span>
              </div>
            </div>

            {/* What-If カードのオンデマンド遅延生成エリア */}
            <div className="pt-2 border-t border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>What-If Idea Generator</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">On-Demand</span>
              </div>

              {whatIfCards.length === 0 ? (
                <button
                  disabled={isGeneratingWhatIf}
                  onClick={() => handleGenerateWhatIf(selectedCompany)}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isGeneratingWhatIf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Gemini 3.1 Pro 思考中...</span>
                    </>
                  ) : (
                    <>
                      <Lightbulb className="w-4 h-4 text-slate-950" />
                      <span>✨ ここでアイディアを生成 (What-If)</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="grid grid-cols-2 gap-2">
                    {whatIfCards.map((card) => {
                      const isCardSelected = selectedWhatIfCard?.id === card.id;
                      return (
                        <button
                          key={card.id}
                          onClick={() => setSelectedWhatIfCard(card)}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                            isCardSelected
                              ? "bg-amber-500/20 border-amber-500 text-amber-200 shadow"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center space-x-1 mb-1">
                            <span>{card.patternEmoji}</span>
                            <span className="text-[10px] font-bold line-clamp-1">{card.patternName.split("(")[0]}</span>
                          </div>
                          <p className="text-[10px] text-slate-300 line-clamp-2">{card.coreConcept}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* 選択中の What-If カード詳細 & エディタ起動ボタン */}
                  {selectedWhatIfCard && (
                    <div className="p-3 bg-slate-950 rounded-2xl border border-amber-500/30 space-y-2 text-xs animate-in fade-in">
                      <div className="flex items-center space-x-1.5 text-amber-300 font-bold">
                        <span>{selectedWhatIfCard.patternEmoji}</span>
                        <span>{selectedWhatIfCard.patternName}</span>
                      </div>
                      <p className="text-slate-200 italic">"{selectedWhatIfCard.provocativeQuestion}"</p>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{selectedWhatIfCard.coreConcept}</p>

                      <button
                        onClick={() => {
                          const query = new URLSearchParams({
                            targetPain: selectedWhatIfCard.editorDraft.q1_target_pain,
                            solution: selectedWhatIfCard.editorDraft.q2_solution,
                            coreEdge: selectedWhatIfCard.editorDraft.q3_core_edge,
                            targetLiteracy: selectedWhatIfCard.editorDraft.q4_target_literacy,
                          }).toString();
                          router.push(`/validate?${query}`);
                        }}
                        className="w-full mt-2 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 transition cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        <span>🚀 この仮説で検証を開始 (Launch in Editor)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
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
              className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition cursor-pointer"
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
