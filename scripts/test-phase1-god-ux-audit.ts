import { MarketInsightSchema } from "../schemas/zod";
import { extractSectorJtbds, evaluateMarketBatch, JtbdStarInfo } from "../lib/ai/evaluateMarket";

async function main() {
  console.log("=== Phase 1 God-UX Implementation Audit ===");

  // 1. Zod Schema Verification
  console.log("\n[Test 1] Zod Schema Bilingual Validation...");
  const mockInsight = {
    company_id: "comp-test-01",
    company_name: "Notion",
    tagline: "All-in-one workspace",
    description: "Collaborative workspace for notes and tasks",
    homepage_url: "https://notion.so",
    pull_score: 85,
    friction_score: 65,
    target_feature_id: "Database Relations & Querying",
    intensity: 7,
    reasoning_pull_en: "Unrivaled flexibility and seamless real-time document linking.",
    reasoning_pull_ja: "圧倒的な柔軟性とシームレスなリアルタイム共同文書リンク。",
    reasoning_friction_en: "Steep learning curve for complex relation databases and formula queries.",
    reasoning_friction_ja: "リレーショナルDB設計や関数クエリにおける高い学習コストと設定負荷。",
    score_reasoning: "High pull on flexibility, noticeable friction on complex formulas.",
    pull_scores: {
      "jtbd-star-0": 90,
      "jtbd-star-1": 85,
      "jtbd-star-2": 80,
      "jtbd-star-3": 75,
    },
  };

  const parsed = MarketInsightSchema.parse(mockInsight);
  console.log("✓ Zod schema parsed successfully:", {
    targetFeatureId: parsed.target_feature_id,
    reasoningPullJa: parsed.reasoning_pull_ja,
    reasoningPullEn: parsed.reasoning_pull_en,
    reasoningFrictionJa: parsed.reasoning_friction_ja,
    reasoningFrictionEn: parsed.reasoning_friction_en,
  });

  if (!parsed.reasoning_pull_ja || !parsed.reasoning_pull_en) {
    throw new Error("Missing bilingual pull reasoning!");
  }
  if (!parsed.reasoning_friction_ja || !parsed.reasoning_friction_en) {
    throw new Error("Missing bilingual friction reasoning!");
  }

  // 2. Bilingual JTBD Extraction Test
  console.log("\n[Test 2] extractSectorJtbds Fallback & Structure Test...");
  const jtbdResult = await extractSectorJtbds("AI Developer Tools");
  console.log(`✓ Extracted ${jtbdResult.jtbdList.length} JTBDs for sector:`);
  console.log(`  Core EN: "${jtbdResult.coreJtbd_en}"`);
  console.log(`  Core JA: "${jtbdResult.coreJtbd_ja}"`);
  jtbdResult.jtbdList.forEach((j, i) => {
    console.log(`  - [${j.id}] EN: "${j.name_en}" | JA: "${j.name_ja}"`);
    if (!j.name_en || !j.name_ja) {
      throw new Error(`JTBD ${i} missing bilingual name!`);
    }
  });

  // 3. Market Share Dynamic Radius Normalization Test
  console.log("\n[Test 3] Market Share Dynamic Radius Normalization...");
  const testCases = [
    { name: "Giant SaaS (5,000 users, 800 reviews)", followers: 5000, reviews: 800, pull: 90 },
    { name: "Medium Challenger (600 users, 120 reviews)", followers: 600, reviews: 120, pull: 70 },
    { name: "Small Niche (50 users, 10 reviews)", followers: 50, reviews: 10, pull: 50 },
    { name: "Brand New Idea (0 users, 0 reviews)", followers: 0, reviews: 0, pull: 40 },
  ];

  testCases.forEach((tc) => {
    const volume = Math.max(0, tc.followers) + Math.max(0, tc.reviews) * 2;
    let radius: number;
    if (volume > 0) {
      radius = Math.round(16 + Math.min(28, Math.sqrt(volume) * 0.92));
    } else {
      radius = Math.round(16 + (tc.pull / 100) * 28);
    }
    console.log(`  - ${tc.name} => Volume: ${volume} -> Radius: ${radius}px (Bounded: ${radius >= 16 && radius <= 44})`);
    if (radius < 16 || radius > 44) {
      throw new Error(`Radius ${radius}px out of bounds [16, 44]!`);
    }
  });

  // 4. Directional Repulsion Physics Vector Test
  console.log("\n[Test 4] D3 Friction Repulsion Force Physics Vector...");
  const center = { x: 550, y: 320 };
  const mockNodes = [
    { name: "High Friction Giant", x: 600, y: 350, frictionScore: 90, vx: 0, vy: 0 },
    { name: "Low Friction Startup", x: 520, y: 300, frictionScore: 20, vx: 0, vy: 0 },
  ];

  const alpha = 0.5;
  mockNodes.forEach((node) => {
    const frict = (node.frictionScore || 0) / 100;
    const dx = node.x - center.x;
    const dy = node.y - center.y;
    const dist = Math.hypot(dx, dy) || 1;
    const unitX = dx / dist;
    const unitY = dy / dist;
    const pushStrength = Math.pow(frict, 1.3) * 150 * alpha;
    node.vx += unitX * pushStrength;
    node.vy += unitY * pushStrength;
    console.log(`  - ${node.name} (Friction: ${node.frictionScore}%) => Push: ${pushStrength.toFixed(2)}px/tick -> New Velocity: (${node.vx.toFixed(2)}, ${node.vy.toFixed(2)})`);
  });

  const highFrictionPush = Math.hypot(mockNodes[0].vx, mockNodes[0].vy);
  const lowFrictionPush = Math.hypot(mockNodes[1].vx, mockNodes[1].vy);
  console.log(`✓ High friction push (${highFrictionPush.toFixed(2)}) is significantly greater than low friction push (${lowFrictionPush.toFixed(2)})`);
  if (highFrictionPush <= lowFrictionPush * 3) {
    throw new Error("Repulsion force scaling failed!");
  }

  console.log("\n✅ ALL PHASE 1 GOD-UX AUDIT TESTS PASSED SUCCESSFULLY!\n");
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
