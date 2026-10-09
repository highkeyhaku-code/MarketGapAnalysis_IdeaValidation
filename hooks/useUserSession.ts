"use client";

import { useSyncExternalStore, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  getGuestSession,
  hasPendingGuestData,
  purgeGuestSession,
  GuestSession,
} from "@/lib/guestSession";
import { isPortfolioMode } from "@/lib/portfolio";

export interface UserSessionState {
  user: any | null;
  loading: boolean;
  guestSession: GuestSession | null;
  showAuthWall: boolean;
  showMigrationModal: boolean;

  // アクション
  setUser: (user: any | null) => void;
  setLoading: (loading: boolean) => void;
  setGuestSession: (session: GuestSession | null) => void;
  openAuthWall: () => void;
  closeAuthWall: () => void;
  openMigrationModal: () => void;
  closeMigrationModal: () => void;
  handleMigrationCompleted: (count: number) => void;
  handleMigrationDiscarded: () => void;
}

/**
 * ゼロ外部依存の型安全グローバルストアファクトリ (useSyncExternalStore 準拠)
 */
function createStore<T extends object>(
  initializer: (
    set: (partial: Partial<T> | ((state: T) => Partial<T>)) => void,
    get: () => T
  ) => T
) {
  let state: T;
  const listeners = new Set<() => void>();

  const getState = () => state;

  const setState = (partial: Partial<T> | ((prevState: T) => Partial<T>)) => {
    const nextPartial = typeof partial === "function" ? partial(state) : partial;
    state = { ...state, ...nextPartial };
    listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error("UserSessionStore listener error:", err);
      }
    });
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  state = initializer(setState, getState);

  function useStore(): T;
  function useStore<U>(selector: (state: T) => U): U;
  function useStore<U>(selector?: (state: T) => U): U | T {
    const getSnapshot = () => (selector ? selector(state) : state);
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  }

  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;

  return useStore;
}

export const sessionStore = createStore<UserSessionState>((set, get) => ({
  user: null,
  loading: true,
  guestSession: null,
  showAuthWall: false,
  showMigrationModal: false,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setGuestSession: (session) => set({ guestSession: session }),
  openAuthWall: () => {
    // ポートフォリオモード時はモーダルを一切起動させない
    if (isPortfolioMode()) return;
    set({ showAuthWall: true });
  },
  closeAuthWall: () => set({ showAuthWall: false }),
  openMigrationModal: () => {
    if (isPortfolioMode()) return;
    set({ showMigrationModal: true });
  },
  closeMigrationModal: () => set({ showMigrationModal: false }),
  handleMigrationCompleted: (count: number) => {
    set({ showMigrationModal: false, guestSession: null });
    console.log(`🎉 [useUserSession] Migrated ${count} ideas to user account!`);
  },
  handleMigrationDiscarded: () => {
    set({ showMigrationModal: false, guestSession: null });
    console.log("🧹 [useUserSession] Discarded guest ideas.");
  },
}));

let isAuthInitialized = false;

export function useUserSession() {
  const state = sessionStore();

  useEffect(() => {
    if (typeof window === "undefined" || isAuthInitialized) return;
    isAuthInitialized = true;

    async function initSession() {
      try {
        const { data } = await supabase.auth.getSession();
        const currentUser = data.session?.user || null;
        sessionStore.setState({ user: currentUser });

        // 初期ロード時に 48h TTL パージを確実に発火
        const currentGuest = getGuestSession();
        sessionStore.setState({ guestSession: currentGuest });

        // ログイン済みかつ未移行のゲストデータがある場合、引き継ぎ確認モーダルを表示
        if (!isPortfolioMode() && currentUser && currentGuest && currentGuest.draftIdeas.length > 0) {
          sessionStore.setState({ showMigrationModal: true });
        }
      } catch (err) {
        console.warn("Error fetching supabase session:", err);
      } finally {
        sessionStore.setState({ loading: false });
      }
    }

    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user || null;
        const currentGuest = getGuestSession();
        sessionStore.setState({ user: currentUser, guestSession: currentGuest });

        if (!isPortfolioMode() && event === "SIGNED_IN" && currentUser) {
          if (currentGuest && currentGuest.draftIdeas.length > 0) {
            sessionStore.setState({ showMigrationModal: true });
          }
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return {
    ...state,
    isGuest: !state.user,
    hasGuestData: hasPendingGuestData(),
  };
}
