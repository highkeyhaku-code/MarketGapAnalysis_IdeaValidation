import { createClient } from "@supabase/supabase-js";
import { env } from "../src/env";
import { Database } from "../types/database";

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
