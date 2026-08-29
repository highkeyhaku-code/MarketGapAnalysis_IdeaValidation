import { fetchProductHuntDetails } from "../lib/api/producthunt";
import { resolveTopCompaniesViaBorda } from "../lib/borda";
import { evaluateMarketBatch, CompanyMarketInput } from "../lib/ai/evaluateMarket";
import { supabaseAdmin } from "../lib/supabaseClient";

async function main() {
  console.log("=================================================");
  console.log("🔍 PHASE 1 SHARE DATA FLOW DIAGNOSTIC & AUDIT");
  console.log("=================================================\n");

  const genreName = "AI Developer Tools";
  const genreId = "00000000-0000-0000-0000-000000000001";

  // -------------------------------------------------------------
  // LAYER 1: DATA ACQUISITION LAYER (Product Hunt API)
  // -------------------------------------------------------------
  console.log("--- [LAYER 1] DATA ACQUISITION LAYER (producthunt.ts) ---");
  const testCompanies = ["LangChain", "Pinecone", "Vanta", "Stripe", "PostHog"];

  const acquiredCompanies: Array<any> = [];

  for (const companyName of testCompanies) {
    console.log(`\nFetching Product Hunt details for: "${companyName}"...`);
    const phDetails = await fetchProductHuntDetails(companyName);
    console.log(`[Layer 1 Raw Result] for "${companyName}":`, {
      id: phDetails.id,
      name: phDetails.name,
      votesCount: phDetails.votesCount,
      reviewsCount: phDetails.reviewsCount,
      homepageUrl: phDetails.homepageUrl,
      featuresCount: phDetails.features?.length,
    });
    acquiredCompanies.push(phDetails);
  }

  // -------------------------------------------------------------
  // LAYER 2: DB STORAGE & MAPPING LAYER (apps & market_cache)
  // -------------------------------------------------------------
  console.log("\n--- [LAYER 2] DB STORAGE & MAPPING LAYER ---");
  console.log("Checking apps table columns and mapping...");
  
  const sampleApp = acquiredCompanies[0];
  const appsUpsertPayload = {
    name: sampleApp.name,
    tagline: sampleApp.tagline,
    description: sampleApp.description,
    homepage_url: sampleApp.homepageUrl,
    logo_url: sampleApp.logoUrl || null,
    features: sampleApp.features,
    raw_reviews_count: sampleApp.reviewsCount ?? 0,
    physical_scores: {},
    last_updated_at: new Date().toISOString(),
  };

  console.log("[Layer 2 Payload for 'apps' table]:", appsUpsertPayload);

  // Check existing apps in database
  const { data: dbApps, error: dbAppsErr } = await supabaseAdmin
    .from("apps")
    .select("id, name, raw_reviews_count, last_updated_at")
    .limit(5);

  console.log("[Layer 2 Database 'apps' select]:", {
    count: dbApps?.length,
    error: dbAppsErr?.message,
    sampleRows: dbApps,
  });

  // Check market_cache in database
  const { data: cacheRow, error: cacheErr } = await supabaseAdmin
    .from("market_cache")
    .select("genre_id, updated_at, materialized_json")
    .limit(1)
    .single();

  if (cacheRow?.materialized_json) {
    const mat = cacheRow.materialized_json as any;
    console.log("[Layer 2 Database 'market_cache' sample companies]:", {
      genreId: cacheRow.genre_id,
      companiesCount: mat.companies?.length,
      firstCompany: mat.companies?.[0] ? {
        name: mat.companies[0].name,
        followersCount: mat.companies[0].followersCount,
        rawReviewsCount: mat.companies[0].rawReviewsCount,
        pullScore: mat.companies[0].pullScore,
      } : null,
    });
  }

  // -------------------------------------------------------------
  // LAYER 3: BATCH MERGE & EVALUATION LAYER (evaluateMarket.ts)
  // -------------------------------------------------------------
  console.log("\n--- [LAYER 3] BATCH MERGE LAYER (evaluateMarket.ts) ---");
  const companyInputs: CompanyMarketInput[] = acquiredCompanies.slice(0, 3).map((ph) => ({
    appDetails: ph,
    compressedFriction: `${ph.name} is powerful but has high setup complexity and friction in configuration.`,
  }));

  console.log("[Layer 3 Input to evaluateMarketBatch]:", companyInputs.map((c) => ({
    name: c.appDetails.name,
    votesCount: c.appDetails.votesCount,
    reviewsCount: c.appDetails.reviewsCount,
  })));

  const evalResult = await evaluateMarketBatch(genreId, genreName, companyInputs);

  console.log("\n[Layer 3 Output from evaluateMarketBatch]:");
  evalResult.companies.forEach((comp) => {
    console.log(`  - Company "${comp.name}":`, {
      followersCount: comp.followersCount,
      rawReviewsCount: comp.rawReviewsCount,
      pullScore: comp.pullScore,
      frictionScore: comp.frictionScore,
      radius: comp.radius,
    });
  });

  console.log("\n=================================================");
  console.log("🏁 DIAGNOSTIC COMPLETE");
  console.log("=================================================");
}

main().catch((err) => {
  console.error("Diagnostic error:", err);
  process.exit(1);
});
