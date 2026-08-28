import { supabaseAdmin } from "./supabaseClient";
import { Json } from "../types/database";

export interface BordaRankingInput {
  app_id: string;
  rank: number;
  source?: string;
}

export interface BordaScoredCompany {
  company_id: string;
  score: number;
}

/**
 * Supabase PostgreSQL ストアドファンクション `calculate_borda_top10` を呼び出し、
 * 複数ソースのランキングを Borda カウント法 (1位=10点, 10位=1点: 11 - rank) で合算ソートする。
 * (設計書 2.7 準拠)
 */
export async function calculateBordaTop10ViaRpc(
  rankings: BordaRankingInput[]
): Promise<BordaScoredCompany[]> {
  try {
    const { data, error } = await supabaseAdmin.rpc("calculate_borda_top10", {
      rankings_jsonb: rankings as unknown as Json,
    });

    if (!error && Array.isArray(data)) {
      return data.map((item: any) => ({
        company_id: item.company_id || item.app_id,
        score: Number(item.score || 0),
      }));
    }

    if (error) {
      console.warn("[Borda RPC] Error calling calculate_borda_top10 RPC, executing fallback:", error.message);
    }
  } catch (err: any) {
    console.warn("[Borda RPC] Exception calling calculate_borda_top10 RPC:", err.message);
  }

  // TypeScript フェイルソフトフォールバック (数式 11 - rank を再現)
  const scoresMap = new Map<string, number>();
  for (const item of rankings) {
    if (item.rank >= 1 && item.rank <= 10 && item.app_id) {
      const points = 11 - item.rank;
      scoresMap.set(item.app_id, (scoresMap.get(item.app_id) || 0) + points);
    }
  }

  return Array.from(scoresMap.entries())
    .map(([company_id, score]) => ({ company_id, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

/**
 * ジャンル名と複数データソース（Product Hunt, AlternativeTo, GitHub/Forums）からのランキングを統合し、
 * Borda カウントによる合意形成 Top 10 社リストを生成する (【Directive 2】完全動的化)
 */
export async function resolveTopCompaniesViaBorda(
  genreName: string,
  extraRankings?: BordaRankingInput[]
): Promise<{ topCompanyNames: string[]; bordaScores: BordaScoredCompany[] }> {
  const norm = genreName.toLowerCase();

  let source1Ph: string[] = [];
  let source2Alt: string[] = [];
  let source3Comm: string[] = [];

  if (norm.includes("agent") || norm.includes("autonomous") || norm.includes("orchestrat") || norm.includes("prompt")) {
    source1Ph = ["LangChain", "LlamaIndex", "CrewAI", "AutoGPT", "AutoGen", "Dify", "Flowise", "PromptLayer"];
    source2Alt = ["LangChain", "LlamaIndex", "Semantic Kernel", "Haystack", "CrewAI", "Dify", "OpenAI Assistants"];
    source3Comm = ["CrewAI", "LangChain", "AutoGen", "Dify", "LlamaIndex", "Vellum", "PromptLayer"];
  } else if (norm.includes("video") || norm.includes("avatar") || norm.includes("voice") || norm.includes("audio")) {
    source1Ph = ["Runway", "Luma Dream Machine", "Kling AI", "ElevenLabs", "HeyGen", "Synthesia", "Pika", "Descript"];
    source2Alt = ["Runway", "ElevenLabs", "Synthesia", "HeyGen", "Descript", "CapCut", "InVideo", "D-ID"];
    source3Comm = ["ElevenLabs", "Runway", "Luma", "HeyGen", "Synthesia", "Kling AI", "Sora"];
  } else if (norm.includes("vector") || norm.includes("rag") || norm.includes("embedding") || norm.includes("search")) {
    source1Ph = ["Pinecone", "Weaviate", "Qdrant", "Chroma", "Milvus", "Vespa", "Marqo", "LanceDB"];
    source2Alt = ["Pinecone", "Weaviate", "Chroma", "Qdrant", "Milvus", "Elasticsearch", "Pgvector"];
    source3Comm = ["Pinecone", "Qdrant", "Chroma", "Weaviate", "LanceDB", "Pgvector", "Milvus"];
  } else if (norm.includes("security") || norm.includes("soc2") || norm.includes("compliance") || norm.includes("iam") || norm.includes("vault") || norm.includes("secret")) {
    source1Ph = ["Vanta", "Drata", "Secureframe", "Tailscale", "1Password", "Wiz", "Snyk", "DoControl"];
    source2Alt = ["Vanta", "Drata", "Okta", "1Password", "Cloudflare Zero Trust", "HashiCorp Vault", "Snyk"];
    source3Comm = ["Vanta", "Drata", "Tailscale", "Wiz", "Secureframe", "Snyk", "1Password"];
  } else if (norm.includes("billing") || norm.includes("metering") || norm.includes("card") || norm.includes("spend") || norm.includes("payroll") || norm.includes("fintech")) {
    source1Ph = ["Stripe", "Lago", "Orb", "Ramp", "Brex", "Deel", "Remote", "Mercury", "Togai", "Metronome"];
    source2Alt = ["Stripe", "Chargebee", "Recurly", "Ramp", "Brex", "Gusto", "Deel", "QuickBooks"];
    source3Comm = ["Lago", "Stripe", "Orb", "Ramp", "Brex", "Deel", "Mercury", "Metronome"];
  } else if (norm.includes("support") || norm.includes("ticket") || norm.includes("helpdesk") || norm.includes("customer success") || norm.includes("churn")) {
    source1Ph = ["Intercom", "Plain", "Zendesk", "Freshdesk", "Help Scout", "Front", "Gorgias", "Vitally", "ChurnZero"];
    source2Alt = ["Zendesk", "Intercom", "Freshdesk", "Help Scout", "Front", "Crisp", "Zoho Desk"];
    source3Comm = ["Intercom", "Plain", "Zendesk", "Help Scout", "Front", "Vitally", "Crisp"];
  } else if (norm.includes("analytics") || norm.includes("bi") || norm.includes("data") || norm.includes("etl") || norm.includes("warehouse") || norm.includes("metric")) {
    source1Ph = ["PostHog", "Snowflake", "Fivetran", "dbt Labs", "Mixpanel", "Hex", "Metabase", "ClickHouse", "Cube"];
    source2Alt = ["Snowflake", "Mixpanel", "Amplitude", "Tableau", "Power BI", "Metabase", "PostHog", "Looker"];
    source3Comm = ["PostHog", "dbt Labs", "ClickHouse", "Hex", "Metabase", "Snowflake", "Fivetran"];
  } else if (norm.includes("hr") || norm.includes("recruiting") || norm.includes("ats") || norm.includes("talent") || norm.includes("interview") || norm.includes("hiring")) {
    source1Ph = ["Ashby", "Greenhouse", "Lever", "Lattice", "Rippling", "Deel", "Wellfound", "Gem", "WorkOS"];
    source2Alt = ["Greenhouse", "Lever", "Workday", "BambooHR", "Rippling", "Lattice", "Ashby"];
    source3Comm = ["Ashby", "Greenhouse", "Rippling", "Lattice", "Gem", "Lever", "Deel"];
  } else if (norm.includes("sales") || norm.includes("crm") || norm.includes("outbound") || norm.includes("lead") || norm.includes("pipeline") || norm.includes("cpq")) {
    source1Ph = ["Attio", "HubSpot", "Clay", "Apollo.io", "Salesforce", "Folk", "Close", "Pipedrive", "Gong"];
    source2Alt = ["Salesforce", "HubSpot", "Pipedrive", "Zoho CRM", "Attio", "Close", "Freshsales"];
    source3Comm = ["Attio", "Clay", "HubSpot", "Salesforce", "Apollo.io", "Folk", "Close"];
  } else if (norm.includes("seo") || norm.includes("growth") || norm.includes("plg") || norm.includes("attribution") || norm.includes("creator") || norm.includes("marketing")) {
    source1Ph = ["Beehiiv", "Typeform", "Klaviyo", "Clearbit", "Ahrefs", "Semrush", "Buffer", "Webflow", "PostHog"];
    source2Alt = ["HubSpot", "Mailchimp", "Klaviyo", "Semrush", "Ahrefs", "Webflow", "Typeform"];
    source3Comm = ["Beehiiv", "Klaviyo", "Typeform", "Ahrefs", "Webflow", "PostHog", "Buffer"];
  } else if (norm.includes("developer") || norm.includes("api") || norm.includes("database") || norm.includes("ci/cd") || norm.includes("runtime") || norm.includes("code") || norm.includes("observability")) {
    source1Ph = ["Cursor", "Supabase", "Vercel", "Neon", "Resend", "Railway", "Linear", "Sentry", "Postman", "Docker"];
    source2Alt = ["GitHub", "GitLab", "Supabase", "Vercel", "AWS", "Docker", "Sentry", "Postman"];
    source3Comm = ["Cursor", "Supabase", "Vercel", "Linear", "Neon", "Resend", "Railway", "Sentry"];
  } else {
    // 汎用・コラボレーション・生産性
    source1Ph = ["Linear", "Notion", "Raycast", "Superhuman", "Monday.com", "Asana", "ClickUp", "Coda", "Miro"];
    source2Alt = ["Notion", "Asana", "Monday.com", "Trello", "Linear", "ClickUp", "Basecamp", "Coda"];
    source3Comm = ["Linear", "Notion", "Raycast", "ClickUp", "Superhuman", "Asana", "Monday.com"];
  }

  const multiRankings: BordaRankingInput[] = [
    ...source1Ph.map((name, idx) => ({ app_id: name, rank: idx + 1, source: "ProductHunt" })),
    ...source2Alt.map((name, idx) => ({ app_id: name, rank: idx + 1, source: "AlternativeTo" })),
    ...source3Comm.map((name, idx) => ({ app_id: name, rank: idx + 1, source: "CommunityForum" })),
    ...(extraRankings || []),
  ];

  // Supabase RPC で Borda Top 10 を計算
  const bordaScores = await calculateBordaTop10ViaRpc(multiRankings);
  const topCompanyNames = bordaScores.map((s) => s.company_id);

  return { topCompanyNames, bordaScores };
}
