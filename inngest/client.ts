import { Inngest } from "inngest";
import { env } from "../src/env";
import { DomainType } from "../schemas/zod";

export interface AnalyzeMarketEventData {
  jobId: string;
  genreId: string;
  genreName: string;
  userId: string;
}

export interface HypothesisCrashEventData {
  jobId: string;
  commitId: string;
  ideaId: string;
  userId: string;
  domain: DomainType;
  targetPain: string;
  solution: string;
  coreEdge: string;
}

/**
 * Inngest クライアント初期化
 * アプリケーションID: market-gap-validation
 * - Docker コンテナ間通信 (http://inngest:8288) および ローカル開発 (http://127.0.0.1:8288) に自動対応
 */
const getInngestBaseUrl = () => {
  if (process.env.INNGEST_BASE_URL) {
    return process.env.INNGEST_BASE_URL;
  }
  // Docker 開発環境下では inngest コンテナ名を優先
  if (process.env.NODE_ENV === "development") {
    return process.env.INNGEST_DEV_URL || "http://inngest:8288";
  }
  return undefined;
};

export const inngest = new Inngest({
  id: "market-gap-validation",
  eventKey: env.INNGEST_EVENT_KEY,
  baseUrl: getInngestBaseUrl(),
  isDev: process.env.NODE_ENV === "development" || env.INNGEST_SIGNING_KEY.startsWith("test-") || !env.INNGEST_SIGNING_KEY,
});
