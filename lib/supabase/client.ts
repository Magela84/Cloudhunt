"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env, isSupabaseConfigured } from "@/lib/env";

/**
 * Browser-side Supabase client. Returns null when Supabase isn't configured
 * so client components can render a "set up auth" state instead of crashing.
 */
export function createClient() {
  if (!isSupabaseConfigured()) return null;
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
