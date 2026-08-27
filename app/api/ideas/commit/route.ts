import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseClient";
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
    const { ideaInput, parentCommitId, ideaId: providedIdeaId, domain, userId: providedUserId } = body;

    // 1. Zod スキーマによる入力検証
    const validatedInput = IdeaInputSchema.parse(ideaInput);

    const userId = providedUserId || crypto.randomUUID();
    let ideaId = providedIdeaId;

    // 2. アイデア親レコードが存在しない場合は新規作成
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
        throw new Error(`Failed to create idea parent record: ${ideaErr?.message}`);
      }
      ideaId = newIdea.id;
    }

    const commitId = crypto.randomUUID();
    const jobId = crypto.randomUUID();

    // 3. idea_commits にイミュータブルな新規コミットを INSERT
    const { error: commitErr } = await supabaseAdmin.from("idea_commits").insert({
      id: commitId,
      idea_id: ideaId,
      parent_commit_id: parentCommitId || null,
      q1_target_pain: validatedInput.q1_target_pain,
      q2_solution: validatedInput.q2_solution,
      q3_core_edge: validatedInput.q3_core_edge,
      q4_target_literacy: validatedInput.q4_target_literacy,
      q4_monetization_model: validatedInput.q4_monetization_model,
      q4_supplementary_pains: (validatedInput.q4_supplementary_pains || []) as unknown as Json,
      status: "analyzing",
      emotional_score: null,
      semantic_diff: parentCommitId
        ? `Branched from parent commit ${parentCommitId.slice(0, 8)}`
        : "Initial hypothesis commit",
      target_coordinates: null,
    });

    if (commitErr) {
      throw new Error(`Failed to insert idea_commit: ${commitErr.message}`);
    }

    // 4. 初期 job_status を作成
    await supabaseAdmin.from("job_status").insert({
      id: jobId,
      user_id: userId,
      status: "INITIALIZING_CRASH_ENGINE",
      percentage: 5,
      error_message: null,
      result_data: null,
    });

    // 5. Inngest ジョブを発火
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
      },
    });

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
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
