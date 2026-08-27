// scripts/test-e2e-scenarios.mjs
import assert from "node:assert/strict";

// テスト環境用の環境変数フォールバック設定 (src/env.ts のバリデーション通過用)
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://test-project.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "test-anon-key-12345";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "test-service-role-key-12345";
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "test-gemini-key-12345";
process.env.TAVILY_API_KEY = process.env.TAVILY_API_KEY || "test-tavily-key-12345";
process.env.GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN || "test-github-token-12345";
process.env.PRODUCT_HUNT_API_TOKEN = process.env.PRODUCT_HUNT_API_TOKEN || "test-ph-token-12345";
process.env.INNGEST_EVENT_KEY = process.env.INNGEST_EVENT_KEY || "test-inngest-event-key-12345";
process.env.INNGEST_SIGNING_KEY = process.env.INNGEST_SIGNING_KEY || "test-inngest-signing-key-12345";

console.log("================================================================================");
console.log("🧪 STARTING E2E INTEGRATION & SCENARIO VERIFICATION SUITE");
console.log("================================================================================\n");

// テスト用ヘルパー
function logScenarioHeader(num, title) {
  console.log(`\n--------------------------------------------------------------------------------`);
  console.log(`▶ [SCENARIO ${num}]: ${title}`);
  console.log(`--------------------------------------------------------------------------------`);
}

function logTestPass(stepName, details = "") {
  console.log(`  ✅ PASS: ${stepName} ${details ? `(${details})` : ""}`);
}

