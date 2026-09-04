"use client";

import React, { useState } from "react";
import { getGuestSession, purgeGuestSession, GuestSession } from "@/lib/guestSession";
import { AlertTriangle, ArrowRight, Trash2, CheckCircle2, ShieldAlert } from "lucide-react";

interface GuestMigrationModalProps {
  isOpen: boolean;
  userEmail?: string;
  onMigrated?: (count: number) => void;
  onDiscarded?: () => void;
}

export const GuestMigrationModal: React.FC<GuestMigrationModalProps> = ({
  isOpen,
  userEmail,
  onMigrated,
  onDiscarded,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const session = getGuestSession();
  if (!session || session.draftIdeas.length === 0) return null;

  const draftCount = session.draftIdeas.length;

  const handleMigrate = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/migrate-guest-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestSessionId: session.sessionId,
          draftIdeas: session.draftIdeas,
          guestCredits: session.guestCredits,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "データ移行に失敗しました");
      }

      // 移行成功: LocalStorage のゲストデータを安全にパージ
      purgeGuestSession();
      if (onMigrated) onMigrated(json.migratedCount || draftCount);
    } catch (err: any) {
      console.error("Migration error:", err);
      setErrorMsg(err.message || "Failed to migrate data");
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = () => {
    // 共有端末対策: 他人のデータや不要なゲストデータを完全消去
    purgeGuestSession();
    if (onDiscarded) onDiscarded();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-2xl p-6 md:p-8 shadow-2xl shadow-amber-950/40 text-slate-100">
        {/* Warning Icon & Badge */}
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-amber-300 tracking-wider uppercase">
            共有端末対策 / 未保存データの引き継ぎ確認
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white mb-2">
          ゲストセッションの仮説が見つかりました
        </h3>

        <p className="text-sm text-slate-300 mb-4 leading-relaxed">
          ログイン前に作成された <strong className="text-amber-400">{draftCount}件</strong> のドラフト仮説が存在します。
          {userEmail && (
            <>
              現在のアカウント（<span className="text-indigo-300 font-mono text-xs">{userEmail}</span>）にデータを統合して引き継ぎますか？
            </>
          )}
        </p>

        {/* Draft preview list */}
        <div className="mb-6 max-h-48 overflow-y-auto space-y-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
          {session.draftIdeas.map((draft, idx) => (
            <div key={draft.id || idx} className="flex items-start gap-2 text-xs text-slate-300 py-1 border-b border-slate-800/60 last:border-b-0">
              <span className="text-slate-500 font-mono">#{idx + 1}</span>
              <div className="flex-1 truncate">
                <span className="font-medium text-slate-200">{draft.title}</span>
                <p className="text-[11px] text-slate-400 truncate">{draft.ideaInput?.q1_target_pain}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Caution Notice */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 mb-6">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            インターネットカフェや会社の共有PCをご利用の場合、第三者の入力データである可能性があります。心当たりがない場合は「破棄する」を選択してください。
          </span>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDiscard}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800 text-sm font-medium transition-all disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>破棄する (引き継がない)</span>
          </button>

          <button
            onClick={handleMigrate}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-950/50 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span>統合処理中...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>このアカウントに引き継ぐ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
