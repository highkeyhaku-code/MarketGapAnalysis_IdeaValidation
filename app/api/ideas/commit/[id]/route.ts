import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getAuthenticatedUserIdFromRequest } from "../../../../../lib/supabaseClient";
import { z } from "zod";

const UUID_SCHEMA = z.string().uuid();

/**
 * コミットデータ取得 API
 * GET /api/ideas/commit/[id]
 */
export async function GET(
  req: NextRequest,
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

    const authUserId = await getAuthenticatedUserIdFromRequest(req);

    let { data: commit, error } = await supabaseAdmin
      .from("idea_commits")
      .select("*, ideas(title, user_id, is_public)")
      .eq("id", id)
      .single();

    if (error && error.message?.includes("is_public")) {
      const fallback = await supabaseAdmin
        .from("idea_commits")
        .select("*, ideas(title, user_id)")
        .eq("id", id)
        .single();
      commit = fallback.data as any;
      error = fallback.error;
    }

    if (error || !commit) {
      return NextResponse.json(
        { success: false, error: error?.message || `Commit "${id}" not found in database.` },
        { status: 404 }
      );
    }

    const parentIdea = (commit as any).ideas;
    const isPublic = Boolean(parentIdea?.is_public || (commit.q4_supplementary_pains as any)?.is_public);
    if (!isPublic && (!authUserId || parentIdea?.user_id !== authUserId)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have access to this private commit." },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, commit });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
