import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseClient";

/**
 * ジョブステータス取得 API
 * GET /api/market/status/[id]
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    // 1. まず job_status.id = id で検索
    const { data: jobData, error: jobError } = await supabaseAdmin
      .from("job_status")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (jobData) {
      return NextResponse.json({ success: true, job: jobData });
    }

    // 2. job_status に直接見つからない場合、idea_commits.id = id (commitId) で検索
    const { data: commitData, error: commitError } = await supabaseAdmin
      .from("idea_commits")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (commitData) {
      let status = "🔎 倒すべき最大の標的のスペックを解析中...";
      let percentage = 20;

      if (commitData.status === "completed") {
        status = "COMPLETED";
        percentage = 100;
      } else if (commitData.status === "failed") {
        status = "FAILED";
        percentage = 0;
      } else if (commitData.status === "validating" || commitData.status === "analyzing") {
        status = "💀 過去の類似プロジェクトの『死骸』を探索中...";
        percentage = 50;
      }

      const syntheticJob = {
        id,
        status,
        percentage,
        error_message: commitData.status === "failed" ? "検証ジョブの実行に失敗しました。" : null,
        result_data: commitData.q4_supplementary_pains,
        created_at: commitData.created_at,
        updated_at: commitData.created_at,
      };

      return NextResponse.json({ success: true, job: syntheticJob });
    }

    return NextResponse.json(
      { error: jobError?.message || commitError?.message || `Job status not found for ID: ${id}` },
      { status: 404 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
