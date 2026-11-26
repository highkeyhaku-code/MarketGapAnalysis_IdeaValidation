import { NextRequest, NextResponse } from "next/server";
import {
  supabaseAdmin,
  getDefaultOrAuthUserId,
  getAuthenticatedUserIdFromRequest,
} from "../../../../lib/supabaseClient";
import { inngest } from "../../../../inngest/client";
import { IdeaInputSchema, DomainType } from "../../../../schemas/zod";
import { Json } from "../../../../types/database";

/**
 * 新規アイデアコミット作成 & 仮説クラッシュジョブ起動 API
 * POST /api/ideas/commit
 * Body: { ideaInput: IdeaInput, parentCommitId?: string, ideaId?: string, domain?: DomainType, userId?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      ideaInput,
      parentCommitId,
      ideaId: providedIdeaId,
      domain,
      userId: providedUserId,
      keywords,
      targetDomainKeywords,
    } = body;
    const eventKeywords = Array.isArray(keywords)
      ? keywords
      : Array.isArray(targetDomainKeywords)
      ? targetDomainKeywords
      : undefined;

    // 1. Zod スキーマによる入力検証
    const validatedInput = IdeaInputSchema.parse(ideaInput);

    const authUserId = await getAuthenticatedUserIdFromRequest(req);
    const userId = authUserId || (await getDefaultOrAuthUserId(providedUserId));
    let ideaId = providedIdeaId;

    // 2. ピボット時の ideaId 解決 (親コミットから親の idea_id を厳格に取得 + 所有者チェック)
    if (parentCommitId) {
      const { data: parentCommit, error: parentErr } = await supabaseAdmin
        .from("idea_commits")
        .select("id, idea_id, ideas(user_id)")
        .eq("id", parentCommitId)
        .single();

      if (parentErr || !parentCommit) {
        console.error(`[API /api/ideas/commit] Parent commit ${parentCommitId} not found:`, parentErr);
        return NextResponse.json(
          { success: false, error: `Parent commit "${parentCommitId}" was not found.` },
          { status: 404 }
        );
      }

      const parentOwnerId = (parentCommit as any).ideas?.user_id;
      if (authUserId && parentOwnerId && parentOwnerId !== authUserId) {
        return NextResponse.json(
          { success: false, error: "Forbidden: You do not have permission to branch from this commit." },
          { status: 403 }
        );
      }

      ideaId = parentCommit.idea_id;
    } else if (ideaId && authUserId) {
      // 既存 ideaId 指定時も所有者一致を検証
      const { data: existingIdea } = await supabaseAdmin
        .from("ideas")
        .select("id, user_id")
        .eq("id", ideaId)
        .maybeSingle();

      if (existingIdea && existingIdea.user_id !== authUserId) {
        return NextResponse.json(
          { success: false, error: "Forbidden: You do not have permission to commit to this idea." },
          { status: 403 }
        );
      }
    }

    // 3. 親コミットも既存 ideaId も指定されていない完全新規作成時のみ ideas 親レコードを作成
    if (!ideaId) {
      const { data: newIdea, error: ideaErr } = await supabaseAdmin
        .from("ideas")
        .insert({
          id: crypto.randomUUID(),
          user_id: userId,
          title: validatedInput.q1_target_pain.slice(0, 50) + "...",
        })
        .select()
        .single();

      if (ideaErr || !newIdea) {
        console.error("[API /api/ideas/commit] Error creating idea record:", ideaErr);
        throw new Error(`Failed to create idea parent record: ${ideaErr?.message}`);
      }
      ideaId = newIdea.id;
    }

    const commitId = crypto.randomUUID();
    const jobId = crypto.randomUUID();

    // 4.2 非公開設定フラグ (Secure by Default)
    const visibilityFlags = {
      q1_target_pain: body.visibilityFlags?.q1_target_pain ?? true,
      q2_solution: body.visibilityFlags?.q2_solution ?? false,
      q3_core_edge: body.visibilityFlags?.q3_core_edge ?? false,
      q4_supplementary_pains: body.visibilityFlags?.q4_supplementary_pains ?? true,
    };

    // 4. idea_commits にイミュータブルな新規コミットを INSERT (状態: analyzing)
    const basePains = Array.isArray(validatedInput.q4_supplementary_pains)
      ? validatedInput.q4_supplementary_pains
      : [];

    const commitInsertPayload: any = {
      id: commitId,
      idea_id: ideaId,
      parent_commit_id: parentCommitId || null,
      q1_target_pain: validatedInput.q1_target_pain,
      q2_solution: validatedInput.q2_solution,
      q3_core_edge: validatedInput.q3_core_edge,
      q4_target_literacy: validatedInput.q4_target_literacy,
      q4_monetization_model: validatedInput.q4_monetization_model,
      q4_supplementary_pains: {
        rawPains: basePains,
        visibility_flags: visibilityFlags,
        is_public: false, // Secure by Default: 作成時は非公開
      } as unknown as Json,
      status: "analyzing",
      emotional_score: null,
      semantic_diff: parentCommitId
        ? `Branched from parent commit ${parentCommitId.slice(0, 8)}`
        : "Initial hypothesis commit",
      target_coordinates: null,
    };

    // visibility_flags カラムへの書き込みを試行 (デュアルストレージ)
    try {
      commitInsertPayload.visibility_flags = visibilityFlags;
    } catch (_e) {}

    let { error: commitErr } = await supabaseAdmin.from("idea_commits").insert(commitInsertPayload);

    if (commitErr && commitErr.message?.includes("visibility_flags")) {
      // visibility_flags カラムが存在しない古いスキーマへのフォールバック
      delete commitInsertPayload.visibility_flags;
      const retryRes = await supabaseAdmin.from("idea_commits").insert(commitInsertPayload);
      commitErr = retryRes.error;
    }

    if (commitErr) {
      console.error("[API /api/ideas/commit] Error inserting idea_commit:", commitErr);
      throw new Error(`Failed to insert idea_commit: ${commitErr.message}`);
    }

    // 【重要: HEAD保護】
    // active_commit_id はここでは更新しない。Inngestジョブが正常完了した場合のみ
    // runHypothesisCrashJob の save-final-results-and-checkout-head ステップで更新する。
    // updated_at のみ更新して更新日時を記録。
    try {
      await supabaseAdmin
        .from("ideas")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", ideaId);
    } catch (_err) {
      // ログのみ
    }

    // 4. 初期 job_status を作成
    const { error: jobErr } = await supabaseAdmin.from("job_status").insert({
      id: jobId,
      user_id: userId,
      status: "INITIALIZING_CRASH_ENGINE",
      percentage: 5,
      error_message: null,
      result_data: null,
    });

    if (jobErr) {
      console.error("[API /api/ideas/commit] Error creating job_status:", jobErr);
    }

    // 5. Inngest ジョブを発火 (開発環境などでInngestがオフラインでもフェイルソフトに処理)
    try {
      await inngest.send({
        name: "hypothesis/crash.requested",
        data: {
          jobId,
          commitId,
          ideaId,
          userId,
          domain: (domain as DomainType) || "B2B_SME",
          targetPain: validatedInput.q1_target_pain,
          solution: validatedInput.q2_solution,
          coreEdge: validatedInput.q3_core_edge,
          keywords: eventKeywords,
          visibilityFlags,
        },
      });
    } catch (inngestErr) {
      console.warn("[API /api/ideas/commit] Inngest event send warning (offline fallback):", inngestErr);
    }

    return NextResponse.json({
      success: true,
      commitId,
      jobId,
      ideaId,
      parentCommitId: parentCommitId || null,
      message: "Idea commit created and hypothesis crash job triggered.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[API /api/ideas/commit] Error processing commit request:", message, stack);
    return NextResponse.json(
      { success: false, error: message, stack: process.env.NODE_ENV === "development" ? stack : undefined },
      { status: 500 }
    );
  }
}
