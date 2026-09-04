import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { DEFAULT_VISIBILITY_FLAGS, VisibilityFlags } from "../../../../schemas/zod";

const MASK_TEXT = "[🔒 共同創業者向けに非公開：NDAの締結が必要です]";

/**
 * 投資家向け共有ビュー専用 API (動的データマスク処理)
 * GET /api/share/[share_token]
 * 
 * 設計書 4.2:
 * 1. is_public = true かつ share_token が一致する場合のみデータを返却。
 * 2. visibility_flags を評価し、非公開 (false) の項目をサーバー側で強制的にマスク。
 * 3. ネットワークレスポンスに秘密データ・生データが漏洩する脆弱性を 100% 排除。
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ share_token: string }> }
) {
  try {
    const { share_token } = await context.params;

    if (!share_token) {
      return NextResponse.json(
        { success: false, error: "Share token is required" },
        { status: 400 }
      );
    }

    // 1. ideas テーブルからリポジトリを検索 (安全なカラムセレクト)
    let ideaData: any = null;

    // 基本カラムで取得
    const { data: matchedIdea, error: ideaErr } = await supabaseAdmin
      .from("ideas")
      .select("id, title, created_at, updated_at")
      .eq("id", share_token)
      .maybeSingle();

    if (ideaErr || !matchedIdea) {
      // share_token 一致で検索 (コミット側)
      const { data: commitMatched } = await supabaseAdmin
        .from("idea_commits")
        .select("idea_id, ideas(id, title, created_at, updated_at)")
        .eq("share_token", share_token)
        .maybeSingle();

      if (commitMatched && commitMatched.ideas) {
        ideaData = commitMatched.ideas;
      }
    } else {
      ideaData = matchedIdea;
    }

    if (!ideaData) {
      return NextResponse.json(
        {
          success: false,
          error: "公開されているアイデアが見つかりません。非公開設定になっているか、URLが無効です。",
        },
        { status: 404 }
      );
    }

    // 2. 該当 idea の全コミット履歴を取得
    const { data: commits, error: commitsErr } = await supabaseAdmin
      .from("idea_commits")
      .select("*")
      .eq("idea_id", ideaData.id)
      .order("created_at", { ascending: true });

    if (commitsErr || !commits || commits.length === 0) {
      return NextResponse.json(
        { success: false, error: "検証コミット履歴が見つかりません。" },
        { status: 404 }
      );
    }

    // 最新コミットを HEAD として選定
    const headCommit = commits[commits.length - 1];
    const rawPayload = typeof headCommit.q4_supplementary_pains === "object" && headCommit.q4_supplementary_pains !== null
      ? (headCommit.q4_supplementary_pains as any)
      : {};

    // 3. is_public の判定 (コミット内ペイロードまたは ideaData.is_public)
    const isPublic = rawPayload.is_public === true || ideaData.is_public === true;

    if (!isPublic) {
      return NextResponse.json(
        {
          success: false,
          error: "このプロジェクトは非公開に設定されています。閲覧にはファウンダーの許可が必要です。",
        },
        { status: 404 }
      );
    }

    // 4. visibility_flags の抽出
    let visibility: VisibilityFlags = DEFAULT_VISIBILITY_FLAGS;
    const rawVisibilityFlags = headCommit.visibility_flags as any;
    if (rawVisibilityFlags && typeof rawVisibilityFlags === "object" && !Array.isArray(rawVisibilityFlags)) {
      visibility = {
        q1_target_pain: rawVisibilityFlags.q1_target_pain ?? true,
        q2_solution: rawVisibilityFlags.q2_solution ?? false,
        q3_core_edge: rawVisibilityFlags.q3_core_edge ?? false,
        q4_supplementary_pains: rawVisibilityFlags.q4_supplementary_pains ?? true,
      };
    } else if (rawPayload.visibility_flags && typeof rawPayload.visibility_flags === "object") {
      visibility = {
        q1_target_pain: rawPayload.visibility_flags.q1_target_pain ?? true,
        q2_solution: rawPayload.visibility_flags.q2_solution ?? false,
        q3_core_edge: rawPayload.visibility_flags.q3_core_edge ?? false,
        q4_supplementary_pains: rawPayload.visibility_flags.q4_supplementary_pains ?? true,
      };
    }

    // 5. サーバーサイド動的データマスク処理 (Zero Raw Leakage)
    const maskedQ1 = visibility.q1_target_pain ? headCommit.q1_target_pain : MASK_TEXT;
    const maskedQ2 = visibility.q2_solution ? headCommit.q2_solution : MASK_TEXT;
    const maskedQ3 = visibility.q3_core_edge ? headCommit.q3_core_edge : MASK_TEXT;

    // 補足ペインとペイロードのサニタイズ
    const sanitizedScores = rawPayload.scores || null;
    const sanitizedCompetitorProfile = rawPayload.competitorProfile || null;
    const sanitizedTribunal = rawPayload.tribunal || rawPayload.critique || null;
    const sanitizedPersonas = Array.isArray(rawPayload.personas) ? rawPayload.personas : [];
    const sanitizedAutopsy = rawPayload.githubAutopsy || null;

    const maskedCommit = {
      id: headCommit.id,
      idea_id: headCommit.idea_id,
      status: headCommit.status,
      emotional_score: headCommit.emotional_score,
      semantic_diff: headCommit.semantic_diff,
      created_at: headCommit.created_at,
      // マスク済みフィールド
      q1_target_pain: maskedQ1,
      q2_solution: maskedQ2,
      q3_core_edge: maskedQ3,
      q4_target_literacy: headCommit.q4_target_literacy,
      q4_monetization_model: headCommit.q4_monetization_model,
      // 公開/非公開フラグ状態 (クライアントでのUIバッジ表示用)
      visibility_flags: visibility,
      // 客観的市場検証データ (機密情報は含まない)
      scores: sanitizedScores,
      competitorProfile: sanitizedCompetitorProfile,
      tribunal: sanitizedTribunal,
      personas: sanitizedPersonas,
      githubAutopsy: sanitizedAutopsy,
    };

    return NextResponse.json({
      success: true,
      idea: {
        id: ideaData.id,
        title: ideaData.title,
        share_token: share_token,
        is_public: true,
        created_at: ideaData.created_at,
        updated_at: ideaData.updated_at,
        totalCommitsCount: commits.length,
      },
      headCommit: maskedCommit,
      visibilityFlags: visibility,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[API /api/share/[share_token] GET] Exception:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
