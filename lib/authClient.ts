"use client";

import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import { isPortfolioMode } from "./portfolio";

let pendingAnonymousSignIn: Promise<{
  session: Session | null;
  user: User | null;
  error?: string;
}> | null = null;

/**
 * ポートフォリオモード時に Supabase Anonymous Sign-In を冪等・単一実行で確立する。
 * 既にブラウザに保存されたセッション（通常ログインまたは過去の匿名セッション）があればそれを再利用する。
 */
export async function ensurePortfolioAnonymousSession(): Promise<{
  session: Session | null;
  user: User | null;
  error?: string;
}> {
  if (typeof window === "undefined") {
    return { session: null, user: null };
  }

  try {
    const { data: existingData } = await supabase.auth.getSession();
    if (existingData.session?.user) {
      return {
        session: existingData.session,
        user: existingData.session.user,
      };
    }

    if (!isPortfolioMode()) {
      return { session: null, user: null };
    }

    if (!pendingAnonymousSignIn) {
      pendingAnonymousSignIn = (async () => {
        try {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) {
            console.warn(
              "[authClient] Supabase anonymous sign-in failed (check Authentication -> Allow anonymous sign-ins):",
              error.message
            );
            return { session: null, user: null, error: error.message };
          }
          return {
            session: data.session ?? null,
            user: data.user ?? data.session?.user ?? null,
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn("[authClient] Unexpected anonymous sign-in exception:", message);
          return { session: null, user: null, error: message };
        } finally {
          pendingAnonymousSignIn = null;
        }
      })();
    }

    return await pendingAnonymousSignIn;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[authClient] Failed to get session:", message);
    return { session: null, user: null, error: message };
  }
}

/**
 * API リクエスト用の Authorization Bearer ヘッダーを構築する。
 * ポートフォリオモード時は未サインインなら自動的に匿名セッションを確立して JWT を付与する。
 */
export async function getAuthHeaders(
  extraHeaders: Record<string, string> = {}
): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extraHeaders };

  if (typeof window === "undefined") {
    return headers;
  }

  try {
    let { data } = await supabase.auth.getSession();
    let accessToken = data.session?.access_token ?? null;

    if (!accessToken && isPortfolioMode()) {
      const ensured = await ensurePortfolioAnonymousSession();
      accessToken = ensured.session?.access_token ?? null;
    }

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  } catch (err) {
    console.warn("[authClient] Failed to resolve auth headers:", err);
  }

  return headers;
}
