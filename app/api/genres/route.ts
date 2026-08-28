import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseClient";

export interface GenreRecord {
  id: string;
  level: number;
  parent_id: string | null;
  canonical_name: string;
  description: string | null;
  status: "active" | "stagnant" | "deprecated";
  created_at: string;
  updated_at: string;
  subgenres?: GenreRecord[];
}

/**
 * 市場ジャンル辞書 (Taxonomy) 取得 API
 * GET /api/genres
 * Query parameters:
 *  - level: 1 | 2
 *  - status: "active" | "stagnant" | "deprecated" | "all"
 *  - search: string (検索キーワード)
 *  - parentId: string
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const levelParam = searchParams.get("level");
    const statusParam = searchParams.get("status");
    const searchParam = searchParams.get("search");
    const parentIdParam = searchParams.get("parentId");

    let query = supabaseAdmin.from("genres").select("*").order("level", { ascending: true }).order("canonical_name", { ascending: true });

    if (levelParam) {
      query = query.eq("level", parseInt(levelParam, 10));
    }
    if (statusParam && statusParam !== "all") {
      query = query.eq("status", statusParam);
    }
    if (parentIdParam) {
      query = query.eq("parent_id", parentIdParam);
    }
    if (searchParam && searchParam.trim().length > 0) {
      query = query.or(`canonical_name.ilike.%${searchParam.trim()}%,description.ilike.%${searchParam.trim()}%`);
    }

    const { data: genres, error } = await query;

    if (error) {
      console.error("[API /api/genres GET] Error querying genres:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const allGenres: GenreRecord[] = (genres || []) as GenreRecord[];

    // 階層構造 (L1 -> L2) の組み立て
    const l1Genres = allGenres.filter((g) => g.level === 1);
    const l2Genres = allGenres.filter((g) => g.level === 2);

    const hierarchical = l1Genres.map((l1) => ({
      ...l1,
      subgenres: l2Genres.filter((l2) => l2.parent_id === l1.id),
    }));

    return NextResponse.json({
      success: true,
      totalCount: allGenres.length,
      genres: allGenres,
      hierarchical,
      l1Genres,
      l2Genres,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[API /api/genres GET] Exception:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
