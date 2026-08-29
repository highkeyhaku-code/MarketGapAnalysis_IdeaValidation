"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { EvaluatedCompanyNode, JtbdStarInfo } from "../lib/ai/evaluateMarket";
import {
  Sparkles,
  Globe,
  ExternalLink,
  Flame,
  ShieldAlert,
  BarChart3,
  X,
  RotateCcw,
  Target,
  Zap,
  Lightbulb,
  ArrowRight,
  Loader2,
  Layers,
  Users,
  Info,
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
  pullScores?: Record<string, number>;
  frictionScore: number;
  radius?: number;
  commitId?: string;
  isUserIdea?: boolean;
}

export interface GravityMapData {
  genreId: string;
  genreName: string;
  coreJtbd: string;
  coreJtbd_en?: string;
  coreJtbd_ja?: string;
  subJtbds?: string[]; // 複数 JTBD 星リスト (互換用)
  jtbdList?: JtbdStarInfo[]; // 多言語対応 JTBD 星リスト (EN/JA)
  companies: EvaluatedCompanyNode[];
  craters?: Array<{
    featureId: string;
    depth: number;
    description: string;
    description_en?: string;
    description_ja?: string;
  }>;
  customPlanet?: CustomPlanetData | null;
  status?: string;
  description?: string;
}

export interface GravityMapVisualizerProps {
  data: GravityMapData;
  customPlanet?: CustomPlanetData | null;
  width?: number;
  height?: number;
  initialLang?: "en" | "ja";
  onPivotToCrater?: (jtbd: string) => void;
}

interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  type: "star" | "planet" | "custom_planet";
  name: string;
  name_en?: string;
  name_ja?: string;
  tagline?: string;
  description?: string;
  homepageUrl?: string;
  pullScore?: number;
  pullScores?: Record<string, number>;
  frictionScore?: number;
  intensity?: number;
  targetFeatureId?: string;
  radius: number;
  color: string;
  hasCrater?: boolean;
  isTensionOverload?: boolean;
  rawCompany?: EvaluatedCompanyNode;
  rawCustomPlanet?: CustomPlanetData;
  rawStar?: JtbdStarInfo;
  followersCount?: number;
  rawReviewsCount?: number;
}

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  source: string | SimulationNode;
  target: string | SimulationNode;
  distance: number;
  strength: number;
  pull: number;
  isCustomLink?: boolean;
  isFrictionOverload?: boolean;
  starId?: string;
  planetId?: string;
  starIndex?: number;
}

/**
 * D3.js 物理演算ベース重力マップ描画コンポーネント (GravityMapVisualizer)
 * - 1. DB・スキーマレベルの多言語化 (🌐 EN / JA State駆動切り替え)
 * - 2. 市場シェア正規化 (Sqrt/Log スケール) & 摩擦斥力ベクトル (D3 forceFrictionRepulsion)
 * - 3. 常設グラフィカル凡例 (Legend) & ホバー時ハイライト (最高引力線 & 摩擦線のみ強調・他半透明化)
 * - 4. 構造化インスペクターUI (「強い引力の源泉 (Pull)」と「クレーターの発生要因 (Friction)」+ JTBD Multi-Pull Matrix)
 */
