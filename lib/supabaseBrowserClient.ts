import { createClient } from "@supabase/supabase-js";
import { env } from "../src/env";
import { Database } from "../types/database";

/**
 * クライアントサイド (ブラウザ用) Supabase クライアント
 * Anon Key を使用して RLS の制限下で安全に読み取り・ポーリングを行う。
 */
export const supabaseBrowser = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
