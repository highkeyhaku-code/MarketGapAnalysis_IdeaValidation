import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { analyzeMarketAndBuildMap } from "../../../inngest/functions/analyzeMarketAndBuildMap";
import { runHypothesisCrashJob } from "../../../inngest/functions/runHypothesisCrashJob";

/**
 * Inngest API Route Handler for Next.js App Router
 * エンドポイント: /api/inngest
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    analyzeMarketAndBuildMap,
    runHypothesisCrashJob,
  ],
});
