/**
 * lib/versioning.ts
 * Git for Ideas バージョン採番アルゴリズム
 * 
 * 仕様 (設計書 2.1):
 * 1. 直列の進化 (親がアクティブな状態からのピボット、またはルート):
 *    v1 → v2 → v3 (親を持たない、または単一の親からの正常進化は連番)
 * 2. 過去からの分岐 (Detached HEAD状態からのピボット):
 *    過去のバージョン (例: v2) からタイムトラベルして別のピボットをした場合、
 *    親のバージョンを引き継いだ命名規則 (例: v2-branch または v2.1) を自動適用。
 */

export interface CommitMinimal {
  id: string;
  parent_commit_id?: string | null;
  created_at?: string;
  [key: string]: any;
}

/**
 * 親のバージョン文字列と分岐状況から、次のコミットのバージョン文字列を決定する。
 * 
 * @param parentVersion 親コミットのバージョン文字列（例: "v1", "v2", "v2.1"）。親がない場合は null/undefined
 * @param isBranching 過去コミットからの分岐（Detached HEAD状態）か、または親から既に子が派生している場合 true
 * @param existingBranchCount 親から既に分岐しているブランチの数
 */
export function determineNextVersion(
  parentVersion?: string | null,
  isBranching: boolean = false,
  existingBranchCount: number = 0
): string {
  if (!parentVersion) {
    return "v1";
  }

  // 親バージョンから "v" プレフィックスを除去して解析
  const cleaned = parentVersion.startsWith("v") ? parentVersion.slice(1) : parentVersion;

  if (!isBranching && existingBranchCount === 0) {
    // 直列の進化 (Sequential Evolution): v1 -> v2 -> v3
    if (/^\d+$/.test(cleaned)) {
      const num = parseInt(cleaned, 10);
      return `v${num + 1}`;
    }
    // "2.1" のようなサブブランチからの直列進化: v2.1 -> v2.2
    if (/^\d+\.\d+$/.test(cleaned)) {
      const parts = cleaned.split(".");
      const major = parts[0];
      const minor = parseInt(parts[1], 10);
      return `v${major}.${minor + 1}`;
    }
    // "2-branch" 等の場合
    return `v${cleaned}-next`;
  } else {
    // 過去からの分岐 (Branching from past commit): v2 -> v2.1 / v2-branch
    if (/^\d+$/.test(cleaned)) {
      const branchIndex = existingBranchCount + 1;
      return `v${cleaned}.${branchIndex}`;
    }
    // 既にサブブランチ（例: v2.1）からさらに分岐する場合: v2.1.1
    if (/^\d+\.\d+$/.test(cleaned)) {
      const branchIndex = existingBranchCount + 1;
      return `v${cleaned}.${branchIndex}`;
    }
    return `v${cleaned}-b${existingBranchCount + 1}`;
  }
}

/**
 * コミット配列全体を走査し、ツリー構造に基づいて各コミットのバージョン文字列を一括計算する。
 * 
 * @param commits コミットの配列
 * @param activeCommitId 現在のアクティブなコミットID（HEAD）
 * @returns Map<commitId, versionString>
 */
export function computeCommitTreeVersions(
  commits: CommitMinimal[],
  activeCommitId?: string | null
): Map<string, string> {
  const versionMap = new Map<string, string>();
  if (!commits || commits.length === 0) return versionMap;

  // 時系列順にソート (作成日時昇順)
  const sorted = [...commits].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeA - timeB;
  });

  // 親IDから子コミットへのマップを構築
  const childrenMap = new Map<string, CommitMinimal[]>();
  const rootCommits: CommitMinimal[] = [];

  sorted.forEach((c) => {
    if (!c.parent_commit_id) {
      rootCommits.push(c);
    } else {
      const existing = childrenMap.get(c.parent_commit_id) || [];
      existing.push(c);
      childrenMap.set(c.parent_commit_id, existing);
    }
  });

  // ルートが存在しない（循環等）場合は最初のコミットをルートとする
  if (rootCommits.length === 0 && sorted.length > 0) {
    rootCommits.push(sorted[0]);
  }

  // BFS / DFS で各ノードのバージョンを確定
  function traverse(node: CommitMinimal, assignedVersion: string) {
    versionMap.set(node.id, assignedVersion);

    const children = childrenMap.get(node.id) || [];
    children.forEach((child, index) => {
      // 最初の子供は直列進化、2つ目以降は分岐
      const isBranch = index > 0;
      const nextVer = determineNextVersion(assignedVersion, isBranch, isBranch ? index - 1 : 0);
      traverse(child, nextVer);
    });
  }

  rootCommits.forEach((root, rootIndex) => {
    const rootVer = rootIndex === 0 ? "v1" : `v1-root${rootIndex + 1}`;
    traverse(root, rootVer);
  });

  // 万が一未割り当てのノードがあればフォールバック
  sorted.forEach((c, idx) => {
    if (!versionMap.has(c.id)) {
      versionMap.set(c.id, `v${idx + 1}`);
    }
  });

  return versionMap;
}

/**
 * 単一コミットのバージョンを取得するヘルパー
 */
export function getCommitVersionString(
  commitId: string,
  commits: CommitMinimal[],
  activeCommitId?: string | null
): string {
  const versionMap = computeCommitTreeVersions(commits, activeCommitId);
  return versionMap.get(commitId) || "v1";
}
