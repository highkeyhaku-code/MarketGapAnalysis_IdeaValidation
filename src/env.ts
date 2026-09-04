import { z } from "zod";

const isBrowser = typeof window !== "undefined";

/**
 * サーバーサイド用スキーマ（全必須環境変数の厳格バリデーション）
 */
export const serverEnvSchema = z.object({
  // 1. Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // 2. Google AI Studio (Gemini)
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),

  // 3. Tavily
  TAVILY_API_KEY: z.string().min(1, "TAVILY_API_KEY is required"),

  // 4. GitHub API
  GITHUB_ACCESS_TOKEN: z.string().min(1, "GITHUB_ACCESS_TOKEN or GITHUB_TOKEN is required"),
  GITHUB_TOKEN: z.string().optional(),

  // 5. Product Hunt
  PRODUCT_HUNT_API_TOKEN: z.string().min(1, "PRODUCT_HUNT_API_TOKEN is required"),

  // 6. Inngest
  INNGEST_EVENT_KEY: z.string().min(1, "INNGEST_EVENT_KEY is required"),
  INNGEST_SIGNING_KEY: z.string().min(1, "INNGEST_SIGNING_KEY is required"),

  // 7. Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // 8. Site URL
  NEXT_PUBLIC_SITE_URL: z.string().optional(),
});

/**
 * クライアントサイド (ブラウザ) 用スキーマ
 * ブラウザに露出する NEXT_PUBLIC_ のみを厳格バリデーションし、
 * サーバー専用の秘密鍵はブラウザバンドルに含まれないため optional とする。
 */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  GITHUB_ACCESS_TOKEN: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  PRODUCT_HUNT_API_TOKEN: z.string().optional(),
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().optional(),
});

export const envSchema = isBrowser ? clientEnvSchema : serverEnvSchema;

export type Env = z.infer<typeof serverEnvSchema>;

const rawEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  TAVILY_API_KEY: process.env.TAVILY_API_KEY,
  GITHUB_ACCESS_TOKEN: process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_TOKEN,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN,
  PRODUCT_HUNT_API_TOKEN: process.env.PRODUCT_HUNT_API_TOKEN,
  INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
  INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
};

/**
 * バリデーション済みの環境変数オブジェクト
 * process.envの直接参照は禁止とし、必ず本オブジェクトからインポートして参照すること。
 */
export const env = (isBrowser ? clientEnvSchema.parse(rawEnv) : serverEnvSchema.parse(rawEnv)) as Env;