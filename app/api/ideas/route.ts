import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getDefaultOrAuthUserId } from "../../../lib/supabaseClient";

/**
 * アイデア & コミット一覧取得 API
 * GET /api/ideas
 */
export async function GET(_req: NextRequest) {
  try {
    // ideas テーブルと最新の idea_commits を取得
    const { data: ideas, error } = await supabaseAdmin
      .from("ideas")
      .select("id, title, created_at, user_id, idea_commits(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[API /api/ideas GET] Failed to fetch ideas:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, ideas: ideas || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[API /api/ideas GET] Exception:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * 新規アイデアドラフト作成 API
 * POST /api/ideas
 * Body: { title?: string; userId?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = await getDefaultOrAuthUserId(body.userId);
    const title = body.title || "新規仮説ドラフト";
    const ideaId = crypto.randomUUID();
    const commitId = crypto.randomUUID();

    // 1. ideas テーブルに新規 INSERT
    const { data: idea, error: ideaErr } = await supabaseAdmin
      .from("ideas")
      .insert({
        id: ideaId,
        user_id: userId,
        title,
      })
      .select()
      .single();

    if (ideaErr || !idea) {
      console.error("[API /api/ideas POST] Error creating idea:", ideaErr);
      throw new Error(`Failed to create idea: ${ideaErr?.message}`);
    }

    // 2. idea_commits に初期ドラフトコミットを INSERT
    const { data: commit, error: commitErr } = await supabaseAdmin
      .from("idea_commits")
      .insert({
        id: commitId,
        idea_id: ideaId,
        parent_commit_id: null,
        q1_target_pain: "未定義のターゲットペイン（ウィザードで入力してください）",
        q2_solution: "未定義のソリューション（ウィザードで入力してください）",
        q3_core_edge: "未定義のコア優位性（ウィザードで入力してください）",
        q4_target_literacy: "intermediate",
        q4_monetization_model: "subscription",
        q4_supplementary_pains: [],
        status: "draft",
        emotional_score: null,
        semantic_diff: "Initial draft created via Kanban",
      })
      .select()
      .single();

    if (commitErr || !commit) {
      console.error("[API /api/ideas POST] Error creating draft commit:", commitErr);
      throw new Error(`Failed to create draft commit: ${commitErr?.message}`);
    }

    return NextResponse.json({
      success: true,
      idea,
      commit,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[API /api/ideas POST] Exception:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
