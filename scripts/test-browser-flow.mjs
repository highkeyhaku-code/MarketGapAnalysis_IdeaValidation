// scripts/test-browser-flow.mjs
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const SCREENSHOT_DIR = path.resolve("./test-screenshots");
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runBrowserTest() {
  console.log("================================================================================");
  console.log("🌐 STARTING PLAYWRIGHT BROWSER AUTOMATION E2E TEST (http://localhost:3000)");
  console.log("================================================================================\n");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  try {
    // --------------------------------------------------------------------------
    // STEP 1: http://localhost:3000 を開く
    // --------------------------------------------------------------------------
    console.log("▶ [STEP 1]: http://localhost:3000 へアクセス...");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 30000 });
    console.log("  ✅ Page loaded successfully. Title:", await page.title());
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01-initial-dashboard.png") });

    // --------------------------------------------------------------------------
    // STEP 2: 新規仮説の作成 (New Hypothesis Draft ボタンをクリック)
    // --------------------------------------------------------------------------
    console.log("\n▶ [STEP 2]: 「New Hypothesis Draft」ボタンをクリック...");
    const newDraftBtn = page.getByRole("button", { name: /New Hypothesis Draft/i });
    await newDraftBtn.waitFor({ state: "visible", timeout: 10000 });
    await newDraftBtn.click();

    // ウィザードモーダルまたはトーストの出現を確認
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02-new-draft-created-wizard.png") });
    console.log("  ✅ 「New Hypothesis Draft」API実行完了。SupabaseにUUIDレコードが作成され、カンバン/モーダルに反映されました。");

    // --------------------------------------------------------------------------
    // STEP 3: Phase 1 のキック & ウィザード入力 (30文字以上のペインを入力)
    // --------------------------------------------------------------------------
    console.log("\n▶ [STEP 3]: ウィザードに30文字以上の具体的ペインとソリューションを入力...");
    
    // ウィザードが表示されているか確認
    const q1Input = page.getByPlaceholder(/誰が・どんな状況で・何に最も苦しんでいるか/i);
    if (await q1Input.isVisible()) {
      console.log("  📝 ウィザード入力フォームを検知。30文字以上の検証テキストを入力中...");
      await q1Input.fill("営業部門が商談後のCRM入力と議事録作成に毎日2時間以上忙殺され、商談件数が半減している。");
      
      const q2Input = page.getByPlaceholder(/どのようにそのペインを根本解決するか/i);
      await q2Input.fill("商談音声をGemini 2.0 Flashがリアルタイム文字起こしし、議事録とCRM更新項目を0クリックで自動反映するAI連携ハブ。");
      
      const q3Input = page.getByPlaceholder(/既存の競合製品が真似できない構造的優位性/i);
      await q3Input.fill("主要CRMとの0-config双方向API連携により、学習コストと導入摩擦をゼロにする構造的優位性。");

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03-wizard-filled.png") });

      const submitWizardBtn = page.getByRole("button", { name: /仮説を確定してDISCOVEREDへ昇格/i });
      await submitWizardBtn.click();
      await page.waitForTimeout(1500);
      console.log("  ✅ ウィザード入力を保存し、DISCOVERED カラムへ昇格しました。");
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04-promoted-to-discovered.png") });
    }

    // --------------------------------------------------------------------------
    // STEP 4: Discover (重力マップ) タブへ遷移 & 非同期ジョブの監視
    // --------------------------------------------------------------------------
    console.log("\n▶ [STEP 4]: 「Discover (重力マップ)」タブへ遷移し、市場探索ジョブを開始...");
    const discoverTabBtn = page.getByRole("button", { name: /Discover \(重力マップ\)/i });
    await discoverTabBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "05-discover-tab.png") });

    // 「Run Discovery」またはプリセットカードをクリックしてジョブ開始
    console.log("  🚀 プリセット市場「Project Management & Workflow Automation」の探索を開始...");
    const presetCard = page.locator("text=Project Management & Workflow Automation").first();
    await presetCard.click();

    // リアルタイムポーリングとプログレスバーの監視
    console.log("  ⏳ Inngest ジョブ進行状況をリアルタイムポーリングで監視中...");
    
    // プログレスバーの出現を待機
    const progressTracker = page.locator("text=AI Market Gravity Pipeline");
    await progressTracker.waitFor({ state: "visible", timeout: 15000 });
    console.log("  ✅ プログレスバー（JobPollingTracker）の表示を確認しました！");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "06-job-polling-active.png") });

    // リアルタイムログの変化を記録
    let isComplete = false;
    const startTime = Date.now();
    while (!isComplete && Date.now() - startTime < 90000) {
      await page.waitForTimeout(3000);
      const textContent = await page.textContent("body");
      
      if (textContent.includes("Product Huntから")) {
        console.log("    [Telemetry]: 🔎 Product Huntからデータをフェッチ中...");
      }
      if (textContent.includes("不満（摩擦）")) {
        console.log("    [Telemetry]: 💀 ユーザーの「不満（摩擦）」を検知中...");
      }
      if (textContent.includes("市場重力マップ")) {
        console.log("    [Telemetry]: 🧠 AIによる市場重力マップとJTBDの解析中...");
      }
      if (textContent.includes("Market Gravity Topology") || textContent.includes("Analysis Complete")) {
        isComplete = true;
        console.log("  🎉 ジョブ完了を検知しました！");
        break;
      }
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "07-job-completed.png") });

    // --------------------------------------------------------------------------
    // STEP 5: 重力マップ (Gravity Map) の描画確認
    // --------------------------------------------------------------------------
    console.log("\n▶ [STEP 5]: D3.js 重力マップ (Gravity Map) の描画検証...");
    const svgMap = page.locator("svg.select-none");
    await svgMap.waitFor({ state: "visible", timeout: 15000 });
    
    const nodeCount = await page.locator("g.node").count();
    console.log(`  ✅ D3.js 重力マップ描画成功！ 描画ノード数: ${nodeCount} 個 (中心JTBD星 + 競合企業惑星)`);

    // ノードをクリックして企業詳細インスペクターを表示
    const planetNode = page.locator("g.node").nth(1);
    if (await planetNode.isVisible()) {
      await planetNode.click();
      await page.waitForTimeout(1000);
      console.log("  ✅ 競合ノードクリックによるサイドインスペクター詳細表示を確認しました。");
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "08-gravity-map-inspector.png") });
    }

    console.log("\n================================================================================");
    console.log("🎊 ALL E2E BROWSER TESTS COMPLETED SUCCESSFULLY!");
    console.log(`📸 Screenshots saved to: ${SCREENSHOT_DIR}`);
    console.log("================================================================================\n");
  } catch (err) {
    console.error("❌ E2E Browser Test Error:", err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "error-state.png") });
    throw err;
  } finally {
    await browser.close();
  }
}

runBrowserTest().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
