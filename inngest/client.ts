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
 */
export const inngest = new Inngest({
  id: "market-gap-validation",
  eventKey: env.INNGEST_EVENT_KEY,
});
