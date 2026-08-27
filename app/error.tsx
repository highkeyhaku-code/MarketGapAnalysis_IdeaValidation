"use client";

import React, { useEffect } from "react";
import { AlertOctagon, RotateCcw, Home, Sparkles } from "lucide-react";
import Link from "next/link";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[The Garage UI Error Boundary Caught]:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
        {/* エラーアイコン */}
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto shadow-lg shadow-rose-500/10">
          <AlertOctagon className="w-8 h-8" />
        </div>

        {/* タイトル & エラーメッセージ */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400">
            Runtime Error Caught
          </span>
          <h2 className="text-2xl font-black tracking-tight text-slate-100">
            予期せぬエラーが発生しました
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            ページの描画または非同期処理の待機中に問題が発生しました。再度お試しいただくか、ガレージのホームへお戻りください。
          </p>
        </div>

        {/* エラー詳細 (開発用・ダイジェスト) */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-left font-mono text-[11px] space-y-1 text-slate-300 overflow-x-auto max-h-36">
          <div className="text-rose-400 font-bold">Error: {error.message || "Unknown error occurred"}</div>
          {error.digest && <div className="text-slate-500 text-[10px]">Digest: {error.digest}</div>}
        </div>

        {/* アクションボタン */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>再読み込み (Retry)</span>
          </button>

          <Link
            href="/"
            className="flex items-center space-x-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition"
          >
            <Home className="w-4 h-4" />
            <span>The Garage へ戻る</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
