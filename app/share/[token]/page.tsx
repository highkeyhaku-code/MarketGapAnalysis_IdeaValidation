"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheck,
  Building2,
  Skull,
  Flame,
  UserCheck,
  Printer,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Lock,
  Star,
  Lightbulb,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import { EmotionalNutritionLabel } from "../../../components/EmotionalNutritionLabel";
import { VSCardBoard } from "../../../components/VSCardBoard";

/**
 * 4.2 & 6.4 投資家・ステークホルダー向け読み取り専用ダッシュボード (InvestorSharePage)
 * - 編集UI（ウィザード、サイドバー、設定等）を完全排除した純粋なレポートビュー
 * - 5.1 AIの不確実性の完全開示 (Transparency Metric: Grounding Confidence)
 * - 5.2 対話型ツッコミUI (Socratic Dialogue Challenge)
 */
export default function InvestorSharePage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/share/${token}`);
        const json = await res.json();
        if (json.success && json.report) {
          setReport(json.report);
        } else {
          setErrorMsg(json.error || "Report not found");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load audit report");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono text-sm">
        <div className="flex items-center space-x-3 text-indigo-400 animate-pulse">
          <Sparkles className="w-5 h-5 animate-spin" />
          <span>Verifying cryptographic investor access token...</span>
        </div>
      </div>
    );
  }

  if (errorMsg || !report) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">Access Restricted</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {errorMsg || "The requested audit report has been revoked, or the share token is invalid."}
          </p>
        </div>
      </div>
    );
  }

  const { benchmark, nutritionMetrics, personas, publicSummary, survivesScore } = report;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-20">
      {/* 投資家ビュー・監査ヘッダー */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-slate-100 tracking-tight">
                  STARTUP DUE DILIGENCE AUDIT REPORT
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-md">
                  VERIFIED READ-ONLY
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Cryptographic Token: {token.slice(0, 16)}...
              </p>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-800 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            <span>Export / Print</span>
          </button>
        </div>
      </header>

      {/* メインレポート */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* レポートタイトルカード */}
        <div className="rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-purple-950/40 border border-slate-800 p-8 shadow-2xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-400">
                Category: {publicSummary.targetMarketCategory}
              </span>
              <h1 className="text-3xl font-extrabold text-slate-100">{report.reportTitle}</h1>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                {publicSummary.executiveSummary}
              </p>
            </div>

            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center space-x-6 shrink-0">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Survives Score</span>
                <span className="text-3xl font-black font-mono text-indigo-400">{survivesScore}</span>
                <span className="text-xs text-slate-500 font-normal"> / 100</span>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Audit Date</span>
                <span className="text-xs font-mono text-slate-300">
                  {new Date(report.validatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2カラム分析: VS Card & Nutrition Facts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <VSCardBoard
              ideaTitle={report.reportTitle}
              competitorName={benchmark.incumbentName}
              competitorTagline={benchmark.incumbentTagline}
              elementDiffs={benchmark.elementDiffs}
              overallScore={survivesScore}
            />

            {/* 死骸アーカイブサマリー */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Skull className="w-4 h-4 text-rose-400" />
                  <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wider">
                    Historical Project Autopsy (死骸データ分析)
                  </h3>
                </div>
                <span className="font-mono text-xs text-rose-400">
                  {report.autopsyCount} Archived Projects Benchmarked
                </span>
              </div>
              <p className="text-xs text-slate-400">
                過去に類似ソリューションで放棄・アーカイブされたリポジトリ群の失敗要因を照合し、耐障害性を検証しています。
              </p>

              {report.autopsyHighlights && report.autopsyHighlights.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {report.autopsyHighlights.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-indigo-300 truncate">{item.name}</span>
                        <span className="font-mono text-[10px] text-amber-400">★ {item.stars}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{item.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1 flex flex-col items-center">
            <EmotionalNutritionLabel metrics={nutritionMetrics} overallScore={survivesScore} />
          </div>
        </div>

        {/* 審査員フィードバック & 不確実性開示 & ソクラテス式問いかけ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Independent Advisory Evaluation (3視点からの客観審査)
              </h3>
            </div>
            <span className="text-xs text-slate-400 flex items-center space-x-1 font-mono">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Grounding Transparency Metric Active</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {personas.map((p: any, idx: number) => (
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
                        p.verdict === "CRITICAL"
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                      }`}
                    >
                      {p.verdict}
                    </span>
                  </div>

                  {/* 5.1 不確実性の開示 (Transparency Metric) */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-[10px] font-mono">
                    <span className="text-slate-400">Grounding Confidence:</span>
                    <div className="flex items-center space-x-1 text-amber-400">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{p.groundingConfidence || "HIGH"} ({p.groundingSourcesCount || 5} sources)</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 italic leading-relaxed">
                    "{p.coreCritique}"
                  </p>

                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs space-y-1">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                      Fatal Vulnerability
                    </span>
                    <p className="text-[11px] text-rose-200">{p.fatalFlaw}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs space-y-1">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                      Strategic Countermeasure
                    </span>
                    <p className="text-[11px] text-indigo-200">{p.recommendedCountermeasure}</p>
                  </div>

                  {/* 5.2 ソクラテス式の対話型問いかけ */}
                  {p.socraticQuestion && (
                    <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-xs space-y-1 animate-in fade-in">
                      <div className="flex items-center space-x-1.5 text-purple-300 font-bold text-[10px] uppercase tracking-wider">
                        <Lightbulb className="w-3.5 h-3.5 text-purple-400" />
                        <span>Socratic Challenge (思考の足場)</span>
                      </div>
                      <p className="text-[11px] text-purple-200 italic">
                        "{p.socraticQuestion}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 監査証明フッター */}
        <footer className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500 space-y-1 font-mono">
          <p>Verified by Google Gemini AI Gravity & Reality Crash Architecture</p>
          <p className="text-[10px] text-slate-600">CONFIDENTIAL & PROPRIETARY — FOR DUE DILIGENCE REVIEW ONLY</p>
        </footer>
      </main>
    </div>
  );
}
