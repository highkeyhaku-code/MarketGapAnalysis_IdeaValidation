/**
 * ゲストセッション (Progressive Signup) 管理モジュール
 * 未ログインユーザーのドラフト仮説とクレジットをLocalStorageに保持し、
 * 48時間のTTLで安全にパージ・管理する。
 */

export const GUEST_STORAGE_KEY = "garage_guest_session_v1";
export const GUEST_SESSION_TTL_MS = 48 * 60 * 60 * 1000; // 48時間 (ミリ秒)

export interface GuestIdeaDraft {
  id: string; // クライアント発番UUID (冪等UPSERTキー)
  title: string;
  domain?: string;
  ideaInput: {
    q1_target_pain: string;
    q2_solution: string;
    q3_core_edge: string;
    q4_target_literacy?: string;
    q4_monetization_model?: string;
    q4_supplementary_pains?: any;
  };
  keywords?: string[];
  createdAt: number;
}

export interface GuestSession {
  sessionId: string;
  guestCredits: number;
  createdAt: number;
  expiresAt: number;
  draftIdeas: GuestIdeaDraft[];
}

/**
 * ゲストセッションを取得。TTL(48時間)が切れている場合は自動パージする。
 */
export function getGuestSession(): GuestSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return null;

    const session: GuestSession = JSON.parse(raw);
    const now = Date.now();

    // 48時間TTL切れチェック
    if (now > session.expiresAt) {
      console.warn("🧹 [GuestSession] Session expired (> 48h TTL), purging guest data.");
      purgeGuestSession();
      return null;
    }

    return session;
  } catch (err) {
    console.error("Failed to parse guest session:", err);
    purgeGuestSession();
    return null;
  }
}

/**
 * ゲストセッションを作成または取得
 */
export function getOrCreateGuestSession(): GuestSession {
  const existing = getGuestSession();
  if (existing) return existing;

  const now = Date.now();
  const newSession: GuestSession = {
    sessionId: crypto.randomUUID(),
    guestCredits: 10, // 無料体験クレジット
    createdAt: now,
    expiresAt: now + GUEST_SESSION_TTL_MS,
    draftIdeas: [],
  };

  saveGuestSession(newSession);
  return newSession;
}

/**
 * ゲストセッションを保存
 */
export function saveGuestSession(session: GuestSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    console.error("Failed to save guest session to localStorage:", err);
  }
}

/**
 * ゲストセッションをパージ（削除）
 */
export function purgeGuestSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to purge guest session:", err);
  }
}

/**
 * ゲストセッションにドラフト仮説を追加・更新 (クライアントUUIDで冪等)
 */
export function upsertDraftToGuestSession(draft: Omit<GuestIdeaDraft, "id" | "createdAt"> & { id?: string }): GuestSession {
  const session = getOrCreateGuestSession();
  const draftId = draft.id || crypto.randomUUID();
  const existingIndex = session.draftIdeas.findIndex((d) => d.id === draftId);

  const fullDraft: GuestIdeaDraft = {
    id: draftId,
    title: draft.title || (draft.ideaInput?.q1_target_pain ? draft.ideaInput.q1_target_pain.slice(0, 40) + "..." : "Untitled Idea"),
    domain: draft.domain || "B2B_SME",
    ideaInput: draft.ideaInput,
    keywords: draft.keywords || [],
    createdAt: existingIndex >= 0 ? session.draftIdeas[existingIndex].createdAt : Date.now(),
  };

  if (existingIndex >= 0) {
    session.draftIdeas[existingIndex] = fullDraft;
  } else {
    session.draftIdeas.push(fullDraft);
  }

  saveGuestSession(session);
  return session;
}

/**
 * ゲストクレジットを消費
 */
export function deductGuestCredits(amount: number): { success: boolean; remaining: number } {
  const session = getOrCreateGuestSession();
  if (session.guestCredits < amount) {
    return { success: false, remaining: session.guestCredits };
  }

  session.guestCredits -= amount;
  saveGuestSession(session);
  return { success: true, remaining: session.guestCredits };
}

/**
 * 未移行のゲストドラフトが存在するか確認
 */
export function hasPendingGuestData(): boolean {
  const session = getGuestSession();
  return !!session && session.draftIdeas.length > 0;
}
