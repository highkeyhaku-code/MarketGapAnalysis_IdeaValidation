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

let cachedUserId: string | null = null;

/**
 * 認証ユーザーIDまたはデフォルトユーザーIDを取得
 * ideas, usersテーブルの外部キー制約 (auth.users) を満たすために使用
 */
export async function getDefaultOrAuthUserId(providedUserId?: string): Promise<string> {
  if (providedUserId && providedUserId.length > 10 && !providedUserId.startsWith("temp-")) {
    return providedUserId;
  }
  if (cachedUserId) return cachedUserId;

  try {
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    if (usersData && usersData.users && usersData.users.length > 0) {
      cachedUserId = usersData.users[0].id;
      return cachedUserId;
    }
    const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
      email: "demo-user@garage.local",
      password: "demo-password-12345",
      email_confirm: true,
    });
    if (newUser?.user?.id) {
      cachedUserId = newUser.user.id;
      return cachedUserId;
    }
  } catch (err) {
    console.warn("Failed to get default auth user:", err);
  }
  return crypto.randomUUID();
}

