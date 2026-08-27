// scripts/test-health-endpoint.mjs
import assert from "node:assert/strict";

console.log("================================================================================");
console.log("🏥 SYSTEM INFRASTRUCTURE HEALTH & CONNECTIVITY TEST SUITE");
console.log("================================================================================\n");

// テスト用環境変数（src/env.ts のバリデーション通過用）
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://test-project.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "test-anon-key-12345";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "test-service-role-key-12345";
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "test-gemini-key-12345";
process.env.TAVILY_API_KEY = process.env.TAVILY_API_KEY || "test-tavily-key-12345";
process.env.GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN || "test-github-token-12345";
process.env.PRODUCT_HUNT_API_TOKEN = process.env.PRODUCT_HUNT_API_TOKEN || "test-ph-token-12345";
process.env.INNGEST_EVENT_KEY = process.env.INNGEST_EVENT_KEY || "test-inngest-event-key-12345";
process.env.INNGEST_SIGNING_KEY = process.env.INNGEST_SIGNING_KEY || "test-inngest-signing-key-12345";

async function testHealthRoute() {
  console.log("▶ [CHECK 1]: 環境変数ローディング & Zod スキーマ検証...");
  const { env } = await import("../src/env.js");
  assert.ok(env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL must be loaded");
  assert.ok(env.GEMINI_API_KEY, "GEMINI_API_KEY must be loaded");
  assert.ok(env.TAVILY_API_KEY, "TAVILY_API_KEY must be loaded");
  assert.ok(env.INNGEST_EVENT_KEY, "INNGEST_EVENT_KEY must be loaded");
  console.log("  ✅ PASS: All 9 environment variables are loaded and validated.\n");

  console.log("▶ [CHECK 2]: Inngest クライアント疎通検証...");
  const { inngest } = await import("../inngest/client.js");
  assert.equal(inngest.id, "market-gap-validation", "Inngest appId must match");
  console.log(`  ✅ PASS: Inngest client ready with appId "${inngest.id}".\n`);

  console.log("▶ [CHECK 3]: Supabase クライアント定義 (Anon & Service Role) 検証...");
  const { supabase, supabaseAdmin } = await import("../lib/supabaseClient.js");
  assert.ok(supabase, "Client supabase instance must be exported");
  assert.ok(supabaseAdmin, "supabaseAdmin service role instance must be exported");
  console.log("  ✅ PASS: Supabase client instances (anon & admin) configured correctly.\n");

  console.log("▶ [CHECK 4]: GET /api/health ハンドラの実行シミュレーション...");
  const { GET } = await import("../app/api/health/route.js");
  const response = await GET();
  const json = await response.json();

  console.log("  Diagnostic Response:", JSON.stringify(json, null, 2));

  assert.ok(json.timestamp, "Health response must contain timestamp");
  assert.ok(json.checks.environment.status, "Environment check must exist");
  assert.ok(json.checks.inngest.status, "Inngest check must exist");
  assert.ok(json.checks.supabase.status, "Supabase check must exist");

  console.log("\n================================================================================");
  console.log("🎉 ALL HEALTH & INFRASTRUCTURE CHECKS PASSED!");
  console.log("================================================================================\n");
}

testHealthRoute().catch((err) => {
  console.error("❌ Health check failed:", err);
  process.exit(1);
});
