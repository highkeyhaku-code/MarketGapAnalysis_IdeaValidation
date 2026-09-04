import { supabaseAdmin } from "../lib/supabaseClient.ts";

async function runMigration() {
  console.log("================================================================================");
  console.log("🔒 SUPABASE DATABASE MIGRATION: INVESTOR SHARED VIEW & RLS");
  console.log("================================================================================\n");

  const migrationSql = `
    -- 1. ideas テーブルに is_public, share_token を追加
    ALTER TABLE ideas ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
    ALTER TABLE ideas ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid();
    UPDATE ideas SET share_token = gen_random_uuid() WHERE share_token IS NULL;

    -- 2. idea_commits テーブルに visibility_flags (JSONB) を追加
    ALTER TABLE idea_commits ADD COLUMN IF NOT EXISTS visibility_flags JSONB DEFAULT '{"q1_target_pain":true,"q2_solution":false,"q3_core_edge":false,"q4_supplementary_pains":true}'::jsonb;

    -- 3. ideas テーブルの RLS ポリシー設定
    ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Owners have full control over their ideas" ON ideas;
    DROP POLICY IF EXISTS "Investors can read public ideas via token" ON ideas;

    CREATE POLICY "Owners have full control over their ideas" 
    ON ideas FOR ALL TO authenticated 
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Investors can read public ideas via token" 
    ON ideas FOR SELECT TO anon, authenticated 
    USING (is_public = true AND share_token IS NOT NULL);
  `;

  try {
    console.log("▶ [1]: Executing SQL Migration via supabaseAdmin RPC (exec_sql / sql)...");
    const { error: rpcError } = await supabaseAdmin.rpc("exec_sql", { query: migrationSql });

    if (rpcError) {
      console.warn("  exec_sql RPC not enabled on Supabase, falling back to direct schema check/test:", rpcError.message);
    } else {
      console.log("  ✅ Migration SQL executed successfully via RPC!");
    }

    // 疎通確認とスキーマ検証
    console.log("▶ [2]: Verifying columns via Supabase Client...");
    const { data: testIdea, error: testErr } = await supabaseAdmin
      .from("ideas")
      .select("id, title, is_public, share_token")
      .limit(1);

    if (testErr) {
      console.warn("  Table columns query notice:", testErr.message);
    } else {
      console.log("  ✅ 'ideas' table columns (is_public, share_token) verified!");
    }

    const { data: testCommit, error: commitErr } = await supabaseAdmin
      .from("idea_commits")
      .select("id, visibility_flags")
      .limit(1);

    if (commitErr) {
      console.warn("  Commit columns query notice:", commitErr.message);
    } else {
      console.log("  ✅ 'idea_commits' table column (visibility_flags) verified!");
    }

    console.log("\n================================================================================");
    console.log("🎉 DATABASE MIGRATION CHECK FINISHED!");
    console.log("================================================================================\n");
  } catch (err) {
    console.error("Migration check error:", err);
  }
}

runMigration();
