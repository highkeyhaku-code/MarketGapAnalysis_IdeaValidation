"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Home, FileQuestion } from "lucide-react";
import { getAuthHeaders } from "../../../../lib/authClient";

/**
 * 旧結果画面のフォワードコンポーネント
 * 独立した結果画面を廃止し、統合されたアイデア詳細画面 /ideas/[idea_id] へリダイレクト
 */
export default function ValidationResultRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const commitId = params?.commitId as string;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!commitId) return;

    const forwardToRepositoryView = async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/ideas/commit/${commitId}`, { headers });
        const json = await res.json();
        if (json.success && json.commit?.idea_id) {
          router.replace(`/ideas/${json.commit.idea_id}?commitId=${commitId}`);
        } else {
          setError(json.error || "Commit not found");
        }
      } catch (err: any) {
        setError(err.message || "Failed to locate repository");
      }
    };

    forwardToRepositoryView();
  }, [commitId, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <FileQuestion className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-100">コミットが見つかりませんでした</h2>
            <p className="text-xs text-slate-400">
              指定されたコミット（<span className="font-mono text-slate-300">{commitId}</span>）は存在しないか削除されました。
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
          >
            <Home className="w-4 h-4" />
            <span>The Garage へ戻る</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono text-sm">
      <div className="flex items-center space-x-3 text-purple-400 animate-pulse">
        <Sparkles className="w-5 h-5 animate-spin" />
        <span>Redirecting to Integrated Idea Repository View...</span>
      </div>
    </div>
  );
}
