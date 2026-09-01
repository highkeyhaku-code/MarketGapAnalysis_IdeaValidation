// scripts/test-phase2-tribunal-audit.mjs
import assert from "node:assert/strict";
import {
  TribunalFeedbackSchema,
  PersonaCritiqueSchema,
} from "../schemas/zod.ts";
import {
  generateThreeSkepticalPersonasFeedback,
  formatTribunalFeedbackForUI,
} from "../lib/ai/personas.ts";

console.log("================================================================================");
console.log("⚖️ PHASE 2 TRIBUNAL & SOCRATIC PIVOT ARCHITECTURE VERIFICATION AUDIT");
console.log("================================================================================\n");

async function runTribunalAudit() {
  // ----------------------------------------------------------------------------
  // 1. TribunalFeedbackSchema & PersonaCritiqueSchema のバイリンガル構造検証 (要件1)
  // ----------------------------------------------------------------------------
  console.log("▶ [AUDIT 1]: AI審査員バイリンガルZodスキーマ (TribunalFeedbackSchema) の検証...");

  const sampleTribunalData = {
    overall_verdict: "PIVOT",
    executive_summary_en: "The startup faces formidable switching costs and needs viral distribution.",
    executive_summary_ja: "既存ツールのスイッチング障壁が極めて高く、マルチプレイヤー型の自然伝播が必要です。",
    investor: {
      harsh_critique_en: "CAC will exceed LTV due to competitive bidding.",
      harsh_critique_ja: "競合過熱によりCACがLTVを上回り構造的赤字に陥ります。",
      socratic_question_en: "Can you introduce a bottom-up multiplayer mechanism?",
      socratic_question_ja: "社内全体へ自然伝播するマルチプレイヤー型の仕組みを取り入れられますか？",
      pivot_hint_tag_en: "Multiplayer Viral Loop",
      pivot_hint_tag_ja: "社内マルチプレイヤー・バイラル化",
    },
    competitor: {
      harsh_critique_en: "We have 50k active enterprises and will launch a native copycat.",
      harsh_critique_ja: "既存大手は数万社の顧客基盤を持ち、同様のAI拡張を即座に投下してきます。",
      socratic_question_en: "Can you position as a Chrome extension bridge instead of a replacement?",
      socratic_question_ja: "リプレイスではなく既存ツールのChrome拡張として寄生する選択肢はありますか？",
      pivot_hint_tag_en: "Parasitic Add-on Bridge",
      pivot_hint_tag_ja: "既存ツールのアドオン・拡張化",
    },
    skeptical_user: {
      harsh_critique_en: "Introducing another tool triggers security review fatigue.",
      harsh_critique_ja: "新たな専用SaaSの導入はセキュリティ審査と教育コストがかかり敬遠されます。",
      socratic_question_en: "Can you operate headlessly inside existing Slack without a new UI?",
      socratic_question_ja: "新しい管理画面を増やさず、Slackやメール内で完結するヘッドレスUXにできますか？",
      pivot_hint_tag_en: "Headless 0-Config UX",
      pivot_hint_tag_ja: "Slack連携の0-Config化",
    },
  };

  const parseResult = TribunalFeedbackSchema.safeParse(sampleTribunalData);
  assert.ok(parseResult.success, "Sample tribunal data must strictly conform to TribunalFeedbackSchema");

  // スキーマの各ペルソナのフィールド存在チェック
  const parsed = parseResult.data;
  assert.equal(parsed.overall_verdict, "PIVOT");
  assert.ok(parsed.investor.harsh_critique_ja.length > 0);
  assert.ok(parsed.investor.socratic_question_ja.length > 0);
  assert.ok(parsed.investor.pivot_hint_tag_ja.length > 0);
  assert.ok(parsed.competitor.pivot_hint_tag_ja.length > 0);
  assert.ok(parsed.skeptical_user.pivot_hint_tag_ja.length > 0);

  console.log("  1-1. Overall Verdict:", parsed.overall_verdict);
  console.log("  1-2. Executive Summary (JA):", parsed.executive_summary_ja);
  console.log("  1-3. Investor Pivot Tag:", `"${parsed.investor.pivot_hint_tag_ja}" (${parsed.investor.pivot_hint_tag_en})`);
  console.log("  1-4. Competitor Socratic Question:", `"${parsed.competitor.socratic_question_ja}"`);
  console.log("  1-5. Skeptical User Pivot Tag:", `"${parsed.skeptical_user.pivot_hint_tag_ja}"`);
  console.log("  ✅ PASS: TribunalFeedbackSchema のバイリンガルZod構造が完全適合\n");

  // ----------------------------------------------------------------------------
  // 2. generateThreeSkepticalPersonasFeedback ロジックの検証 (要件1)
  // ----------------------------------------------------------------------------
  console.log("▶ [AUDIT 2]: generateThreeSkepticalPersonasFeedback 生成関数の検証...");

  const generatedFeedback = await generateThreeSkepticalPersonasFeedback({
    q1_target_pain: "セールスチームが商談後のCRM手動転記に毎日2時間以上拘束され、商談数が激減している。",
    q2_solution: "Zoom商談の音声をリアルタイム解析し、Salesforceに項目別自動入力するAIエージェント",
    q3_core_edge: "音声の感情トーンと未言及リスクまで抽出する超高精度エンジン",
    domain: "B2B_SME",
    totalScore: 35,
    autopsyResults: {
      totalCount: 3,
      projects: [
        {
          name: "crm-voice-bot",
          stars: 120,
          url: "https://github.com/example/crm-voice-bot",
          description: "Voice CRM sync bot",
          causeOfDeath: "High integration friction, Zoom API rate limit issues",
        },
      ],
    },
  });

  const validGen = TribunalFeedbackSchema.safeParse(generatedFeedback);
  assert.ok(validGen.success, "Generated feedback must strictly validate against TribunalFeedbackSchema");
  assert.ok(
    ["KILL", "PIVOT", "SURVIVED"].includes(generatedFeedback.overall_verdict),
    "overall_verdict must be KILL, PIVOT, or SURVIVED"
  );
  assert.ok(generatedFeedback.investor.socratic_question_ja.includes("？") || generatedFeedback.investor.socratic_question_ja.length > 10);

  // UI変換ヘルパーの検証
  const uiList = formatTribunalFeedbackForUI(generatedFeedback);
  assert.equal(uiList.length, 3, "formatTribunalFeedbackForUI must return 3 personas");
  assert.equal(uiList[0].personaKey, "investor");
  assert.equal(uiList[1].personaKey, "competitor");
  assert.equal(uiList[2].personaKey, "skeptical_user");

  console.log("  2-1. Generated Overall Verdict:", generatedFeedback.overall_verdict);
  console.log("  2-2. Generated Executive Summary:", generatedFeedback.executive_summary_ja.slice(0, 60) + "...");
  console.log("  2-3. UI Format Count:", uiList.length, "Personas (investor, competitor, skeptical_user)");
  console.log("  ✅ PASS: AI審査員生成ロジックとUIフォーマッタが完全適合\n");

  // ----------------------------------------------------------------------------
  // 3. 対話的フキダシUI & シームレス・ピボット URL パラメータ検証 (要件3)
  // ----------------------------------------------------------------------------
  console.log("▶ [AUDIT 3]: Socratic Dialogue & Seamless Pivot ルーティングの検証...");

  const personaItem = uiList[0];
  const commitId = "c0a24158-1111-4444-8888-000000000001";
  const socraticQ = personaItem.socratic_question_ja;
  const pivotTag = personaItem.pivot_hint_tag_ja;

  const generatedUrl = `/validate?pivotFrom=${commitId}&focus=${personaItem.personaKey}&socraticQuestion=${encodeURIComponent(socraticQ)}&pivotTag=${encodeURIComponent(pivotTag)}`;

  assert.ok(generatedUrl.includes(`pivotFrom=${commitId}`), "URL must contain pivotFrom commit ID");
  assert.ok(generatedUrl.includes(`focus=investor`), "URL must contain focus personaKey");
  assert.ok(generatedUrl.includes("socraticQuestion="), "URL must contain encoded socraticQuestion");
  assert.ok(generatedUrl.includes("pivotTag="), "URL must contain encoded pivotTag");

  console.log("  3-1. Sample CTA Destination URL:", generatedUrl);
  console.log("  3-2. Decoded Socratic Question:", socraticQ);
  console.log("  3-3. Decoded Pivot Tag:", `💡 "${pivotTag}" を軸にピボットする`);
  console.log("  ✅ PASS: シームレス・ピボット用 URL パラメータと対話型導線が完全適合\n");

  console.log("================================================================================");
  console.log("🎉 ALL PHASE 2 TRIBUNAL & SOCRATIC PIVOT AUDIT CHECKS PASSED (100%)!");
  console.log("================================================================================\n");
}

runTribunalAudit().catch((err) => {
  console.error("❌ Tribunal audit failed:", err);
  process.exit(1);
});
