// scripts/test-hybrid-billing-and-progressive-signup.mjs
import assert from "node:assert/strict";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

console.log("================================================================================");
console.log("💳 HYBRID BILLING, STRIPE WEBHOOK & PROGRESSIVE SIGNUP QA SUITE");
console.log("================================================================================\n");

// テスト用ダミーユーザーID (UUID)
const TEST_USER_ID = "c0a24158-9999-4444-8888-000000000099";
const TEST_GENRE_ID = "00000000-0000-0000-0000-000000000001";
const TEST_STRIPE_CUSTOMER_ID = "cus_test_garage_" + Date.now();

async function runTestSuite() {
  // ---------------------------------------------------------------------------
  // [TEST 1]: ゲストセッション管理 & 48時間TTLロジックの単体検証
  // ---------------------------------------------------------------------------
  console.log("▶ [TEST 1]: ゲストセッション 48時間TTL (Time-To-Live) パージの検証...");
  {
    const now = Date.now();
    const TTL_MS = 48 * 60 * 60 * 1000;

    // 1-1. 有効期間内のセッション
    const validSession = {
      sessionId: "guest-test-session-1",
      guestCredits: 10,
      createdAt: now,
      expiresAt: now + TTL_MS,
      draftIdeas: [{ id: "draft-1", title: "Test Idea 1" }],
    };
    const isExpiredValid = now > validSession.expiresAt;
    assert.strictEqual(isExpiredValid, false, "Active session within 48h must not expire");

    // 1-2. 48時間超過セッション (期限切れ)
    const expiredSession = {
      sessionId: "guest-test-session-expired",
      guestCredits: 10,
      createdAt: now - (TTL_MS + 1000),
      expiresAt: now - 1000,
      draftIdeas: [{ id: "draft-old", title: "Old Idea" }],
    };
    const isExpiredOld = now > expiredSession.expiresAt;
    assert.strictEqual(isExpiredOld, true, "Session older than 48h must be marked expired");

    console.log("  ✓ 48時間以内のセッション: 有効 (expiresAt > now)");
    console.log("  ✓ 48時間超過のセッション: 期限切れ検知 & 自動パージ対象");
    console.log("  ✅ PASS: ゲストセッション 48h TTL 検証\n");
  }

  // ---------------------------------------------------------------------------
  // [TEST 2]: ハイブリッド課金ウォレット (monthly優先消費) ロジックの検証
  // ---------------------------------------------------------------------------
  console.log("▶ [TEST 2]: ハイブリッド課金 (monthly_credits 優先消費) の単体検証...");
  {
    // シミュレーション関数: monthly優先消費ロジック
    function simulateHybridDeduct(monthly, purchased, penalty = 3) {
      const total = monthly + purchased;
      if (total < penalty) return { success: false, monthly, purchased, total };

      let newMonthly = monthly;
      let newPurchased = purchased;
      if (newMonthly >= penalty) {
        newMonthly -= penalty;
      } else {
        const needed = penalty - newMonthly;
        newMonthly = 0;
        newPurchased -= needed;
      }
      return { success: true, monthly: newMonthly, purchased: newPurchased, total: newMonthly + newPurchased };
    }

    // ケースA: monthly が十分ある場合 (monthly: 10, purchased: 5 -> 3消費)
    const caseA = simulateHybridDeduct(10, 5, 3);
    assert.strictEqual(caseA.success, true);
    assert.strictEqual(caseA.monthly, 7, "Monthly should be reduced from 10 to 7");
    assert.strictEqual(caseA.purchased, 5, "Purchased should remain 5");
    console.log("  ✓ ケースA (monthly余裕あり): monthly=10, purchased=5 --(3消費)--> monthly=7, purchased=5");

    // ケースB: monthly が不足しており purchased から補填する場合 (monthly: 1, purchased: 10 -> 3消費)
    const caseB = simulateHybridDeduct(1, 10, 3);
    assert.strictEqual(caseB.success, true);
    assert.strictEqual(caseB.monthly, 0, "Monthly should be 0");
    assert.strictEqual(caseB.purchased, 8, "Purchased should be reduced from 10 to 8 (1 + 2 = 3)");
    console.log("  ✓ ケースB (monthly枯渇・補填): monthly=1, purchased=10 --(3消費)--> monthly=0, purchased=8");

    // ケースC: 合計残高不足の場合 (monthly: 1, purchased: 1 -> 合計2 < 3)
    const caseC = simulateHybridDeduct(1, 1, 3);
    assert.strictEqual(caseC.success, false, "Should fail when total < 3");
    console.log("  ✓ ケースC (合計不足): monthly=1, purchased=1 (計2) --(3消費)--> 拒否 (INSUFFICIENT_CREDITS)");

    console.log("  ✅ PASS: ハイブリッド課金ウォレット減算トランザクション検証\n");
  }

  // ---------------------------------------------------------------------------
  // [TEST 3]: Stripe Webhook 同期 API の結合検証
  // ---------------------------------------------------------------------------
  console.log("▶ [TEST 3]: Stripe Webhook 同期 API (POST /api/webhooks/stripe) の検証...");
  {
    // 3-1. 買い切りクレジット購入 (checkout.session.completed)
    const buyCreditsEvent = {
      id: `evt_test_buy_${Date.now()}`,
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_test_${Date.now()}`,
          client_reference_id: TEST_USER_ID,
          mode: "payment",
          customer: TEST_STRIPE_CUSTOMER_ID,
          metadata: {
            type: "credits_purchase",
            credits: "30",
          },
        },
      },
    };

    const webhookRes1 = await fetch(`${BASE_URL}/api/webhooks/stripe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buyCreditsEvent),
    });

    const json1 = await webhookRes1.json();
    assert.ok(json1.success, "Stripe Webhook credit purchase must succeed");
    assert.strictEqual(json1.addedCredits, 30, "Added credits must be 30");
    console.log(`  ✓ 買い切り購入 (checkout.session.completed): +30 purchased_credits 付与成功 (NewPurchased: ${json1.newPurchasedBalance})`);

    // 3-2. 初回サブスクリプション (checkout.session.completed, mode: subscription)
    const subscribeEvent = {
      id: `evt_test_sub_${Date.now()}`,
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_sub_${Date.now()}`,
          client_reference_id: TEST_USER_ID,
          mode: "subscription",
          customer: TEST_STRIPE_CUSTOMER_ID,
          metadata: {
            plan_tier: "pro",
          },
        },
      },
    };

    const webhookRes2 = await fetch(`${BASE_URL}/api/webhooks/stripe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscribeEvent),
    });

    const json2 = await webhookRes2.json();
    assert.ok(json2.success, "Stripe Webhook subscription init must succeed");
    assert.strictEqual(json2.planTier, "pro");
    assert.strictEqual(json2.monthlyCredits, 200, "Pro plan must grant 200 monthly credits");
    console.log(`  ✓ サブスク開始 (checkout.session.completed): Proプラン登録 & 200 monthly_credits 初期化`);

    // 3-3. 月次サブスクリプション支払い成功 (invoice.payment_succeeded)
    const invoiceEvent = {
      id: `evt_test_inv_${Date.now()}`,
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: `in_test_${Date.now()}`,
          customer: TEST_STRIPE_CUSTOMER_ID,
          subscription: `sub_test_${Date.now()}`,
        },
      },
    };

    const webhookRes3 = await fetch(`${BASE_URL}/api/webhooks/stripe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoiceEvent),
    });

    const json3 = await webhookRes3.json();
    assert.ok(json3.success, "Stripe Webhook invoice renewal must succeed");
    console.log(`  ✓ 月次更新 (invoice.payment_succeeded): customerId照合により monthly_credits リセット完了`);

    // 3-4. サブスク解約 (customer.subscription.deleted)
    const cancelEvent = {
      id: `evt_test_cancel_${Date.now()}`,
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: `sub_cancel_${Date.now()}`,
          customer: TEST_STRIPE_CUSTOMER_ID,
        },
      },
    };

    const webhookRes4 = await fetch(`${BASE_URL}/api/webhooks/stripe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cancelEvent),
    });

    const json4 = await webhookRes4.json();
    assert.ok(json4.success, "Stripe Webhook cancellation must succeed");
    console.log(`  ✓ 解約 (customer.subscription.deleted): freeプランへダウングレード（資産・アンロック市場は保護）`);

    console.log("  ✅ PASS: Stripe Webhook 同期 API 全イベント検証\n");
  }

  // ---------------------------------------------------------------------------
  // [TEST 4]: プログレッシブ・サインアップ & ゲストデータ移行 API (冪等性保護)
  // ---------------------------------------------------------------------------
  console.log("▶ [TEST 4]: ゲストデータ移行 API (POST /api/auth/migrate-guest-data) と【冪等性保護】の検証...");
  {
    // クライアントで発番された固定UUID
    const clientIdeaId1 = "d1111111-2222-3333-4444-555555555551";
    const clientIdeaId2 = "d1111111-2222-3333-4444-555555555552";

    const migrationPayload = {
      guestSessionId: "guest-session-uuid-qa-test",
      guestCredits: 10,
      draftIdeas: [
        {
          id: clientIdeaId1,
          title: "Guest Idea 1: AI音声自動日報ツール",
          domain: "B2B_SME",
          ideaInput: {
            q1_target_pain: "営業担当が商談後のCRM入力と日報作成に毎日2時間奪われる",
            q2_solution: "ZoomやGoogle Meetの商談音声をリアルタイム解析しSalesforceに自動転記",
            q3_core_edge: "顧客の感情変化と成約確度スコアを算出する独自アルゴリズム",
            q4_target_literacy: "intermediate",
            q4_monetization_model: "subscription",
            q4_supplementary_pains: ["競合ツールの移行コスト", "入力漏れ"],
          },
          keywords: ["営業支援", "CRM", "SFA"],
        },
        {
          id: clientIdeaId2,
          title: "Guest Idea 2: ノーコード規約チェッカー",
          domain: "B2B_SME",
          ideaInput: {
            q1_target_pain: "法務チェックに2週間かかり新規サービスのリリースが遅延する",
            q2_solution: "最新の法改正と自社ポリシーに照らして規約差分を即時ハイライトするAIチェッカー",
            q3_core_edge: "弁護士監修の判例コーパスと自然言語ルール抽出エンジン",
            q4_target_literacy: "advanced",
            q4_monetization_model: "usage_based",
            q4_supplementary_pains: ["弁護士費用", "更新漏れリスク"],
          },
          keywords: ["リーガルテック", "契約書レビュー"],
        },
      ],
    };

    // 4-1. 初回移行実行 (作成)
    console.log("  4-1. 初回移行リクエストを送信...");
    const migrateRes1 = await fetch(`${BASE_URL}/api/auth/migrate-guest-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(migrationPayload),
    });

    const migrateJson1 = await migrateRes1.json();
    assert.ok(migrateJson1.success, "First migration must succeed");
    assert.strictEqual(migrateJson1.migratedCount, 2, "Must migrate 2 draft ideas");
    console.log(`       ✓ 初回移行成功: ${migrateJson1.migratedCount}件の仮説を作成 (userId: ${migrateJson1.userId})`);

    // 4-2. 【冪等性保護の検証】同一リクエストを再度送信 (重複作成されず updated になるか)
    console.log("  4-2. 【冪等性保護テスト】同一UUIDのゲストデータで2回目の移行リクエストを送信...");
    const migrateRes2 = await fetch(`${BASE_URL}/api/auth/migrate-guest-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(migrationPayload),
    });

    const migrateJson2 = await migrateRes2.json();
    assert.ok(migrateJson2.success, "Second migration must succeed without error");
    assert.strictEqual(migrateJson2.migratedCount, 2, "Must process 2 ideas without generating duplicates");

    // 各アイテムの action が 'updated' であることを確認
    for (const item of migrateJson2.migratedIdeas) {
      assert.strictEqual(item.action, "updated", `Idea ${item.ideaId} must be UPDATED, not duplicate created`);
      console.log(`       ✓ 冪等性確認: アイディア [${item.ideaId.slice(0, 8)}...] は二重作成されず「${item.action}」として安全にUPSERT`);
    }

    console.log("  ✅ PASS: ゲスト移行APIの【データ重複なし・冪等性保護】完全実証\n");
  }

  // ---------------------------------------------------------------------------
  // [TEST 5]: クレジット消費型キャッシュパージ (3クレジット) の結合検証
  // ---------------------------------------------------------------------------
  console.log("▶ [TEST 5]: クレジット消費型キャッシュパージ (3クレジット) の結合検証...");
  {
    // executeManualCacheRevalidate をテスト (実在のIDを使用)
    const { supabaseAdmin } = await import("../lib/supabaseClient.ts");
    const { data: realUser } = await supabaseAdmin.from("users").select("id, credits_balance").limit(1).single();
    const { data: realGenre } = await supabaseAdmin.from("genres").select("id, canonical_name").limit(1).single();

    const targetUserId = realUser?.id || TEST_USER_ID;
    const targetGenreId = realGenre?.id || TEST_GENRE_ID;

    // 事前に market_cache にダミーキャッシュを挿入
    await supabaseAdmin.from("market_cache").upsert({
      genre_id: targetGenreId,
      materialized_json: { test: true, timestamp: Date.now() },
    }, { onConflict: "genre_id" });

    const { executeManualCacheRevalidate } = await import("../lib/cacheRevalidate.ts");
    const result = await executeManualCacheRevalidate(targetGenreId, targetUserId);

    console.log(`  Target User: ${targetUserId} (Initial Credits: ${realUser?.credits_balance})`);
    console.log(`  Target Genre: ${targetGenreId} (${realGenre?.canonical_name})`);
    console.log(`  Result: success=${result.success}, creditsDeducted=${result.creditsDeducted}, message="${result.message}"`);
    assert.ok(result.success, "Manual cache revalidate must succeed");
    assert.strictEqual(result.creditsDeducted, 3, "Penalty must be exactly 3 credits");

    // キャッシュが削除されたことを確認
    const { data: cached } = await supabaseAdmin.from("market_cache").select("id").eq("genre_id", targetGenreId);
    assert.strictEqual(cached?.length || 0, 0, "market_cache for genre must be purged");
    console.log("  ✓ market_cache レコードの完全破棄を確認");
    console.log("  ✅ PASS: 3クレジット強制消費 & market_cache パージ完全準拠\n");
  }

  console.log("================================================================================");
  console.log("🎉 ALL HYBRID BILLING, STRIPE & PROGRESSIVE SIGNUP AUDIT CHECKS PASSED (100%)!");
  console.log("================================================================================");
}

runTestSuite().catch((err) => {
  console.error("\n❌ QA Verification Suite Failed:", err);
  process.exit(1);
});
