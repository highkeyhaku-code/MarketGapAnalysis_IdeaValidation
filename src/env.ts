import { z } from "zod";

/**
 * 環境変数のスキーマ（型と検証ルール）
 * - z.string().url(): URL形式であることを保証
 * - z.string().min(1): 空文字ではないことを保証
 */
export const envSchema = z.object({
  // 1. Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // 2. Google AI Studio (Gemini)
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),

  // 3. Tavily
  TAVILY_API_KEY: z.string().min(1, "TAVILY_API_KEY is required"),

  // 4. GitHub API
  GITHUB_ACCESS_TOKEN: z.string().min(1, "GITHUB_ACCESS_TOKEN is required"),

  // 5. Product Hunt
  PRODUCT_HUNT_API_TOKEN: z.string().min(1, "PRODUCT_HUNT_API_TOKEN is required"),

  // 6. Inngest
  INNGEST_EVENT_KEY: z.string().min(1, "INNGEST_EVENT_KEY is required"),
  INNGEST_SIGNING_KEY: z.string().min(1, "INNGEST_SIGNING_KEY is required"),
});

export type Env = z.infer<typeof envSchema>;

/**
 * バリデーション済みの環境変数オブジェクト
 * process.envの直接参照は禁止とし、必ず本オブジェクトからインポートして参照すること。
 */
export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  TAVILY_API_KEY: process.env.TAVILY_API_KEY,
  GITHUB_ACCESS_TOKEN: process.env.GITHUB_ACCESS_TOKEN,
  PRODUCT_HUNT_API_TOKEN: process.env.PRODUCT_HUNT_API_TOKEN,
  INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
  INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
});