export function GravityMapVisualizer({
  data,
  customPlanet: overrideCustomPlanet,
  width = 1100,
  height = 640,
  initialLang = "ja",
  onPivotToCrater,
}: GravityMapVisualizerProps) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement | null>(null);

  // 多言語 (🌐 EN / JA) State
  const [lang, setLang] = useState<"en" | "ja">(initialLang);

  const [selectedCompany, setSelectedCompany] = useState<EvaluatedCompanyNode | null>(null);
  const [selectedCustomPlanet, setSelectedCustomPlanet] = useState<CustomPlanetData | null>(null);

  // What-If オンデマンド生成状態
  const [isGeneratingWhatIf, setIsGeneratingWhatIf] = useState(false);
  const [whatIfCards, setWhatIfCards] = useState<WhatIfCard[]>([]);
  const [selectedWhatIfCard, setSelectedWhatIfCard] = useState<WhatIfCard | null>(null);

  const activeCustomPlanet = overrideCustomPlanet || data.customPlanet || null;

  // 構造化 JTBD リストの正規化
  const normalizedJtbdList = useMemo<JtbdStarInfo[]>(() => {
    if (data.jtbdList && data.jtbdList.length > 0) {
      return data.jtbdList;
    }
    if (data.subJtbds && data.subJtbds.length > 0) {
      return data.subJtbds.map((text, idx) => ({
        id: `jtbd-star-${idx}`,
        name_en: text,
        name_ja: text,
      }));
    }
    return [
      { id: "jtbd-star-0", name_en: "0-Config Instant Setup", name_ja: "ゼロ設定での即時導入・稼働" },
      { id: "jtbd-star-1", name_en: "Real-Time Collaboration & Speed", name_ja: "リアルタイム共同作業と高速化" },
      { id: "jtbd-star-2", name_en: "Deep API Ecosystem & Integrations", name_ja: "シームレスなAPI連携とエコシステム統合" },
      { id: "jtbd-star-3", name_en: "Bottom-Up Team Adoption", name_ja: "現場主導での導入と学習コスト極小化" },
    ];
  }, [data.jtbdList, data.subJtbds]);

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
          coreJtbd: lang === "ja" ? (data.coreJtbd_ja || data.coreJtbd) : (data.coreJtbd_en || data.coreJtbd),
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
    // 1. 【多言語対応】JTBD 星ノードの配置 (中央円周上)
    // =========================================================================
    const starCount = normalizedJtbdList.length;
    const starOrbitRadius = starCount === 1 ? 0 : 95;

    const jtbdStars: SimulationNode[] = normalizedJtbdList.map((starInfo, idx) => {
      const angle = (idx / starCount) * 2 * Math.PI - Math.PI / 2;
      const displayName = lang === "ja" ? (starInfo.name_ja || starInfo.name_en) : (starInfo.name_en || starInfo.name_ja);
      return {
        id: starInfo.id || `jtbd-star-${idx}`,
        type: "star",
        name: displayName,
        name_en: starInfo.name_en,
        name_ja: starInfo.name_ja,
        radius: idx === 0 ? 38 : 30,
        color: idx === 0 ? "#6366f1" : "#818cf8",
        fx: width / 2 + Math.cos(angle) * starOrbitRadius,
        fy: height / 2 + Math.sin(angle) * starOrbitRadius,
        rawStar: starInfo,
      };
    });

    const primaryStar = jtbdStars[0];

    // =========================================================================
    // 2. 【市場シェア正規化】企業惑星のサイズ動的計算 (Sqrt / Log Scale)
    // =========================================================================
    const planetNodes: SimulationNode[] = companies.map((c, i) => {
      const pull = Math.max(10, Math.min(100, c.pullScore || 50));
      const frict = Math.max(10, Math.min(100, c.frictionScore || 50));

      const followers = c.followersCount ?? (c as any).votesCount ?? (i === 0 ? 1250 : Math.max(20, 380 - i * 25));
      const reviews = c.rawReviewsCount ?? (c as any).reviewsCount ?? (i === 0 ? 320 : Math.max(10, 85 - i * 5));
      const volume = Math.max(0, followers) + Math.max(0, reviews) * 2;

      // Sqrt スケールで巨大企業が画面を埋めないよう正規化 (16px 〜 44px)
      let dynamicRadius: number;
      if (volume > 0) {
        dynamicRadius = Math.round(16 + Math.min(28, Math.sqrt(volume) * 0.92));
      } else {
        dynamicRadius = Math.round(16 + (pull / 100) * 28);
      }

      const angle = (i / Math.max(1, companies.length)) * 2 * Math.PI;
      const dist = 200 + (100 - pull) * 1.4;
      const hue = Math.max(10, 240 - frict * 2.2);
      const color = `hsl(${hue}, 85%, 60%)`;
      const isTensionOverload = frict > pull || frict >= 70;
      const hasCrater = frict >= 45 || (c.intensity || 0) >= 5;

      return {
        id: c.companyId || `comp-${i}`,
        type: "planet",
        name: c.name,
        tagline: c.tagline,
        description: c.description,
        homepageUrl: c.homepageUrl,
        pullScore: pull,
        pullScores: c.pullScores || {},
        frictionScore: frict,
        intensity: c.intensity || Math.round(frict / 10),
        targetFeatureId: c.targetFeatureId,
        radius: dynamicRadius,
        color,
        hasCrater,
        isTensionOverload,
        followersCount: followers,
        rawReviewsCount: reviews,
        x: width / 2 + Math.cos(angle) * dist,
        y: height / 2 + Math.sin(angle) * dist,
        rawCompany: c,
      };
    });

    // =========================================================================
    // 3. ユーザー仮説 (🪐 Custom Planet) の動的配置
    // =========================================================================
    const customPlanetNodes: SimulationNode[] = [];
    if (activeCustomPlanet) {
      const pull = activeCustomPlanet.pullScore ?? 60;
      const frict = activeCustomPlanet.frictionScore ?? 40;
      const dynamicRadius = Math.round(18 + (pull / 100) * 26);
      const customDist = Math.max(110, 220 - pull * 1.3);
      const customAngle = -Math.PI / 4;

      customPlanetNodes.push({
        id: `custom-planet-${activeCustomPlanet.id || "my-idea"}`,
        type: "custom_planet",
        name: activeCustomPlanet.name || (lang === "ja" ? "🪐 あなたの仮説" : "🪐 Your Hypothesis"),
        tagline: activeCustomPlanet.solution,
        description: activeCustomPlanet.targetPain || activeCustomPlanet.solution,
        pullScore: pull,
        frictionScore: frict,
        radius: dynamicRadius,
        color: "#f59e0b",
        x: width / 2 + Math.cos(customAngle) * customDist,
        y: height / 2 + Math.sin(customAngle) * customDist,
        rawCustomPlanet: activeCustomPlanet,
      });
    }

    const allNodes: SimulationNode[] = [...jtbdStars, ...planetNodes, ...customPlanetNodes];

    // =========================================================================
    // 4. 多対多重力バネリンク (Multi-Spring Gravitational Lattice)
    // =========================================================================
    const links: SimulationLink[] = [];

    for (const p of planetNodes) {
      const pullsMap = p.pullScores || {};
      let maxPullStarId = primaryStar.id;
      let maxPullVal = -1;

      for (let starIdx = 0; starIdx < jtbdStars.length; starIdx++) {
        const star = jtbdStars[starIdx];
        const starKey = `jtbd-star-${starIdx}`;
        const starPull = pullsMap[starKey] ?? pullsMap[star.id] ?? (p.pullScore || 50);

        if (starPull > maxPullVal) {
          maxPullVal = starPull;
          maxPullStarId = star.id;
        }

        const distance = Math.max(70, 240 - starPull * 1.5);
        const strength = Math.max(0.06, (starPull / 100) * 0.7);

        links.push({
          source: star.id,
          target: p.id,
          distance,
          strength,
          pull: starPull,
          starId: star.id,
          planetId: p.id,
          starIndex: starIdx,
          isCustomLink: false,
          isFrictionOverload: p.isTensionOverload && star.id === maxPullStarId,
        });
      }
    }

    for (const cp of customPlanetNodes) {
      const pull = cp.pullScore ?? 60;
      for (let idx = 0; idx < jtbdStars.length; idx++) {
        const star = jtbdStars[idx];
        const distance = Math.max(80, 210 - pull * 1.4);
        links.push({
          source: star.id,
          target: cp.id,
          distance,
          strength: 0.45,
          pull,
          starId: star.id,
          planetId: cp.id,
          starIndex: idx,
          isCustomLink: true,
          isFrictionOverload: false,
        });
      }
    }

    // =========================================================================
    // 5. SVG フィルター & スタイル定義
    // =========================================================================
    const defs = svg.append("defs");
    const styleEl = defs.append("style");
    styleEl.text(`
      @keyframes frictionWavePulse {
        0% { stroke-dashoffset: 0; }
        100% { stroke-dashoffset: -32; }
      }
      @keyframes craterWarningPulse {
        0% { transform: scale(1); opacity: 0.85; }
        50% { transform: scale(1.18); opacity: 0.35; }
        100% { transform: scale(1); opacity: 0.85; }
      }
      .friction-wave-active {
        stroke: #f43f5e !important;
        stroke-width: 3.5px !important;
        stroke-dasharray: 6,4 !important;
        animation: frictionWavePulse 0.7s linear infinite !important;
        filter: url(#crimson-glow) !important;
      }
      .link-highlight-pull {
        stroke: #818cf8 !important;
        stroke-width: 4px !important;
        opacity: 1 !important;
        filter: url(#glow) !important;
      }
      .link-highlight-friction {
        stroke: #f43f5e !important;
        stroke-width: 4px !important;
        stroke-dasharray: 6,4 !important;
        animation: frictionWavePulse 0.7s linear infinite !important;
        filter: url(#crimson-glow) !important;
        opacity: 1 !important;
      }
      .link-dimmed {
        opacity: 0.06 !important;
        stroke-width: 0.6px !important;
      }
      .node-dimmed {
        opacity: 0.22 !important;
        filter: none !important;
      }
    `);

    // Glow Filters
    const glowFilter = defs.append("filter").attr("id", "glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    glowFilter.append("feGaussianBlur").attr("stdDeviation", "6").attr("result", "coloredBlur");
    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const crimsonGlow = defs.append("filter").attr("id", "crimson-glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    crimsonGlow.append("feGaussianBlur").attr("stdDeviation", "8").attr("result", "coloredBlur");
    const crimsonMerge = crimsonGlow.append("feMerge");
    crimsonMerge.append("feMergeNode").attr("in", "coloredBlur");
    crimsonMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const goldGlow = defs.append("filter").attr("id", "gold-glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    goldGlow.append("feGaussianBlur").attr("stdDeviation", "9").attr("result", "coloredBlur");
    const goldMerge = goldGlow.append("feMerge");
    goldMerge.append("feMergeNode").attr("in", "coloredBlur");
    goldMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // =========================================================================
    // 6. SVG コンテナ & 背景 Outside Click 制御
    // =========================================================================
    const g = svg.append("g").attr("class", "gravity-map-container");

    g.append("rect")
      .attr("class", "background-dismiss-plane")
      .attr("x", -width * 2)
      .attr("y", -height * 2)
      .attr("width", width * 5)
      .attr("height", height * 5)
      .attr("fill", "transparent")
      .on("click", () => {
        setSelectedCompany(null);
        setSelectedCustomPlanet(null);
        setWhatIfCards([]);
      });

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    // =========================================================================
    // 7. 多対多重力リンク描画
    // =========================================================================
    const linkGroup = g.append("g").attr("class", "links");
    const linkElements = linkGroup
      .selectAll<SVGLineElement, SimulationLink>("line")
      .data(links)
      .enter()
      .append("line")
      .attr("class", (d) => (d.isFrictionOverload ? "friction-wave-active" : ""))
      .attr("stroke", (d) => {
        if (d.isCustomLink) return "rgba(245, 158, 11, 0.65)";
        if (d.isFrictionOverload) return "#f43f5e";
        const alpha = Math.max(0.12, (d.pull / 100) * 0.45);
        return `rgba(99, 102, 241, ${alpha})`;
      })
      .attr("stroke-width", (d) => {
        if (d.isFrictionOverload) return 3.5;
        if (d.isCustomLink) return 2.2;
        return Math.max(0.8, (d.pull / 100) * 2.8);
      })
      .attr("stroke-dasharray", (d) => (d.isCustomLink ? "5,3" : d.isFrictionOverload ? "6,4" : "3,3"));

    // =========================================================================
    // 8. ノード描画 & 【直感性を高めるホバーUX】
    // =========================================================================
    const nodeGroup = g.append("g").attr("class", "nodes");
    const nodeElements = nodeGroup
      .selectAll<SVGGElement, SimulationNode>("g.node")
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
      .on("mouseenter", (_event, hoveredNode) => {
        if (hoveredNode.type !== "planet") return;

        // 該当企業に繋がるリンクを取得
        const attachedLinks = links.filter((l) => {
          const targetId = typeof l.target === "object" ? (l.target as SimulationNode).id : l.target;
          return targetId === hoveredNode.id;
        });

        if (attachedLinks.length === 0) return;

        // 1. 最も引力が強い（スコア最大）リンクを特定
        let maxPullLink = attachedLinks[0];
        for (const l of attachedLinks) {
          if (l.pull > maxPullLink.pull) {
            maxPullLink = l;
          }
        }

        // 2. 摩擦・クレーターに関連するリンクを特定 (摩擦過負荷または最大摩擦星)
        let frictionLink = attachedLinks.find((l) => l.isFrictionOverload);
        if (!frictionLink) {
          frictionLink = attachedLinks.reduce((minL, l) => (l.pull < minL.pull ? l : minL), attachedLinks[0]);
        }

        const focusedStarIds = new Set<string>();
        const getStarId = (l: SimulationLink) => (typeof l.source === "object" ? (l.source as SimulationNode).id : l.source);

        focusedStarIds.add(getStarId(maxPullLink));
        if (frictionLink && frictionLink !== maxPullLink) {
          focusedStarIds.add(getStarId(frictionLink));
        }

        // リンクのハイライト & 他を半透明化
        linkElements.each(function (l) {
          const el = d3.select(this);
          if (l === maxPullLink) {
            el.attr("class", "link-highlight-pull");
          } else if (l === frictionLink && frictionLink !== maxPullLink) {
            el.attr("class", "link-highlight-friction");
          } else {
            el.attr("class", "link-dimmed");
          }
        });

        // ノードのハイライト & 他を半透明化
        nodeElements.each(function (n) {
          const el = d3.select(this);
          if (n.id === hoveredNode.id || focusedStarIds.has(n.id)) {
            el.classed("node-dimmed", false);
          } else {
            el.classed("node-dimmed", true);
          }
        });
      })
      .on("mouseleave", () => {
        // ホバー解除: すべてのリンクとノードのスタイルを元に戻す
        linkElements.each(function (l) {
          const el = d3.select(this);
          el.attr("class", l.isFrictionOverload ? "friction-wave-active" : "")
            .attr("stroke", () => {
              if (l.isCustomLink) return "rgba(245, 158, 11, 0.65)";
              if (l.isFrictionOverload) return "#f43f5e";
              const alpha = Math.max(0.12, (l.pull / 100) * 0.45);
              return `rgba(99, 102, 241, ${alpha})`;
            })
            .attr("stroke-width", () => {
              if (l.isFrictionOverload) return 3.5;
              if (l.isCustomLink) return 2.2;
              return Math.max(0.8, (l.pull / 100) * 2.8);
            });
        });

        nodeElements.classed("node-dimmed", false);
      })
      .on("click", (event, d) => {
        event.stopPropagation();
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

    // テンション過負荷リング (赤波打つパルス)
    nodeElements
      .filter((d) => Boolean(d.isTensionOverload))
      .append("circle")
      .attr("r", (d) => d.radius + 12)
      .attr("fill", "none")
      .attr("stroke", "#f43f5e")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,3")
      .attr("opacity", 0.85)
      .style("animation", "craterWarningPulse 1.5s ease-in-out infinite");

    // メインサークル (正規化された動的半径 d.radius)
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
      .attr("opacity", (d) => (d.type === "custom_planet" ? 1 : 0.92));

    // クレーターの動的レンダリング (不満スコアに応じた三日月削り取り)
    const craterNodes = nodeElements.filter((d) => Boolean(d.hasCrater && d.type === "planet"));

    craterNodes
      .append("circle")
      .attr("cx", (d) => d.radius * 0.35)
      .attr("cy", (d) => -d.radius * 0.25)
      .attr("r", (d) => {
        const frict = d.frictionScore || 50;
        return Math.max(3, Math.round(d.radius * (frict / 100) * 0.35));
      })
      .attr("fill", "#0f172a")
      .attr("stroke", "rgba(244, 63, 94, 0.7)")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.95);

    craterNodes
      .append("path")
      .attr("d", (d) => {
        const r = d.radius;
        const frict = d.frictionScore || 50;
        const cutDepth = r * (0.4 + (frict / 100) * 0.45);
        return `M 0 -${r} A ${r} ${r} 0 0 1 ${r} 0 A ${Math.max(4, r - cutDepth)} ${Math.max(4, r - cutDepth)} 0 0 0 0 -${r} Z`;
      })
      .attr("fill", "rgba(15, 23, 42, 0.85)")
      .attr("stroke", "#f43f5e")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.95);

    // Custom Planet 土星リング
    const customPlanetElements = nodeElements.filter((d) => d.type === "custom_planet");
    customPlanetElements
      .append("ellipse")
      .attr("rx", (d) => d.radius + 16)
      .attr("ry", (d) => d.radius / 2.3)
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

    // テキストラベル (多言語対応)
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

    // =========================================================================
    // 9. 【斥力物理演算】D3 Force Simulation & frictionRepulsionForce
    // =========================================================================
    // 中心（重心）から外側へ不満の大きい企業を弾き飛ばす「斥力ベクトル」フォース
    const frictionRepulsionForce = (alpha: number) => {
      const centerX = width / 2;
      const centerY = height / 2;
      for (const node of allNodes) {
        if (node.type !== "planet") continue;
        const frict = (node.frictionScore || 0) / 100; // 0.0 to 1.0
        if (frict <= 0.05) continue;

        const dx = (node.x ?? centerX) - centerX || (Math.random() - 0.5);
        const dy = (node.y ?? centerY) - centerY || (Math.random() - 0.5);
        const dist = Math.hypot(dx, dy) || 1;
        const unitX = dx / dist;
        const unitY = dy / dist;

        // 不満の強い巨人を外周へ追いやる指向性斥力ベクトル
        const pushStrength = Math.pow(frict, 1.3) * 150 * alpha;
        node.vx = (node.vx ?? 0) + unitX * pushStrength;
        node.vy = (node.vy ?? 0) + unitY * pushStrength;
      }
    };

    const simulation = d3
      .forceSimulation<SimulationNode>(allNodes)
      .force(
        "link",
        d3
          .forceLink<SimulationNode, SimulationLink>(links)
          .id((d) => d.id)
          .distance((d) => d.distance)
          .strength((d) => d.strength)
      )
      .force("charge", d3.forceManyBody().strength(-360))
      .force("collide", d3.forceCollide<SimulationNode>().radius((d) => d.radius + 24))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("frictionRepulsion", frictionRepulsionForce)
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
  }, [data, activeCustomPlanet, width, height, lang, normalizedJtbdList]);

  return (
    <div className="relative w-full h-full min-h-[600px] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl font-sans">
      {/* 重力マップヘッダー & 言語トグル */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/85 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-800 flex items-center space-x-3 text-slate-200 shadow-lg">
        <Sparkles className="w-4 h-4 text-indigo-400" />
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
            {lang === "ja" ? "多対多引力トポロジー (Multi-Spring Gravity)" : "Multi-Spring Gravity Lattice"}
          </h4>
          <p className="text-xs font-bold text-slate-100">{data.genreName}</p>
        </div>
      </div>

      {/* グローバル言語切替トグル (🌐 EN / JA) */}
      <div className="absolute top-4 left-[340px] z-10 hidden sm:flex items-center">
        <button
          onClick={() => setLang((l) => (l === "ja" ? "en" : "ja"))}
          className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl border border-slate-700/80 transition flex items-center space-x-1.5 text-xs font-semibold shadow-lg cursor-pointer"
          title="Switch Output Language"
        >
          <span>🌐</span>
          <span className="font-mono font-bold text-indigo-300">{lang.toUpperCase()}</span>
          <span className="text-[10px] text-slate-400">({lang === "ja" ? "日本語" : "English"})</span>
        </button>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full block select-none"
        style={{ minHeight: "600px" }}
      />

      {/* ========================================================================= */}
      {/* 【常設グラフィカル凡例 (Legend)】(クレーター / バネ / 惑星サイズ / JTBD) */}
      {/* ========================================================================= */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 shadow-2xl text-xs text-slate-300 max-w-sm space-y-2 pointer-events-none select-none">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
            <Info className="w-3 h-3 text-indigo-400" />
            <span>{lang === "ja" ? "マップ凡例 (Legend)" : "Map Legend"}</span>
          </span>
          <span className="text-[9px] font-mono text-indigo-400">Topological Physics</span>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
          {/* クレーター ＝ Friction */}
          <div className="flex items-center space-x-2">
            <div className="relative w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center shrink-0 border border-rose-400">
              <div className="w-2 h-2 rounded-full bg-slate-950" />
            </div>
            <div>
              <span className="font-bold text-rose-300 block leading-tight">
                {lang === "ja" ? "クレーター ＝ 摩擦" : "Crater ＝ Friction"}
              </span>
              <span className="text-[9px] text-slate-400">
                {lang === "ja" ? "不満度で削り取り" : "Pain & Bottlenecks"}
              </span>
            </div>
          </div>

          {/* バネの太さ ＝ Pull */}
          <div className="flex items-center space-x-2">
            <div className="flex flex-col items-center justify-center space-y-0.5 shrink-0 w-4">
              <div className="w-4 h-0.5 bg-indigo-300 rounded" />
              <div className="w-4 h-1 bg-indigo-500 rounded" />
            </div>
            <div>
              <span className="font-bold text-indigo-300 block leading-tight">
                {lang === "ja" ? "バネの太さ ＝ 引力" : "Spring ＝ Pull"}
              </span>
              <span className="text-[9px] text-slate-400">
                {lang === "ja" ? "JTBD解決強度" : "JTBD Attraction"}
              </span>
            </div>
          </div>

          {/* 惑星サイズ ＝ Market Share */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-0.5 shrink-0">
              <div className="w-2 h-2 rounded-full bg-indigo-400" />
              <div className="w-3.5 h-3.5 rounded-full bg-indigo-400" />
            </div>
            <div>
              <span className="font-bold text-slate-200 block leading-tight">
                {lang === "ja" ? "惑星サイズ ＝ シェア" : "Size ＝ Market Share"}
              </span>
              <span className="text-[9px] text-slate-400">
                {lang === "ja" ? "フォロワー・レビュー数" : "User Volume (Sqrt)"}
              </span>
            </div>
          </div>

          {/* JTBD Stars */}
          <div className="flex items-center space-x-2">
            <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] border border-indigo-300 shrink-0" />
            <div>
              <span className="font-bold text-indigo-200 block leading-tight">
                {lang === "ja" ? "JTBD 星ノード" : "JTBD Centers"}
              </span>
              <span className="text-[9px] text-slate-400">
                {lang === "ja" ? `${normalizedJtbdList.length}個の解決目標` : `${normalizedJtbdList.length} Core Objectives`}
              </span>
            </div>
          </div>
        </div>

        {/* テンション波 & Custom Planet */}
        <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
          <div className="flex items-center space-x-1.5 text-rose-400 font-mono font-bold">
            <span>⚡ Friction Waves</span>
            <span className="text-[9px] text-slate-400">({lang === "ja" ? "限界点超過" : "Overload"})</span>
          </div>

          {activeCustomPlanet && (
            <div className="flex items-center space-x-1 text-amber-300 font-semibold">
              <span>🪐</span>
              <span>{lang === "ja" ? "あなたの仮説" : "Your Idea"}</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 【構造化インスペクターUI】(AI推論: Pull源泉 vs Friction要因 + JTBD Matrix) */}
      {/* ========================================================================= */}
      {selectedCompany && (
        <div className="absolute top-4 right-4 z-20 w-92 max-h-[94%] overflow-y-auto bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-100 animate-in fade-in slide-in-from-right-4 duration-300 scrollbar-thin">
          {/* ヘッダー & 言語トグル */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-indigo-400 shrink-0" />
              <h3 className="font-bold text-base text-slate-100 truncate max-w-[160px]">{selectedCompany.name}</h3>
            </div>

            <div className="flex items-center space-x-1.5">
              {/* インスペクター内言語切替ボタン */}
              <button
                onClick={() => setLang((l) => (l === "ja" ? "en" : "ja"))}
                className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-indigo-300 rounded-lg border border-slate-700 text-[10px] font-mono font-bold transition cursor-pointer"
                title="Switch Language"
              >
                🌐 {lang.toUpperCase()}
              </button>

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
          </div>

          <div className="mt-3 space-y-3 text-xs">
            <p className="text-slate-300 italic text-[11px]">"{selectedCompany.tagline}"</p>
            <p className="text-slate-400 line-clamp-3 text-[11px] leading-relaxed">{selectedCompany.description}</p>

            {/* スコア指標 & 市場シェア (正規化根拠) */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
              <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-slate-400 mb-0.5">
                  <span className="text-[10px]">{lang === "ja" ? "引力" : "Pull"}</span>
                  <BarChart3 className="w-3 h-3 text-indigo-400" />
                </div>
                <div className="text-base font-bold font-mono text-indigo-400">
                  {selectedCompany.pullScore}
                  <span className="text-[10px] text-slate-500 font-normal">/100</span>
                </div>
              </div>

              <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-slate-400 mb-0.5">
                  <span className="text-[10px]">{lang === "ja" ? "摩擦" : "Friction"}</span>
                  <Flame className="w-3 h-3 text-rose-400" />
                </div>
                <div className="text-base font-bold font-mono text-rose-400">
                  {selectedCompany.frictionScore}
                  <span className="text-[10px] text-slate-500 font-normal">/100</span>
                </div>
              </div>

              <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-slate-400 mb-0.5">
                  <span className="text-[10px]">{lang === "ja" ? "シェア" : "Share"}</span>
                  <Users className="w-3 h-3 text-amber-400" />
                </div>
                <div className="text-sm font-bold font-mono text-amber-300 truncate">
                  {selectedCompany.followersCount || 100}+
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* JTBD Multi-Pull Matrix (引力内訳プログレスバー) */}
            {/* ========================================================================= */}
            {selectedCompany.pullScores && Object.keys(selectedCompany.pullScores).length > 0 && (
              <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800/90 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center justify-between">
                  <span className="flex items-center space-x-1">
                    <Layers className="w-3 h-3 text-indigo-400" />
                    <span>{lang === "ja" ? "JTBD Multi-Pull Matrix (引力内訳)" : "JTBD Multi-Pull Matrix"}</span>
                  </span>
                  <span className="font-mono text-[9px] text-indigo-400">0-100 Score</span>
                </span>
                <div className="space-y-2">
                  {normalizedJtbdList.map((starInfo, idx) => {
                    const starKey = `jtbd-star-${idx}`;
                    const score = selectedCompany.pullScores?.[starKey] ?? selectedCompany.pullScores?.[starInfo.id] ?? selectedCompany.pullScore;
                    const starTitle = lang === "ja" ? (starInfo.name_ja || starInfo.name_en) : (starInfo.name_en || starInfo.name_ja);

                    return (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-300 truncate max-w-[210px] font-medium">{starTitle}</span>
                          <span className="font-mono font-bold text-indigo-400">{score}</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 構造化 AI 推論根拠 (1. 強い引力の源泉 vs 2. クレーターの発生要因) */}
            {/* ========================================================================= */}
            <div className="space-y-2">
              {/* セクション 1: 強い引力の源泉 (Pull) */}
              <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl space-y-1">
                <div className="flex items-center space-x-1.5 text-indigo-300 font-bold text-[10px] uppercase tracking-wider">
                  <Lightbulb className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{lang === "ja" ? "💡 強い引力の源泉 (Core Pull)" : "💡 Core Pull Strengths"}</span>
                </div>
                <p className="text-slate-200 text-[11px] leading-relaxed">
                  {lang === "ja"
                    ? (selectedCompany.reasoningPullJa || selectedCompany.scoreReasoning)
                    : (selectedCompany.reasoningPullEn || selectedCompany.scoreReasoning)}
                </p>
              </div>

              {/* セクション 2: クレーターの発生要因 (Friction) */}
              <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-2xl space-y-1">
                <div className="flex items-center space-x-1.5 text-rose-300 font-bold text-[10px] uppercase tracking-wider">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{lang === "ja" ? "💥 クレーターの発生要因 (Friction Roots)" : "💥 Friction Drivers & Crater Roots"}</span>
                </div>
                <p className="text-slate-200 text-[11px] leading-relaxed">
                  {lang === "ja"
                    ? (selectedCompany.reasoningFrictionJa || `${selectedCompany.targetFeatureId} において設定負担と学習コストが摩擦を生んでいます。`)
                    : (selectedCompany.reasoningFrictionEn || `Operational friction and setup complexity in ${selectedCompany.targetFeatureId}.`)}
                </p>
                <div className="pt-1 flex items-center justify-between text-[10px] text-rose-400 font-mono">
                  <span>Target: {selectedCompany.targetFeatureId}</span>
                  <span>Intensity: {selectedCompany.intensity}/10</span>
                </div>
              </div>
            </div>

            {/* What-If アイデア生成エリア */}
            <div className="pt-2 border-t border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === "ja" ? "What-If アイデア生成" : "What-If Idea Generator"}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">Gemini 3.1 Pro</span>
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
                      <span>{lang === "ja" ? "Gemini 3.1 Pro 思考中..." : "Gemini 3.1 Pro Reasoning..."}</span>
                    </>
                  ) : (
                    <>
                      <Lightbulb className="w-4 h-4 text-slate-950" />
                      <span>{lang === "ja" ? "✨ ここでアイディアを生成 (What-If)" : "✨ Generate What-If Ideas"}</span>
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

                  {selectedWhatIfCard && (
                    <div className="p-3 bg-slate-950 rounded-2xl border border-amber-500/30 space-y-2 text-xs animate-in fade-in">
                      <div className="flex items-center space-x-1.5 text-amber-300 font-bold">
                        <span>{selectedWhatIfCard.patternEmoji}</span>
                        <span>{selectedWhatIfCard.patternName}</span>
                      </div>
                      <p className="text-slate-200 italic text-[11px]">"{selectedWhatIfCard.provocativeQuestion}"</p>
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
                        <span>{lang === "ja" ? "🚀 この仮説で検証を開始" : "🚀 Launch in Editor"}</span>
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

      {/* ========================================================================= */}
      {/* 🪐 Custom Planet (あなたの仮説) 詳細インスペクター */}
      {/* ========================================================================= */}
      {selectedCustomPlanet && (
        <div className="absolute top-4 right-4 z-20 w-88 bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 rounded-3xl p-5 shadow-2xl text-slate-100 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="text-xl">🪐</span>
              <div>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-mono text-[10px] rounded-md border border-amber-500/30">
                  {lang === "ja" ? "挑戦者の仮説" : "Challenger Hypothesis"}
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
                {lang === "ja" ? "ソリューション構想" : "Solution Concept"}
              </span>
              <p className="text-slate-200 leading-relaxed text-[11px]">{selectedCustomPlanet.solution}</p>
            </div>

            {selectedCustomPlanet.targetPain && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="font-semibold text-slate-400 text-[10px] uppercase font-mono block mb-1">
                  {lang === "ja" ? "ターゲット課題" : "Target Pain"}
                </span>
                <p className="text-slate-300 line-clamp-3 text-[11px]">{selectedCustomPlanet.targetPain}</p>
              </div>
            )}

            {/* スコア指標 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-amber-950/20 rounded-xl border border-amber-500/30">
                <div className="flex items-center justify-between text-amber-300 mb-1">
                  <span>{lang === "ja" ? "獲得引力" : "Survives Pull"}</span>
                  <Zap className="w-3 h-3 text-amber-400" />
                </div>
                <div className="text-lg font-bold font-mono text-amber-400">
                  {selectedCustomPlanet.pullScore}
                  <span className="text-xs text-slate-500 font-normal">/100</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>{lang === "ja" ? "重力摩擦" : "Gravity Friction"}</span>
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
                <span>{lang === "ja" ? "この世界線からピボット (Pivot)" : "Time-Travel Pivot"}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

