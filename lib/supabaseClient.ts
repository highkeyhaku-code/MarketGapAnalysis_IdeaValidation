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
 */
export const supabaseAdmin = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
