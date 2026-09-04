"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  Compass,
  AlertTriangle,
  FileQuestion,
  Home,
  CheckCircle2,
  Loader2,
  Zap,
  Layers,
  Lock,
} from "lucide-react";
import { GravityMapVisualizer, GravityMapData } from "../../../components/GravityMapVisualizer";
import { AuthWallModal } from "../../../components/AuthWallModal";
import { PricingModal } from "../../../components/PricingModal";
import { useBillingStore } from "../../../lib/store/useBillingStore";
import { useUserSession } from "../../../hooks/useUserSession";
import { computeMarketTags, MarketTagBadge } from "../../../lib/marketTags";

/**
 * 1. 専用マップ画面 (Dedicated Immersive Map Page)
 * app/map/[genreId]/page.tsx
 * 
 * - Directive 1: 「← 市場ディレクトリーに戻る (/discover)」と「The Garage (Kanban)」の明確なナビゲーション
 * - Directive 2: market_cache から該当 genreId の実データを取得し、完全動的化
 * - Directive 3: 多対多引力モデル (Multi-Spring Gravitational Lattice) & 動的惑星サイズ & クレーター切削
 * - Directive 4: インスペクターの実データバインド、AI推論表示、背景クリッククローズ
 */
export default function DedicatedMarketMapPage() {
  const params = useParams();
  const router = useRouter();
  const genreId = params?.genreId as string;

  const [loading, setLoading] = useState(true);
  const [revalidating, setRevalidating] = useState(false);
  const [mapData, setMapData] = useState<GravityMapData | null>(null);
  const [genreMetadata, setGenreMetadata] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // プログレッシブサインアップ & ハイブリッド課金
  const { user, isGuest, showAuthWall, openAuthWall, closeAuthWall } = useUserSession();
  const { planTier, totalCredits, openPricingModal, fetchCredits } = useBillingStore();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  // アンロック状態の判定
  useEffect(() => {
    async function checkUnlockStatus() {
      if (planTier === "founder") {
        setIsUnlocked(true);
        return;
      }
      try {
        const url = user?.id
          ? `/api/market/unlocked?genreId=${encodeURIComponent(genreId)}&userId=${encodeURIComponent(user.id)}`
          : `/api/market/unlocked?genreId=${encodeURIComponent(genreId)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success && json.isUnlocked) {
          setIsUnlocked(true);
        }
      } catch (err) {
        console.warn("Error checking market unlock status:", err);
      }
    }
    if (genreId) {
      checkUnlockStatus();
    }
  }, [genreId, user?.id, planTier]);

  // 3クレジットでのアンロック実行
  const handleUnlockMarket = async () => {
    if (isGuest) {
      openAuthWall();
      return;
    }
    try {
      setUnlocking(true);
      const res = await fetch("/api/market/unlocked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genreId, userId: user.id }),
      });
      const json = await res.json();
      if (json.success) {
        setIsUnlocked(true);
        fetchCredits(user.id);
      } else {
        alert(json.error || "アンロックに失敗しました（クレジット残高を確認してください）");
      }
    } catch (err: any) {
      alert("通信エラー: " + err.message);
    } finally {
      setUnlocking(false);
    }
  };

  const fetchMap = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const url = user?.id
        ? `/api/market/map/${genreId}?userId=${encodeURIComponent(user.id)}`
        : `/api/market/map/${genreId}`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.success && json.mapData) {
        setMapData(json.mapData);
        setIsUnlocked(json.isUnlocked ?? !json.isLocked);
        setGenreMetadata({
          status: json.mapData.status || "active",
          description: json.mapData.description,
          updatedAt: json.updatedAt,
        });
      } else {
        setErrorMessage(json.error || "Market map data not found");
      }
    } catch (err: any) {
      console.error("Failed to load map data:", err);
      setErrorMessage(err.message || "Failed to load market map");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (genreId) {
      fetchMap();
    }
  }, [genreId, user?.id]);

  // 手動キャッシュパージ & 再解析 (2クレジット消費)
  const handleRevalidate = async () => {
    try {
      setRevalidating(true);
      const res = await fetch("/api/market/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genreId }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchMap();
      } else {
        alert(json.error || json.message || "キャッシュの再検証に失敗しました");
      }
    } catch (err: any) {
      alert("エラーが発生しました: " + err.message);
    } finally {
      setRevalidating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-mono text-sm space-y-4">
        <div className="flex items-center space-x-3 text-indigo-400 animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Decoding Multi-Spring Gravity Lattice for Sector {genreId?.slice(0, 8)}...</span>
        </div>
        <p className="text-xs text-slate-500 font-sans">
          Borda RPC選定、Product Hunt、Tavily摩擦コーパス、および多対多引力マトリックスを解析中
        </p>
      </div>
    );
  }

  if (errorMessage || !mapData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <FileQuestion className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-100">市場データが見つかりませんでした</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              指定された市場（<span className="font-mono text-slate-300">{genreId}</span>）は未登録か、削除された可能性があります。
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-rose-400 text-left">
              {errorMessage}
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => router.push("/?tab=discover")}
              className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>市場ディレクトリーへ戻る</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isStagnant = genreMetadata?.status === "stagnant";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* ナビゲーションバー (Directive 1: 改修) */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* 【Directive 1】市場ディレクトリーへ戻る専用ボタン */}
            <button
              onClick={() => router.push("/?tab=discover")}
              className="px-3.5 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 hover:text-white rounded-xl border border-indigo-500/30 transition cursor-pointer flex items-center space-x-1.5 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>市場ディレクトリーに戻る (/discover)</span>
            </button>

            {/* Kanban ハブへのリンク */}
            <button
              onClick={() => router.push("/?tab=kanban")}
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition cursor-pointer flex items-center space-x-1 text-xs font-semibold"
            >
              <Home className="w-3.5 h-3.5" />
              <span>The Garage</span>
            </button>

            <div className="h-6 w-px bg-slate-800" />

            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-extrabold text-sm text-slate-100 tracking-tight">
                    {mapData.genreName}
                  </h1>

                  {/* 🏷️ 決定論的 5種市場状況タグ (深刻度順) */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(mapData.marketTags && mapData.marketTags.length > 0
                      ? mapData.marketTags
                      : computeMarketTags(mapData, mapData.status)
                    ).map((tag: any) => (
                      <span
                        key={tag.id}
                        title={tag.description}
                        className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-md border flex items-center space-x-1 ${tag.colorClass.badgeBg}`}
                      >
                        <span>{tag.label}</span>
                      </span>
                    ))}
                    {(!mapData.marketTags || mapData.marketTags.length === 0) &&
                      computeMarketTags(mapData, mapData.status).length === 0 && (
                        <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-md">
                          🌐 標準均衡市場 (ACTIVE)
                        </span>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* アクションボタン群 */}
          <div className="flex items-center space-x-3">
            <button
              disabled={revalidating}
              onClick={handleRevalidate}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-800 transition cursor-pointer disabled:opacity-50"
            >
              {revalidating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>再分析 (3 pts)</span>
            </button>

            <Link
              href="/validate"
              className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>この市場で仮説を検証</span>
            </Link>
          </div>
        </div>
      </header>

      {/* メインマップ没入キャンバス */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-5 flex flex-col space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>{mapData.companies.length} Competitors Mapped across {mapData.jtbdList?.length || mapData.subJtbds?.length || 4} JTBD Gravity Centers</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">
            Sector ID: {genreId}
          </span>
        </div>

        {/* D3 重力マップ可視化コンポーネント (全画面没入 + Fog of War) */}
        <div className="relative flex-1 w-full min-h-[640px] rounded-3xl overflow-hidden border border-slate-800 bg-slate-950">
          {/* Fog of War (情報の非対称性) オーバーレイマスク */}
          {!isUnlocked && (
            <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/75 backdrop-blur-md">
              <div className="max-w-md w-full bg-slate-900/95 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
                  <Lock className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                    Fog of War (情報の非対称性)
                  </div>
                  <h3 className="text-xl font-black text-slate-100">
                    未知の市場領域（アンロックが必要）
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    この市場の引力トポロジー・各社の摩擦スコア（Friction）・クレーター深層成分は保護されています。3クレジットを消費してアンロックすると、解約後も永久に再課金なしで閲覧できます。
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    disabled={unlocking}
                    onClick={handleUnlockMarket}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {unlocking ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <Zap className="w-4 h-4 fill-slate-950" />
                    )}
                    <span>3クレジットでアンロック</span>
                  </button>
                  <button
                    onClick={openPricingModal}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
                  >
                    Founderプランで全開放
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* D3 重力マップ可視化 (未アンロック時はボカシ + クリック不可) */}
          <div className={!isUnlocked ? "filter blur-[6px] opacity-40 pointer-events-none select-none transition-all duration-300" : "transition-all duration-300"}>
            <GravityMapVisualizer
              data={mapData}
              width={1200}
              height={680}
            />
          </div>
        </div>
      </main>

      {/* プラン選択 & 追加クレジット購入モーダル */}
      <PricingModal />

      {/* 認証ウォールモーダル */}
      <AuthWallModal
        isOpen={showAuthWall}
        onClose={closeAuthWall}
        title="アカウント連携で市場データをアンロックする"
        description="市場のアンロック履歴を安全に保護し、解約後も永続的にアクセスできるようにするにはログインが必要です。"
      />
    </div>
  );
}
