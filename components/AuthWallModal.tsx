"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ShieldCheck, Sparkles, X, ArrowRight, Lock } from "lucide-react";
import { isPortfolioMode } from "@/lib/portfolio";

interface AuthWallModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  onSuccess?: () => void;
}

export const AuthWallModal: React.FC<AuthWallModalProps> = ({
  isOpen,
  onClose,
  title = "進行状況を保存してアイデアをクラウド永続化",
  description = "入力した仮説データやAI審査レポートを保護し、タイムトラベル・ピボット（Git for Ideas）を利用するにはログインが必要です。",
}) => {
  const [loadingProvider, setLoadingProvider] = useState<"github" | "google" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || isPortfolioMode()) return null;

  const handleOAuthSignIn = async (provider: "github" | "google") => {
    setLoadingProvider(provider);
    setErrorMsg(null);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(window.location.pathname)}`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      if (error) {
        setErrorMsg(error.message);
        setLoadingProvider(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "OAuth login failed");
      setLoadingProvider(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 md:p-8 shadow-2xl shadow-indigo-950/50 text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
          <Lock className="w-3.5 h-3.5 text-indigo-400" />
          <span>Progressive Signup & Safe Migration</span>
        </div>

        {/* Title & Description */}
        <h3 className="text-xl font-bold text-white mb-1.5 tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
          {description}
        </p>

        {/* 🎁 Welcome Bonus キャンペーンバナー */}
        <div className="p-3.5 mb-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-indigo-500/15 border border-amber-500/40 text-amber-200 flex items-center space-x-3 shadow-inner">
          <div className="text-2xl shrink-0">🎁</div>
          <div className="space-y-0.5">
            <div className="font-extrabold text-amber-300 text-xs flex items-center space-x-1.5">
              <span>今なら無料アカウント作成で +15 pts プレゼント！</span>
            </div>
            <div className="text-slate-300 text-[11px] leading-tight">
              ゲスト枠と合算で <strong className="text-amber-300 font-mono">合計 25 pts</strong> が即座に付与されます。
            </div>
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-2 mb-6 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2.5 text-xs text-slate-200">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>初回 25 クレジットで最大8回の極限検証コミットが可能</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Git for Ideas による仮説系譜ツリーと死骸分析の永久保存</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-200">
            <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>投資家向け共有ビュー（非公開トグル・共有URL）の発行</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* OAuth Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleOAuthSignIn("github")}
            disabled={loadingProvider !== null}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-all border border-slate-700 hover:border-slate-600 disabled:opacity-50 shadow-sm"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>{loadingProvider === "github" ? "連携中..." : "GitHub で続ける (パスワードレス)"}</span>
          </button>

          <button
            onClick={() => handleOAuthSignIn("google")}
            disabled={loadingProvider !== null}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-all border border-slate-700 hover:border-slate-600 disabled:opacity-50 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 12s.7 2.3 1.9 4.7l3.7-1.9z"/>
              <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"/>
            </svg>
            <span>{loadingProvider === "google" ? "連携中..." : "Google で続ける"}</span>
          </button>
        </div>

        <div className="mt-5 text-center">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-300 underline underline-offset-4"
          >
            後で連携する（ローカル一時保存のまま）
          </button>
        </div>
      </div>
    </div>
  );
};
