"use client";

import React, { useEffect } from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";

export default function GlobalRootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[The Garage Global Root Error Caught]:", error);
  }, [error]);

  return (
    <html lang="ja" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-6 font-sans">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
            <AlertOctagon className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-100">システムエラーが発生しました</h1>
            <p className="text-xs text-slate-400">
              ルートレイアウトで致命的なエラーが発生しました。
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-left font-mono text-[11px] text-rose-400">
            {error.message || "Root rendering failed"}
          </div>

          <button
            onClick={() => reset()}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
          >
            ページ全体を再読み込み
          </button>
        </div>
      </body>
    </html>
  );
}
