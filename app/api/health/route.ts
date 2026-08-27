import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseClient";
import { inngest } from "../../../inngest/client";
import { env } from "../../../src/env";

export interface HealthCheckItem {
  status: "OK" | "NG";
  message: string;
  details?: Record<string, any>;
}

export interface HealthCheckResponse {
  healthy: boolean;
  timestamp: string;
  checks: {
    environment: HealthCheckItem;
    supabase: HealthCheckItem;
    inngest: HealthCheckItem;
  };
}

/**
 * システム健全性・インフラ疎通診断 API
 * GET /api/health
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  let allHealthy = true;

  // 1. 環境変数のロードテスト (src/env.ts 経由)
  let envCheck: HealthCheckItem;
  try {
    const requiredKeys = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "GEMINI_API_KEY",
      "TAVILY_API_KEY",
      "GITHUB_ACCESS_TOKEN",
      "PRODUCT_HUNT_API_TOKEN",
      "INNGEST_EVENT_KEY",
      "INNGEST_SIGNING_KEY",
    ] as const;

    const missingKeys: string[] = [];
    const keySummary: Record<string, string> = {};

    for (const key of requiredKeys) {
      const val = env[key as keyof typeof env];
      if (!val || typeof val !== "string" || val.trim().length === 0) {
        missingKeys.push(key);
      } else {
        keySummary[key] = `Loaded (length: ${val.length})`;
      }
    }

    if (missingKeys.length > 0) {
      allHealthy = false;
      envCheck = {
        status: "NG",
        message: `Missing or empty environment variables: ${missingKeys.join(", ")}`,
        details: { missingKeys },
      };
    } else {
      envCheck = {
        status: "OK",
        message: "All 9 required environment variables are loaded and validated via Zod schema.",
        details: keySummary,
      };
    }
  } catch (err: unknown) {
    allHealthy = false;
    const msg = err instanceof Error ? err.message : String(err);
    envCheck = {
      status: "NG",
      message: `Environment schema validation error: ${msg}`,
    };
  }

  // 2. Supabase (Service Role) 接続テスト
  let supabaseCheck: HealthCheckItem;
  try {
    const startTime = Date.now();
    const { data, error } = await supabaseAdmin
      .from("genres")
      .select("id, name")
      .limit(1);

    const latencyMs = Date.now() - startTime;

    if (error) {
      allHealthy = false;
      supabaseCheck = {
        status: "NG",
        message: `Supabase query error: ${error.message} (Code: ${error.code})`,
        details: { code: error.code, hint: error.hint },
      };
    } else {
      supabaseCheck = {
        status: "OK",
        message: `Supabase connection verified in ${latencyMs}ms. Service Role authentication active.`,
        details: { latencyMs, sampleRecordFound: Boolean(data && data.length > 0) },
      };
    }
  } catch (err: unknown) {
    allHealthy = false;
    const msg = err instanceof Error ? err.message : String(err);
    supabaseCheck = {
      status: "NG",
      message: `Supabase connection exception: ${msg}`,
    };
  }

  // 3. Inngest クライアント疎通テスト
  let inngestCheck: HealthCheckItem;
  try {
    if (!inngest || !inngest.id) {
      allHealthy = false;
      inngestCheck = {
        status: "NG",
        message: "Inngest client instance is undefined or missing app ID.",
      };
    } else {
      inngestCheck = {
        status: "OK",
        message: `Inngest client initialized with appId: "${inngest.id}". Event endpoints ready.`,
        details: { appId: inngest.id },
      };
    }
  } catch (err: unknown) {
    allHealthy = false;
    const msg = err instanceof Error ? err.message : String(err);
    inngestCheck = {
      status: "NG",
      message: `Inngest client verification exception: ${msg}`,
    };
  }

  const responseBody: HealthCheckResponse = {
    healthy: allHealthy,
    timestamp,
    checks: {
      environment: envCheck,
      supabase: supabaseCheck,
      inngest: inngestCheck,
    },
  };

  return NextResponse.json(responseBody, {
    status: allHealthy ? 200 : 503,
  });
}
