import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseClient";

/**
 * コミットデータ取得 API
 * GET /api/ideas/commit/[id]
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Commit ID is required" }, { status: 400 });
    }

    const { data: commit, error } = await supabaseAdmin
      .from("idea_commits")
      .select("*, ideas(title, user_id)")
      .eq("id", id)
      .single();

    if (error || !commit) {
      return NextResponse.json({ error: error?.message || "Commit not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, commit });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
