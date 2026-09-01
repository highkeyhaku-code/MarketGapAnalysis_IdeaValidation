"use client";

import { create } from "zustand";
import { computeCommitTreeVersions, CommitMinimal } from "../versioning";
import { IdeaInput } from "../../schemas/zod";

export interface IdeaCommitItem extends CommitMinimal {
  id: string;
  idea_id: string;
  parent_commit_id: string | null;
  q1_target_pain?: string | null;
  q2_solution?: string | null;
  q3_core_edge?: string | null;
  q4_target_literacy?: string | null;
  q4_monetization_model?: string | null;
  q4_supplementary_pains?: any;
  status: string;
  emotional_score?: number | null;
  semantic_diff?: string | null;
  created_at: string;
}

export interface IdeaStoreState {
  currentIdeaId: string | null;
  active_commit_id: string | null;
  viewing_commit_id: string | null;
  commits: IdeaCommitItem[];

  // 派生値 & ヘルパー
  isDetachedHead: boolean;
  activeVersion: string;
  viewingVersion: string;

  // アクション
  setIdeaContext: (ideaId: string, activeCommitId: string | null, commits: IdeaCommitItem[]) => void;
  setViewingCommit: (commitId: string | null) => void;
  checkoutLatest: () => void;
  setActiveCommit: (commitId: string) => void;
  addCommit: (newCommit: IdeaCommitItem, updateActive?: boolean) => void;
  getRestoredInputValues: (commitId: string) => Partial<IdeaInput> | null;
}

export const useIdeaStore = create<IdeaStoreState>((set, get) => ({
  currentIdeaId: null,
  active_commit_id: null,
  viewing_commit_id: null,
  commits: [],

  isDetachedHead: false,
  activeVersion: "v1",
  viewingVersion: "v1",

  setIdeaContext: (ideaId, activeCommitId, commits) => {
    const versionMap = computeCommitTreeVersions(commits, activeCommitId);
    
    // active_commit_id が未設定の場合は最新のコミットを採用
    const resolvedActiveId =
      activeCommitId ||
      (commits.length > 0 ? commits[commits.length - 1].id : null);

    const viewingId = resolvedActiveId;
    const isDetached = Boolean(
      viewingId && resolvedActiveId && viewingId !== resolvedActiveId
    );

    const activeVer = resolvedActiveId ? versionMap.get(resolvedActiveId) || "v1" : "v1";
    const viewingVer = viewingId ? versionMap.get(viewingId) || "v1" : "v1";

    set({
      currentIdeaId: ideaId,
      active_commit_id: resolvedActiveId,
      viewing_commit_id: viewingId,
      commits,
      isDetachedHead: isDetached,
      activeVersion: activeVer,
      viewingVersion: viewingVer,
    });
  },

  setViewingCommit: (commitId) => {
    const { active_commit_id, commits } = get();
    const versionMap = computeCommitTreeVersions(commits, active_commit_id);

    const isDetached = Boolean(
      commitId && active_commit_id && commitId !== active_commit_id
    );

    const viewingVer = commitId ? versionMap.get(commitId) || "v1" : "v1";
    const activeVer = active_commit_id ? versionMap.get(active_commit_id) || "v1" : "v1";

    set({
      viewing_commit_id: commitId,
      isDetachedHead: isDetached,
      viewingVersion: viewingVer,
      activeVersion: activeVer,
    });
  },

  checkoutLatest: () => {
    const { active_commit_id, commits } = get();
    const versionMap = computeCommitTreeVersions(commits, active_commit_id);
    const activeVer = active_commit_id ? versionMap.get(active_commit_id) || "v1" : "v1";

    set({
      viewing_commit_id: active_commit_id,
      isDetachedHead: false,
      viewingVersion: activeVer,
      activeVersion: activeVer,
    });
  },

  setActiveCommit: (commitId) => {
    const { commits } = get();
    const versionMap = computeCommitTreeVersions(commits, commitId);
    const activeVer = versionMap.get(commitId) || "v1";

    set({
      active_commit_id: commitId,
      viewing_commit_id: commitId,
      isDetachedHead: false,
      activeVersion: activeVer,
      viewingVersion: activeVer,
    });
  },

  addCommit: (newCommit, updateActive = true) => {
    const { commits, active_commit_id } = get();
    const updatedCommits = [...commits.filter((c) => c.id !== newCommit.id), newCommit];
    const newActiveId = updateActive ? newCommit.id : active_commit_id;
    const versionMap = computeCommitTreeVersions(updatedCommits, newActiveId);

    const activeVer = newActiveId ? versionMap.get(newActiveId) || "v1" : "v1";

    set({
      commits: updatedCommits,
      active_commit_id: newActiveId,
      viewing_commit_id: newActiveId,
      isDetachedHead: false,
      activeVersion: activeVer,
      viewingVersion: activeVer,
    });
  },

  getRestoredInputValues: (commitId) => {
    const { commits } = get();
    const commit = commits.find((c) => c.id === commitId);
    if (!commit) return null;

    return {
      q1_target_pain: commit.q1_target_pain || "",
      q2_solution: commit.q2_solution || "",
      q3_core_edge: commit.q3_core_edge || "",
      q4_target_literacy: (commit.q4_target_literacy as any) || "intermediate",
      q4_monetization_model: (commit.q4_monetization_model as any) || "subscription",
      q4_supplementary_pains: (commit.q4_supplementary_pains as any) || [],
    };
  },
}));
