import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env, isSupabaseConfigured } from "@/lib/env";

/**
 * Server-side Supabase client bound to the request cookies.
 * Returns null when Supabase isn't configured.
 *
 * Must be called within a request scope (Server Component, Route Handler,
 * or Server Action).
 */
export function createClient() {
  if (!isSupabaseConfigured()) return null;

  const cookieStore = cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` can be called from a Server Component where mutating
            // cookies isn't allowed. Session refresh is handled by middleware,
            // so this is safe to ignore.
          }
        },
      },
    },
  );
}

/**
 * Returns the authenticated Supabase user, or null if not signed in / not
 * configured. Uses getUser() which revalidates the token with Supabase.
 */
export async function getAuthUser() {
  const supabase = createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
