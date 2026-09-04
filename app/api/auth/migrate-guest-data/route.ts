import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getDefaultOrAuthUserId } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

interface MigrateGuestDataRequest {
  guestSessionId: string;
  draftIdeas: Array<{
    id: string; // client UUID (冪等キー)
    title: string;
    domain?: string;
    ideaInput: {
      q1_target_pain: string;
      q2_solution: string;
      q3_core_edge: string;
      q4_target_literacy?: string;
      q4_monetization_model?: string;
      q4_supplementary_pains?: any;
    };
    keywords?: string[];
    createdAt?: number;
  }>;
  guestCredits?: number;
}

/**
 * ゲストデータ移行 API
 * POST /api/auth/migrate-guest-data
 * 
 * 冪等性保護: クライアントで発番されたUUIDを用いたUPSERTを行い、重複作成を防止する。
 */
export async function POST(req: NextRequest) {
  try {
    const body: MigrateGuestDataRequest = await req.json();
    const { guestSessionId, draftIdeas } = body;

    if (!draftIdeas || !Array.isArray(draftIdeas)) {
      return NextResponse.json(
        { success: false, error: "Invalid draftIdeas payload" },
        { status: 400 }
      );
    }

    // 認証ユーザーIDの取得 (認証ヘッダーまたはセッション)
    const authHeader = req.headers.get("authorization");
    let targetUserId: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      if (userData?.user?.id) {
        targetUserId = userData.user.id;
      }
    }

    // 未認証時のフォールバック (テスト/ローカル環境)
    if (!targetUserId) {
      targetUserId = await getDefaultOrAuthUserId();
    }

    console.log(`📦 [MigrateGuestData] Migrating ${draftIdeas.length} drafts for user: ${targetUserId} (session: ${guestSessionId})`);

    const migratedIdeas: Array<{ ideaId: string; commitId: string; title: string; action: "created" | "updated" }> = [];

    for (const draft of draftIdeas) {
      if (!draft.id || !draft.ideaInput) continue;

      const ideaId = draft.id;
      const title = draft.title || draft.ideaInput.q1_target_pain?.slice(0, 50) || "Untitled Idea";

      // 1. ideas テーブルに UPSERT (冪等性保護)
      const { data: existingIdea } = await supabaseAdmin
        .from("ideas")
        .select("id, user_id")
        .eq("id", ideaId)
        .single();

      let action: "created" | "updated" = existingIdea ? "updated" : "created";

      // ユーザーIDの書き換えとレコードのUPSERT
      const { error: ideaError } = await supabaseAdmin
        .from("ideas")
        .upsert(
          {
            id: ideaId,
            user_id: targetUserId,
            title: title,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (ideaError) {
        console.error(`❌ [MigrateGuestData] Failed to upsert idea ${ideaId}:`, ideaError.message);
        continue;
      }

      // 2. idea_commits に初期ドラフトコミットを UPSERT (決定論的ID)
      // 同じ ideaId から常に同一の初期 commitId を導出して冪等を担保
      const commitId = ideaId;

      const supplementaryPainsPayload = {
        q4_supplementary_pains: draft.ideaInput.q4_supplementary_pains || [],
        targetDomainKeywords: draft.keywords || [],
        migratedFromGuestSession: guestSessionId,
      };

      const { error: commitError } = await supabaseAdmin
        .from("idea_commits")
        .upsert(
          {
            id: commitId,
            idea_id: ideaId,
            parent_commit_id: null,
            status: "draft",
            q1_target_pain: draft.ideaInput.q1_target_pain,
            q2_solution: draft.ideaInput.q2_solution,
            q3_core_edge: draft.ideaInput.q3_core_edge,
            q4_supplementary_pains: supplementaryPainsPayload,
          },
          { onConflict: "id" }
        );

      if (commitError) {
        console.error(`❌ [MigrateGuestData] Failed to upsert commit ${commitId}:`, commitError.message);
      }

      // 3. ideas.active_commit_id を安全に更新 (カラムが存在する場合)
      try {
        await supabaseAdmin
          .from("ideas")
          .update({ active_commit_id: commitId } as any)
          .eq("id", ideaId);
      } catch (_e) {}

      migratedIdeas.push({
        ideaId,
        commitId,
        title,
        action,
      });
    }

    console.log(`✅ [MigrateGuestData] Successfully migrated ${migratedIdeas.length} drafts!`);

    return NextResponse.json({
      success: true,
      migratedCount: migratedIdeas.length,
      migratedIdeas,
      userId: targetUserId,
      message: `Successfully migrated ${migratedIdeas.length} guest ideas to your account.`,
    });
  } catch (err: any) {
    console.error("❌ [MigrateGuestData] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to migrate guest data" },
      { status: 500 }
    );
  }
}
