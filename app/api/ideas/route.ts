import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getDefaultOrAuthUserId } from "../../../lib/supabaseClient";

/**
 * アイデア & コミット一覧取得 API
 * GET /api/ideas
 */
export async function GET(_req: NextRequest) {
  try {
    // 1. まず active_commit_id を含むクエリを試行
    let ideasData: any[] | null = null;

    const tryWithActiveCommit = await supabaseAdmin
      .from("ideas")
      .select("id, title, active_commit_id, created_at, updated_at, user_id, idea_commits(*)")
      .order("created_at", { ascending: false });

    if (tryWithActiveCommit.error) {
      // active_commit_id カラムが存在しない古いスキーマ環境へのフェイルソフト
      console.warn(
        "[API /api/ideas GET] Query with active_commit_id failed, falling back to base schema:",
        tryWithActiveCommit.error.message
      );
      const fallbackQuery = await supabaseAdmin
        .from("ideas")
        .select("id, title, created_at, updated_at, user_id, idea_commits(*)")
        .order("created_at", { ascending: false });

      if (fallbackQuery.error) {
        console.error("[API /api/ideas GET] Fallback query failed:", fallbackQuery.error);
        return NextResponse.json({ success: false, error: fallbackQuery.error.message }, { status: 500 });
      }
      ideasData = fallbackQuery.data;
    } else {
      ideasData = tryWithActiveCommit.data;
    }

    // 2. 各アイデアの active_commit_id が NULL または未定義の場合、
    // 該当アイデアのコミット履歴（最新コミット）から動的に HEAD を補完
    const sanitizedIdeas = (ideasData || []).map((idea: any) => {
      const commits = Array.isArray(idea.idea_commits) ? idea.idea_commits : [];
      let resolvedActiveCommitId = idea.active_commit_id || null;

      if (!resolvedActiveCommitId && commits.length > 0) {
        // 作成日時順で最新のコミットを HEAD として採用
        const sortedCommits = [...commits].sort((a: any, b: any) => {
          const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tA - tB;
        });
        resolvedActiveCommitId = sortedCommits[sortedCommits.length - 1]?.id || null;
      }

      return {
        ...idea,
        active_commit_id: resolvedActiveCommitId,
        idea_commits: commits,
      };
    });

    return NextResponse.json({ success: true, ideas: sanitizedIdeas });
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

    // 3. ideas.active_commit_id を作成した commitId (HEAD) に更新 (フェイルソフト)
    let updatedIdea = idea;
    try {
      const { data: resIdea, error: updateErr } = await supabaseAdmin
        .from("ideas")
        .update({
          active_commit_id: commitId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ideaId)
        .select()
        .single();

      if (!updateErr && resIdea) {
        updatedIdea = resIdea;
      }
    } catch (_err) {
      // スキーマに active_commit_id がない場合は無視
    }

    return NextResponse.json({
      success: true,
      idea: {
        ...updatedIdea,
        active_commit_id: updatedIdea.active_commit_id || commitId,
      },
      commit,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[API /api/ideas POST] Exception:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
