"use client";

import { useSyncExternalStore } from "react";
import { getGuestSession } from "../guestSession";

export type PlanTier = "free" | "starter" | "founder" | "studio" | "pro";

export interface BillingState {
  planTier: PlanTier;
  monthlyCredits: number;
  purchasedCredits: number;
  totalCredits: number;
  isLoading: boolean;
  isPricingModalOpen: boolean;

  // アクション
  openPricingModal: () => void;
  closePricingModal: () => void;
  fetchCredits: (userId?: string) => Promise<void>;
  updateLocalCredits: (updates: Partial<{ monthlyCredits: number; purchasedCredits: number; planTier: PlanTier }>) => void;
}

/**
 * ゼロ外部依存の型安全ストアファクトリ (useSyncExternalStore 準拠)
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
        console.error("BillingStore listener error:", err);
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

export const useBillingStore = createStore<BillingState>((set, get) => ({
  planTier: "free",
  monthlyCredits: 25,
  purchasedCredits: 0,
  totalCredits: 25,
  isLoading: false,
  isPricingModalOpen: false,

  openPricingModal: () => set({ isPricingModalOpen: true }),
  closePricingModal: () => set({ isPricingModalOpen: false }),

  fetchCredits: async (userId?: string) => {
    try {
      set({ isLoading: true });

      // 未ログインかつゲストセッションがある場合のフォールバック初期値
      const guest = getGuestSession();
      if (!userId && guest) {
        set({
          planTier: "free",
          monthlyCredits: guest.guestCredits,
          purchasedCredits: 0,
          totalCredits: guest.guestCredits,
        });
      }

      const url = userId ? `/api/billing/credits?userId=${encodeURIComponent(userId)}` : `/api/billing/credits`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.success && data.profile) {
        set({
          planTier: data.profile.planTier || "free",
          monthlyCredits: data.profile.monthlyCredits ?? 10,
          purchasedCredits: data.profile.purchasedCredits ?? 0,
          totalCredits: data.profile.totalCredits ?? 10,
        });
      }
    } catch (err) {
      console.warn("[useBillingStore] Failed to fetch credits:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  updateLocalCredits: (updates) => {
    const { monthlyCredits, purchasedCredits, planTier } = get();
    const newMonthly = updates.monthlyCredits !== undefined ? updates.monthlyCredits : monthlyCredits;
    const newPurchased = updates.purchasedCredits !== undefined ? updates.purchasedCredits : purchasedCredits;
    const newTier = updates.planTier || planTier;

    set({
      planTier: newTier,
      monthlyCredits: newMonthly,
      purchasedCredits: newPurchased,
      totalCredits: newMonthly + newPurchased,
    });
  },
}));