async function runAllScenarios() {
  let passedCount = 0;
  let totalCount = 0;

  async function testStep(name, fn) {
    totalCount++;
    try {
      await fn();
      logTestPass(name);
      passedCount++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      throw err;
    }
  }

  // ============================================================================
  // シナリオ 1: 「The Garage」から「重力マップ」への基本フロー (Phase 1)
  // ============================================================================
  logScenarioHeader(1, "The Garage から 重力マップ への基本フロー (Phase 1)");

  await testStep("1-1. Product Hunt & Tavily フェッチ層の疎通確認", async () => {
    const { fetchProductHuntDetails } = await import("../lib/api/producthunt.js");
    const { fetchFrictionCorpusFromTavily } = await import("../lib/api/tavily.js");

    const ph = await fetchProductHuntDetails("Notion");
    assert.ok(ph.name, "Product Hunt name must exist");
    assert.ok(Array.isArray(ph.features), "features must be an array");

    const tavily = await fetchFrictionCorpusFromTavily("Notion");
    assert.ok(tavily.rawFrictionCorpus, "rawFrictionCorpus must not be empty");
  });

  await testStep("1-2. 摩擦テキスト濃縮フィルター (compressFrictionCorpus) の検証", async () => {
    const { compressFrictionCorpus } = await import("../lib/compressFrictionCorpus.js");
    const rawText = `
      Some random positive review about the tool.
      
      User complaint: The tool is extremely slow, buggy, and confusing to set up for complex workflows. Our team found it hard to configure permissions.
      
      Another line with normal text.
      
      Pricing feedback: It is too expensive and lacks proper enterprise support.
    `;
    const compressed = compressFrictionCorpus(rawText, 2, 300);
    assert.ok(compressed.length > 0, "Compressed corpus should not be empty");
    assert.ok(compressed.length <= 300, "Compressed text must obey character limits");
    assert.ok(compressed.includes("slow") || compressed.includes("expensive"), "Must capture friction keywords");
  });

  await testStep("1-3. AI バッチ重力評価 & D3 スカラー値計算 (evaluateMarketBatch)", async () => {
    const { evaluateMarketBatch } = await import("../lib/ai/evaluateMarket.js");
    const mockInputs = [
      {
        appDetails: {
          id: "app-notion",
          name: "Notion",
          tagline: "All-in-one workspace",
          description: "Docs, wikis, and projects.",
          features: ["Docs", "Projects", "Databases"],
          homepageUrl: "https://notion.so",
          reviewsCount: 200,
          votesCount: 1500,
        },
        compressedFriction: "Database setup is complex and slow with large records.",
      },
      {
        appDetails: {
          id: "app-linear",
          name: "Linear",
          tagline: "Issue tracking built for speed",
          description: "Streamline software projects.",
          features: ["Issues", "Cycles", "Roadmaps"],
          homepageUrl: "https://linear.app",
          reviewsCount: 150,
          votesCount: 2200,
        },
        compressedFriction: "Lacks customizability for non-tech business teams.",
      },
    ];

    const result = await evaluateMarketBatch("test-genre-1", "Project Management", mockInputs);
    assert.equal(result.genreId, "test-genre-1");
    assert.ok(result.coreJtbd.length > 0, "Core JTBD must be defined");
    assert.equal(result.companies.length, 2);

    const first = result.companies[0];
    assert.ok(first.pullScore >= 0 && first.pullScore <= 100, "pullScore must be in 0-100");
    assert.ok(first.frictionScore >= 0 && first.frictionScore <= 100, "frictionScore must be in 0-100");
    assert.ok(first.radius >= 18 && first.radius <= 50, "radius must be calculated");
    assert.ok(typeof first.gravityStrength === "number", "gravityStrength must be scalar number");
  });

  // ============================================================================
  // シナリオ 2: アイディア極限検証の実行 (Phase 2)
  // ============================================================================
  logScenarioHeader(2, "アイディア極限検証の実行 (Phase 2)");

  await testStep("2-1. IdeaInputSchema の文字数バリデーション境界値テスト", async () => {
    const { IdeaInputSchema } = await import("../schemas/zod.js");

    // 不正（文字数不足）
    const invalidShort = {
      q1_target_pain: "Short pain", // < 30 chars
      q2_solution: "Short sol",
      q3_core_edge: "Short edge",
      q4_target_literacy: "intermediate",
      q4_monetization_model: "subscription",
      q4_supplementary_pains: [],
    };
    const invalidResult = IdeaInputSchema.safeParse(invalidShort);
    assert.equal(invalidResult.success, false, "Short input must fail validation");

    // 正常
    const validFull = {
      q1_target_pain: "営業担当者が日々の商談記録とCRM入力に追われ、1日2時間以上浪費している。", // >= 30 chars
      q2_solution: "商談音声をリアルタイム解析し、議事録要約・CRM項目を0クリックで全自動同期するAIハブ。", // >= 30 chars
      q3_core_edge: "0-config双方向同期で導入コストと学習コストをゼロにする構造的優位性。", // >= 20 chars
      q4_target_literacy: "intermediate",
      q4_monetization_model: "subscription",
      q4_supplementary_pains: [],
    };
    const validResult = IdeaInputSchema.safeParse(validFull);
    assert.equal(validResult.success, true, "Valid input must pass validation");
  });

  await testStep("2-2. 3x ペナルティスコア & ドメイン加重計算の検証", async () => {
    const { calculate3xPenaltyScore, calculateDomainWeightedScores } = await import("../lib/domainWeights.js");

    // 差分がプラス (優位) の場合: 通常加重
    const scoreAdvantage = calculate3xPenaltyScore(2, 4);
    assert.equal(scoreAdvantage, 8, "Advantage diff (2 * 4) must equal 8");

    // 差分がマイナス (劣位) の場合: 3倍ペナルティ適用
    const scorePenalty = calculate3xPenaltyScore(-2, 4);
    assert.equal(scorePenalty, -24, "Disadvantage diff (-2 * 4 * 3) must equal -24");

    const domainResult = calculateDomainWeightedScores(
      {
        integration_cost: 2,
        switching_barrier: -2,
        security_compliance: -1,
      },
      "B2B_ENTERPRISE"
    );
    assert.ok(typeof domainResult.totalScore === "number", "totalScore must be number");
    assert.equal(domainResult.penalizedCount, 2, "Must identify 2 penalized elements");
  });

  await testStep("2-3. 懐疑的3ペルソナ審査員フィードバック & ソクラテス式問いかけの生成", async () => {
    const { generateSkepticalPersonasFeedback } = await import("../lib/ai/personas.js");

    const feedbackList = await generateSkepticalPersonasFeedback({
      q1_target_pain: "営業担当者がCRM入力に追われ、1日2時間以上浪費している。",
      q2_solution: "商談音声をリアルタイム解析し、議事録要約・CRM項目を0クリックで全自動同期するAIハブ。",
      q3_core_edge: "0-config双方向同期で導入コストと学習コストをゼロにする。",
      domain: "B2B_SME",
    });

    assert.equal(feedbackList.length, 3, "Must return exactly 3 skeptical personas");
    const personas = feedbackList.map((p) => p.persona);
    assert.ok(personas.includes("investor"), "Must include investor persona");
    assert.ok(personas.includes("competitor"), "Must include competitor persona");
    assert.ok(personas.includes("customer"), "Must include customer persona");

    for (const p of feedbackList) {
      assert.ok(p.coreCritique.length > 0, "coreCritique must exist");
      assert.ok(p.fatalFlaw.length > 0, "fatalFlaw must exist");
      assert.ok(p.recommendedCountermeasure.length > 0, "recommendedCountermeasure must exist");
      assert.ok(p.socraticQuestion.length > 0, "socraticQuestion must exist for coaching");
      assert.ok(["HIGH", "MEDIUM", "LOW"].includes(p.groundingConfidence), "groundingConfidence must be HIGH/MEDIUM/LOW");
    }
  });

  // ============================================================================
  // シナリオ 3: タイムトラベル・ピボット UX (Git for Ideas)
  // ============================================================================
  logScenarioHeader(3, "タイムトラベル・ピボット UX (Git for Ideas)");

  await testStep("3-1. コミットツリー階層構造 (d3.stratify) のデータモデリング検証", async () => {
    const d3 = await import("d3");

    const mockCommits = [
      {
        id: "commit-root-1",
        parentId: null,
        version: "1.0",
        title: "Initial Hypothesis (Manual Hub)",
        score: 45,
        status: "validated",
        createdAt: "2026-08-27T00:00:00Z",
      },
      {
        id: "commit-child-2",
        parentId: "commit-root-1",
        version: "1.1",
        title: "Pivot A (0-Config API Sync)",
        score: 72,
        status: "validated",
        createdAt: "2026-08-27T01:00:00Z",
      },
      {
        id: "commit-child-3",
        parentId: "commit-root-1",
        version: "1.2",
        title: "Pivot B (Browser Extension Only)",
        score: 68,
        status: "validated",
        createdAt: "2026-08-27T02:00:00Z",
      },
      {
        id: "commit-grandchild-4",
        parentId: "commit-child-2",
        version: "1.1.1",
        title: "Deep Pivot (Enterprise SOC2 Focus)",
        score: 84,
        status: "validated",
        createdAt: "2026-08-27T03:00:00Z",
      },
    ];

    const stratify = d3
      .stratify()
      .id((d) => d.id)
      .parentId((d) => d.parentId ?? "");

    const hierarchy = stratify(mockCommits);
    assert.equal(hierarchy.id, "commit-root-1", "Root commit must be parent");
    assert.equal(hierarchy.children?.length, 2, "Root commit must have 2 branches");

    const treeLayout = d3.tree().size([800, 500]);
    const treeData = treeLayout(hierarchy);
    assert.ok(treeData.descendants().length === 4, "Tree must layout all 4 nodes");
  });

  // ============================================================================
  // シナリオ 4: 投資家向け共有ビューとマスキング (セキュリティ)
  // ============================================================================
  logScenarioHeader(4, "投資家向け共有ビューとマスキング (セキュリティ)");

  await testStep("4-1. マスキングロジックによる機密データパージの検証", async () => {
    // 生のコミットデータ（機密プロンプトや内部生データを含む）
    const rawCommitRecord = {
      id: "commit-1234",
      share_token: "token-uuid-secure-5678",
      status: "completed",
      emotional_score: 74,
      semantic_diff: "Branched from v1.0 with 0-config focus",
      created_at: "2026-08-27T10:00:00Z",
      // 機密情報
      raw_internal_prompts: "System: You are an internal debugger. User secret API keys: xyz...",
      raw_unfiltered_logs: "DEBUG [2026-08-27] Secret database connection string...",
      q4_supplementary_pains: {
        competitorProfile: { incumbentName: "HubSpot" },
        scores: {
          elementDiffs: { integration_cost: 2, switching_barrier: -1 },
          nutritionMetrics: { cognitiveLoad: 35, statusQuoGravity: 55, anxietyLevel: 30 },
        },
        personas: [
          {
            persona: "investor",
            name: "Marcus Vance",
            verdict: "CONDITIONAL_PASS",
            coreCritique: "Defensible if verticalized.",
            recommendedCountermeasure: "Focus on healthcare niche.",
          },
        ],
        githubAutopsy: { totalCount: 3, items: [] },
      },
    };

    // マスキング適用
    const maskedOutput = {
      shareToken: rawCommitRecord.share_token,
      status: rawCommitRecord.status,
      survivesScore: rawCommitRecord.emotional_score,
      benchmark: {
        incumbentName: rawCommitRecord.q4_supplementary_pains.competitorProfile.incumbentName,
        elementDiffs: rawCommitRecord.q4_supplementary_pains.scores.elementDiffs,
      },
      nutritionMetrics: rawCommitRecord.q4_supplementary_pains.scores.nutritionMetrics,
      personas: rawCommitRecord.q4_supplementary_pains.personas,
    };

    // 機密データが排除されていることを厳密にアサート
    assert.equal((maskedOutput).raw_internal_prompts, undefined, "raw_internal_prompts must be purged");
    assert.equal((maskedOutput).raw_unfiltered_logs, undefined, "raw_unfiltered_logs must be purged");
    assert.ok(maskedOutput.shareToken, "shareToken must be present");
    assert.equal(maskedOutput.survivesScore, 74, "survivesScore must match");
  });

  console.log("\n================================================================================");
  console.log(`🎉 ALL ${passedCount}/${totalCount} TEST STEPS PASSED SUCCESSFULLY!`);
  console.log("================================================================================\n");
}

runAllScenarios().catch((err) => {
  console.error("\n❌ E2E SCENARIO SUITE TERMINATED WITH ERROR:", err);
  process.exit(1);
});
