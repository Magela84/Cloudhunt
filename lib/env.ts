/**
 * Centralized, validated environment access.
 *
 * We intentionally do NOT throw at import time for optional integration keys
 * (Anthropic, Adzuna, Supabase) so the app boots and renders graceful
 * "not configured" states during local development. Use the `is*Configured`
 * helpers to branch behavior.
 */

function opt(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export const env = {
  // Database
  DATABASE_URL: opt("DATABASE_URL"),
  DIRECT_URL: opt("DIRECT_URL"),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: opt("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: opt("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: opt("SUPABASE_SERVICE_ROLE_KEY"),

  // Anthropic
  ANTHROPIC_API_KEY: opt("ANTHROPIC_API_KEY"),
  ANTHROPIC_MODEL: opt("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6",

  // Job sources
  ADZUNA_APP_ID: opt("ADZUNA_APP_ID"),
  ADZUNA_APP_KEY: opt("ADZUNA_APP_KEY"),

  // App
  NEXT_PUBLIC_APP_URL: opt("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
} as const;

export const isSupabaseConfigured = () =>
  Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const isAnthropicConfigured = () => Boolean(env.ANTHROPIC_API_KEY);

export const isAdzunaConfigured = () =>
  Boolean(env.ADZUNA_APP_ID && env.ADZUNA_APP_KEY);

export const isDatabaseConfigured = () => Boolean(env.DATABASE_URL);
