import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseClient";

/**
 * ジョブキャンセル API
 * POST /api/job/cancel
 * Body: { jobId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    await supabaseAdmin
      .from("job_status")
      .update({
        status: "CANCELLED",
        error_message: "Job was cancelled by user via Kanban drag & drop",
      })
      .eq("id", jobId);

    return NextResponse.json({ success: true, message: "Job cancelled successfully" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
