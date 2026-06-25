"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type AuthState = { error?: string; message?: string };

function siteUrl(): string {
  const h = headers();
  const origin =
    h.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  return origin;
}

export async function signInWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { error: "Authentication isn't configured yet. Add your Supabase keys to .env." };
  }
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const supabase = createClient()!;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUpWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { error: "Authentication isn't configured yet. Add your Supabase keys to .env." };
  }
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters." };

  const supabase = createClient()!;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: error.message };

  // If email confirmation is disabled, a session is returned immediately.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/onboarding");
  }
  return {
    message:
      "Check your email to confirm your account, then sign in to continue.",
  };
}

/** Form action: kicks off Google OAuth and redirects to the provider. */
export async function signInWithGoogle(): Promise<void> {
  if (!isSupabaseConfigured()) {
    redirect("/login?error=not_configured");
  }
  const supabase = createClient()!;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl()}/auth/callback?next=/dashboard` },
  });
  if (error || !data.url) {
    redirect("/login?error=oauth_failed");
  }
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  if (supabase) await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
