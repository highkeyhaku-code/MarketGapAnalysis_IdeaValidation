/**
 * ツリー描画用コミットノード型定義 (IdeaCommitNode)
 * Git for Ideas のコミットツリー、ブランチ、差分描画で使用する。
 */
export interface IdeaCommitNode {
  id: string;
  parentId: string | null;
  version: string | number;
  title: string;
  score: number | null;
  status: 'draft' | 'analyzing' | 'validated' | 'rejected' | string;
  createdAt: string;
  // UIツリー描画用の拡張フィールド（子ノードリスト、深さ等）
  children?: IdeaCommitNode[];
  depth?: number;
  metadata?: {
    emotionalScore?: number | null;
    semanticDiff?: string | null;
    shareToken?: string | null;
    targetCoordinates?: {
      x: number;
      y: number;
    } | null;
  };
}

/**
 * コミットツリー全体の階層構造モデル
 */
export interface IdeaCommitTree {
  rootCommitId: string;
  nodes: Record<string, IdeaCommitNode>;
  activeCommitId: string;
}
