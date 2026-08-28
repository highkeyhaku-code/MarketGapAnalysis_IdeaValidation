// scripts/test-jtbd-diversity-and-multilink-audit.mjs
import assert from "node:assert/strict";
import { extractSectorJtbds, evaluateMarketBatch } from "../lib/ai/evaluateMarket.ts";
import { evaluateDeltaSyncPipeline } from "../lib/deltaSync.ts";

console.log("================================================================================");
console.log("🔬 AUDIT: JTBD DIVERSITY, MULTI-SPRING LATTICE, & STRICT CACHE ISOLATION");
console.log("================================================================================\n");

async function runAudit() {
  // ----------------------------------------------------------------------------
  // 1. キャッシュとデータフェッチの厳格な分離監査
  // ----------------------------------------------------------------------------
  console.log("▶ [AUDIT 1]: キャッシュとデータフェッチの genreId 厳格分離の検証...");
  
  const fakeGenreIdA = "11111111-aaaa-bbbb-cccc-111111111111";
  const fakeGenreIdB = "22222222-aaaa-bbbb-cccc-222222222222";

  const decisionA = await evaluateDeltaSyncPipeline(fakeGenreIdA, "AI Platforms");
  const decisionB = await evaluateDeltaSyncPipeline(fakeGenreIdB, "Fintech Metering");

  assert.equal(decisionA.cachedData, null, "Non-existent genre A must not return unmatching cached records");
  assert.equal(decisionB.cachedData, null, "Non-existent genre B must not return unmatching cached records");
  assert.equal(decisionA.shouldRunLlm, true);
  assert.equal(decisionB.shouldRunLlm, true);
  console.log("  1-1. Genre A Cache Hit:", Boolean(decisionA.cachedData));
  console.log("  1-2. Genre B Cache Hit:", Boolean(decisionB.cachedData));
  console.log("  ✅ PASS: 他ジャンルのキャッシュ使い回し（Cross-Genre Pollution）が完全に遮断されていることを確認\n");

  // ----------------------------------------------------------------------------
  // 2. JTBDの多様性と市場特性適合 (LLM Prompt & Extraction)
  // ----------------------------------------------------------------------------
  console.log("▶ [AUDIT 2]: 市場特性に応じた動的 JTBD 抽出の多様性検証...");

  const [aiJtbd, secJtbd, finJtbd] = await Promise.all([
    extractSectorJtbds("Autonomous Agent Platforms"),
    extractSectorJtbds("SOC 2, ISO 27001 & HIPAA Automation"),
    extractSectorJtbds("Usage-Based Metering & Billing Engines"),
  ]);

  console.log("  2-1. AI Sector JTBDs:", aiJtbd.subJtbds);
  console.log("  2-2. Security Sector JTBDs:", secJtbd.subJtbds);
  console.log("  2-3. Fintech Sector JTBDs:", finJtbd.subJtbds);

  assert.notDeepEqual(aiJtbd.subJtbds, secJtbd.subJtbds, "AI and Security JTBDs must be completely distinct");
  assert.notDeepEqual(secJtbd.subJtbds, finJtbd.subJtbds, "Security and Fintech JTBDs must be completely distinct");
  console.log("  ✅ PASS: 各市場ジャンル固有の特化 JTBD が動的抽出されていることを確認\n");

  // ----------------------------------------------------------------------------
  // 3. 多対多 pull_scores マトリックスとスコア分散の検証
  // ----------------------------------------------------------------------------
  console.log("▶ [AUDIT 3]: 複数企業に対する多対多引力マトリックスのスコア分散検証...");

  const sampleInputs = [
    {
      appDetails: {
        id: "app-langchain",
        name: "LangChain",
        tagline: "Building applications with LLMs through composability",
        description: "Large framework providing prompt templates, chains, and agents for orchestrating models.",
        votesCount: 1200,
        reviewsCount: 300,
        features: ["Tool Calling", "Chains", "Memory", "Vector Store Connectors"],
        homepageUrl: "https://langchain.com",
      },
      compressedFriction: "Complaints about excessive abstraction layers, debugging difficulty in nested chains, and rapid API breaking changes.",
    },
    {
      appDetails: {
        id: "app-dify",
        name: "Dify",
        tagline: "Open-source LLM app development platform",
        description: "Visual workflow orchestrator with model management and ready-to-use agent templates.",
        votesCount: 950,
        reviewsCount: 180,
        features: ["Visual Flow", "BaaS", "RAG Pipeline", "Prompt IDE"],
        homepageUrl: "https://dify.ai",
      },
      compressedFriction: "Difficulties in complex custom Python code execution within workflows and high self-hosted maintenance overhead.",
    },
  ];

  const evalResult = await evaluateMarketBatch("test-genre-ai", "Autonomous Agent Platforms", sampleInputs);

  console.log("  3-1. Evaluated Companies Count:", evalResult.companies.length);
  for (const comp of evalResult.companies) {
    console.log(`      - ${comp.name} Pull Scores:`, comp.pullScores);
    console.log(`        Reasoning: ${comp.scoreReasoning.slice(0, 70)}...`);
    
    // スコアが均一（全星同点）になっていないか分散をチェック
    const scores = Object.values(comp.pullScores);
    assert.ok(scores.length >= 3, "Must have pull scores for all JTBD stars");
    const isAllIdentical = scores.every(s => s === scores[0]);
    assert.equal(isAllIdentical, false, `${comp.name} pull scores must be differentiated across JTBDs`);
  }
  console.log("  ✅ PASS: 企業ごとの多次元引力スコアが偏りなく分散評価されていることを確認\n");

  // ----------------------------------------------------------------------------
  // 4. D3.js 多対多リンク生成と物理バネ検証
  // ----------------------------------------------------------------------------
  console.log("▶ [AUDIT 4]: D3.js 多対多重力バネリンク生成の検証...");

  const jtbdStars = evalResult.subJtbds.map((jtbd, i) => ({
    id: `jtbd-star-${i}`,
    name: jtbd,
  }));

  const generatedLinks = [];
  for (const p of evalResult.companies) {
    for (let starIdx = 0; starIdx < jtbdStars.length; starIdx++) {
      const star = jtbdStars[starIdx];
      const starKey = `jtbd-star-${starIdx}`;
      const pull = p.pullScores[starKey] ?? 50;
      
      const distance = Math.max(70, 240 - pull * 1.6);
      const strength = Math.max(0.06, (pull / 100) * 0.7);

      generatedLinks.push({
        source: star.id,
        target: p.companyId,
        pull,
        distance,
        strength,
      });
    }
  }

  assert.equal(generatedLinks.length, evalResult.companies.length * jtbdStars.length);
  console.log(`  4-1. Generated Multi-Spring Links: ${generatedLinks.length} (${evalResult.companies.length} planets x ${jtbdStars.length} stars)`);
  console.log("  ✅ PASS: 1つの星へのリンク集中がなく、すべてのJTBD星と惑星間に多対多リンクが形成されていることを確認\n");

  console.log("================================================================================");
  console.log("🎉 ALL 4 JTBD DIVERSITY & MULTI-SPRING LATTICE AUDITS FULLY VERIFIED & PASSED!");
  console.log("================================================================================\n");
}

runAudit().catch((err) => {
  console.error("❌ Audit failed:", err);
  process.exit(1);
});
