import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getAuthenticatedUserIdFromRequest } from "../../../../lib/supabaseClient";

/**
 * 単一アイデア（リポジトリ）& 全コミット履歴取得 API
 * GET /api/ideas/[id]
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Idea ID is required" }, { status: 400 });
    }

    const authUserId = await getAuthenticatedUserIdFromRequest(req);

    // 1. ideas テーブルからリポジトリ情報を取得 (is_public, share_token, active_commit_id に対応)
    let ideaData: any = null;
    const tryWithAll = await supabaseAdmin
      .from("ideas")
      .select("id, user_id, title, active_commit_id, is_public, share_token, created_at, updated_at")
      .eq("id", id)
      .single();

    if (tryWithAll.error) {
      const fallbackQuery = await supabaseAdmin
        .from("ideas")
        .select("id, user_id, title, created_at, updated_at")
        .eq("id", id)
        .single();

      if (fallbackQuery.error || !fallbackQuery.data) {
        return NextResponse.json(
          { success: false, error: fallbackQuery.error?.message || `Idea not found for ID: ${id}` },
          { status: 404 }
        );
      }
      ideaData = {
        ...fallbackQuery.data,
        is_public: false,
        share_token: id,
      };
    } else {
      ideaData = tryWithAll.data;
    }

    // 所有者隔離チェック: 非公開リポジトリは所有者本人のみ閲覧可能
    const isPublic = ideaData.is_public ?? false;
    if (!isPublic && (!authUserId || ideaData.user_id !== authUserId)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have access to this private idea repository." },
        { status: 403 }
      );
    }

    // 2. 該当 idea に属するすべてのコミット履歴を取得 (作成日時昇順)
    const { data: commits, error: commitsErr } = await supabaseAdmin
      .from("idea_commits")
      .select("*")
      .eq("idea_id", id)
      .order("created_at", { ascending: true });

    if (commitsErr) {
      console.error("[API /api/ideas/[id] GET] Commits fetch error:", commitsErr);
      return NextResponse.json({ success: false, error: commitsErr.message }, { status: 500 });
    }

    const commitList = commits || [];

    // 3. active_commit_id の解決 (未設定なら最新コミットを採用)
    let activeCommitId = ideaData.active_commit_id;
    if (!activeCommitId && commitList.length > 0) {
      activeCommitId = commitList[commitList.length - 1].id;
    }

    // 4. share_token のフォールバック
    const shareToken = ideaData.share_token || ideaData.id;

    return NextResponse.json({
      success: true,
      idea: {
        ...ideaData,
        is_public: isPublic,
        share_token: shareToken,
        active_commit_id: activeCommitId,
        idea_commits: commitList,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[API /api/ideas/[id] GET] Exception:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * アイデア公開設定更新 API
 * PATCH /api/ideas/[id]
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Idea ID is required" }, { status: 400 });
    }

    const authUserId = await getAuthenticatedUserIdFromRequest(req);
    const { data: targetIdea } = await supabaseAdmin
      .from("ideas")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (!targetIdea) {
      return NextResponse.json({ success: false, error: `Idea not found for ID: ${id}` }, { status: 404 });
    }
    if (!authUserId || targetIdea.user_id !== authUserId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to update this idea." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.is_public === "boolean") {
      updatePayload.is_public = body.is_public;
    }
    if (body.regenerate_token) {
      updatePayload.share_token = crypto.randomUUID();
    }

    // 1. ideas テーブル更新
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("ideas")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    // 2. idea_commits にも is_public を同期（スキーマ差異に対する堅牢化）
    if (typeof body.is_public === "boolean") {
      try {
        const { data: commits } = await supabaseAdmin
          .from("idea_commits")
          .select("id, q4_supplementary_pains")
          .eq("idea_id", id);

        if (commits && commits.length > 0) {
          for (const c of commits) {
            const currentPayload = typeof c.q4_supplementary_pains === "object" && c.q4_supplementary_pains !== null
              ? (c.q4_supplementary_pains as any)
              : {};
            currentPayload.is_public = body.is_public;
            await supabaseAdmin
              .from("idea_commits")
              .update({ q4_supplementary_pains: currentPayload })
              .eq("id", c.id);
          }
        }
      } catch (_syncErr) {}
    }

    if (updateErr) {
      return NextResponse.json({
        success: true,
        is_public: body.is_public ?? false,
        share_token: id,
        fallback: true,
      });
    }

    return NextResponse.json({
      success: true,
      idea: updated,
      is_public: updated.is_public ?? body.is_public ?? false,
      share_token: updated.share_token || id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[API /api/ideas/[id] PATCH] Exception:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * アイデア（リポジトリ）完全削除 API (Hard Delete)
 * DELETE /api/ideas/[id]
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Idea ID is required" }, { status: 400 });
    }

    const authUserId = await getAuthenticatedUserIdFromRequest(req);
    const { data: targetIdea } = await supabaseAdmin
      .from("ideas")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (!targetIdea) {
      return NextResponse.json({ success: false, error: `Idea not found for ID: ${id}` }, { status: 404 });
    }
    if (!authUserId || targetIdea.user_id !== authUserId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to delete this idea." },
        { status: 403 }
      );
    }

    // 1. 紐づく idea_commits を先に削除 (CASCADE未設定環境への安全策)
    const { error: commitDelErr } = await supabaseAdmin
      .from("idea_commits")
      .delete()
      .eq("idea_id", id);

    if (commitDelErr) {
      console.warn("[API /api/ideas/[id] DELETE] Commits deletion warning:", commitDelErr.message);
    }

    // 2. ideas レコードを削除
    const { error: ideaDelErr } = await supabaseAdmin
      .from("ideas")
      .delete()
      .eq("id", id);

    if (ideaDelErr) {
      console.error("[API /api/ideas/[id] DELETE] Idea deletion error:", ideaDelErr);
      return NextResponse.json({ success: false, error: ideaDelErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedIdeaId: id,
      message: `Idea repository ${id} and all its commit history have been permanently deleted.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[API /api/ideas/[id] DELETE] Exception:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

