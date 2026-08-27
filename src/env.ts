// src/env.ts
import { z } from "zod";

/**
 * 1. 環境変数のスキーマ（型とルール）を定義する
 * - z.string().url(): URL形式であることを保証
 * - z.string().min(1): 空文字ではないことを保証
 */
const envSchema = z.object({
  // 1. Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  
  // 2. Google AI Studio (Gemini)
  GEMINI_API_KEY: z.string().min(1),
  
  // 3. Tavily
  TAVILY_API_KEY: z.string().min(1),
  
  // 4. GitHub API
  GITHUB_ACCESS_TOKEN: z.string().min(1),
  
  // 5. Product Hunt
  PRODUCT_HUNT_API_TOKEN: z.string().min(1),
  
  // 6. Inngest
  INNGEST_EVENT_KEY: z.string().min(1),
  INNGEST_SIGNING_KEY: z.string().min(1),
});

/**
 * 2. 実際の process.env をバリデーション（検証）してエクスポートする
 * もし .env に書き忘れがあると、アプリ起動時にここでエラーを出して教えてくれます。
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