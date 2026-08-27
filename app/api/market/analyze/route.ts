import { NextRequest, NextResponse } from "next/server";
import { inngest } from "../../../../inngest/client";
import { supabaseAdmin } from "../../../../lib/supabaseClient";

/**
 * 市場分析ジョブ発火 API
 * POST /api/market/analyze
 * Body: { genreId?: string; genreName: string; userId?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const genreName = body.genreName || "Project Management & Task Automation";
    const genreId = body.genreId || crypto.randomUUID();
    const userId = body.userId || crypto.randomUUID();
    const jobId = crypto.randomUUID();

    // 1. 初期ステータスを Supabase に登録
    const { error: dbErr } = await supabaseAdmin.from("job_status").insert({
      id: jobId,
      user_id: userId,
      status: "INITIALIZING",
      percentage: 0,
      error_message: null,
      result_data: null,
    });

    if (dbErr) {
      console.error("[API /api/market/analyze] Supabase job_status insertion failed:", dbErr);
      throw new Error(`Failed to initialize job status in database: ${dbErr.message}`);
    }

    // 2. Inngest イベントを発行して非同期ジョブを起動
    await inngest.send({
      name: "market/analyze.requested",
      data: {
        jobId,
        genreId,
        genreName,
        userId,
      },
    });

    return NextResponse.json({
      success: true,
      jobId,
      genreId,
      genreName,
      message: "Market analysis job started successfully",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[API /api/market/analyze] Error handling request:", message, stack);
    return NextResponse.json(
      { success: false, error: message, stack: process.env.NODE_ENV === "development" ? stack : undefined },
      { status: 500 }
    );
  }
}
