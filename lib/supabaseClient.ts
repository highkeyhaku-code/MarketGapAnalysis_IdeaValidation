import { createClient } from "@supabase/supabase-js";
import { env } from "../src/env";
import { Database } from "../types/database";

/**
 * クライアントサイド (Anon Key) Supabase クライアント
 * RLSポリシーが適用されるブラウザ環境用
 */
export const supabase = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * サーバーサイド運用用 Supabase Service Role クライアント
 * RLSをバイパスしてジョブステータス更新やキャッシュ保存を行う。
 * ※ ブラウザ環境から直接アクセスすることはセキュリティ上禁止
 */
export const supabaseAdmin = (() => {
  if (typeof window !== "undefined") {
    return new Proxy({} as ReturnType<typeof createClient<Database>>, {
      get() {
        throw new Error("❌ supabaseAdmin cannot be accessed in browser context!");
      },
    });
  }

  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY || "",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
})();

let cachedDemoUserId: string | null = null;

/**
 * リクエストヘッダーの Authorization: Bearer <Supabase JWT> から検証済みユーザーIDを取得する。
 * 通常ユーザー・匿名ユーザー（Anonymous Sign-In）のいずれの JWT も安全に検証できる。
 */
export async function getAuthenticatedUserIdFromRequest(req: {
  headers: { get(name: string): string | null };
}): Promise<string | null> {
  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.slice(7).trim();
    if (!token) return null;

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user?.id) {
      console.warn("[Auth] Invalid or expired Bearer token:", error?.message);
      return null;
    }

    return data.user.id;
  } catch (err) {
    console.warn("[Auth] Failed to verify Bearer token:", err);
    return null;
  }
}

/**
 * 認証ユーザーIDまたは専用デモユーザーIDを取得
 * ideas, usersテーブルの外部キー制約 (auth.users) を満たすために使用
 */
export async function getDefaultOrAuthUserId(providedUserId?: string): Promise<string> {
  if (providedUserId && providedUserId.length > 10 && !providedUserId.startsWith("temp-")) {
    return providedUserId;
  }
  if (cachedDemoUserId) return cachedDemoUserId;

  try {
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const existingDemo = usersData?.users?.find((u) => u.email === "demo-user@garage.local");
    if (existingDemo?.id) {
      cachedDemoUserId = existingDemo.id;
      return cachedDemoUserId;
    }

    const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
      email: "demo-user@garage.local",
      password: "demo-password-12345",
      email_confirm: true,
    });
    if (newUser?.user?.id) {
      cachedDemoUserId = newUser.user.id;
      return cachedDemoUserId;
    }

    if (usersData && usersData.users && usersData.users.length > 0) {
      cachedDemoUserId = usersData.users[0].id;
      return cachedDemoUserId;
    }
  } catch (err) {
    console.warn("Failed to get default auth user:", err);
  }
  return crypto.randomUUID();
}

