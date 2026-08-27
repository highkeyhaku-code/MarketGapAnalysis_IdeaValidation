import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseClient";
import { z } from "zod";

const UUID_SCHEMA = z.string().uuid();

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

    // UUID フォーマットの厳格バリデーション (ダミー文字列や不正IDを早期遮断)
    const uuidParseResult = UUID_SCHEMA.safeParse(id);
    if (!uuidParseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid Commit ID format: "${id}". A valid RFC 4122 UUID is required.`,
        },
        { status: 400 }
      );
    }

    const { data: commit, error } = await supabaseAdmin
      .from("idea_commits")
      .select("*, ideas(title, user_id)")
      .eq("id", id)
      .single();

    if (error || !commit) {
      return NextResponse.json(
        { success: false, error: error?.message || `Commit "${id}" not found in database.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, commit });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
