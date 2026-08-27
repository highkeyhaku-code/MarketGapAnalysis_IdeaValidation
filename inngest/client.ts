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
 * - isDev: 開発環境およびテストキー環境下では署名検証401エラーをバイパスしてローカル接続を許可
 */
export const inngest = new Inngest({
  id: "market-gap-validation",
  eventKey: env.INNGEST_EVENT_KEY,
  isDev: process.env.NODE_ENV === "development" || env.INNGEST_SIGNING_KEY.startsWith("test-") || !env.INNGEST_SIGNING_KEY,
});
