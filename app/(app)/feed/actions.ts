"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { aggregateForUser } from "@/lib/jobs/aggregate";
import { configuredSources } from "@/lib/jobs/sources";

export type RefreshResult =
  | { ok: true; fetched: number; unique: number; scored: number; sources: string[] }
  | { error: string };

export async function refreshFeed(): Promise<RefreshResult> {
  const user = await requireUser();
  if (configuredSources().length === 0) {
    return {
      error:
        "No job sources are configured. Add Adzuna keys or ATS companies in config/ats-companies.json.",
    };
  }
  try {
    const result = await aggregateForUser(user);
    revalidatePath("/feed");
    return { ok: true, ...result };
  } catch (err) {
    console.error("refreshFeed failed", err);
    return { error: "Failed to refresh the feed. Please try again." };
  }
}
