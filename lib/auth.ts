import { redirect } from "next/navigation";
import type { User as PrismaUser } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/supabase/server";

/**
 * Returns the application User row for the authenticated Supabase user,
 * creating/syncing it on first access. Returns null if not signed in.
 */
export async function getCurrentUser(): Promise<PrismaUser | null> {
  const authUser = await getAuthUser();
  if (!authUser) return null;

  const email = authUser.email ?? "";
  const fullName =
    (authUser.user_metadata?.full_name as string | undefined) ??
    (authUser.user_metadata?.name as string | undefined) ??
    null;

  return prisma.user.upsert({
    where: { id: authUser.id },
    update: { email },
    create: { id: authUser.id, email, fullName },
  });
}

/** Like getCurrentUser but redirects to /login when unauthenticated. */
export async function requireUser(): Promise<PrismaUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** True once the user has completed the onboarding wizard. */
export function isOnboarded(user: PrismaUser): boolean {
  return Boolean(user.onboardedAt);
}
