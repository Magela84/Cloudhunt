"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { profileSchema, type ProfileInput } from "@/lib/validations";
import { rescoreFitsForUser } from "@/lib/scoring/fit-run";

export type ProfileResult = { ok: true } | { error: string };

export async function saveProfile(input: ProfileInput): Promise<ProfileResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your inputs." };
  }
  const d = parsed.data;

  // Guard: max should not be below min when both provided.
  if (
    d.targetSalaryMin != null &&
    d.targetSalaryMax != null &&
    d.targetSalaryMax < d.targetSalaryMin
  ) {
    return { error: "Target salary max can't be lower than min." };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      fullName: d.fullName || null,
      targetTitles: d.targetTitles,
      yearsExperience: d.yearsExperience,
      certifications: d.certifications,
      cloudSkills: d.cloudSkills,
      locationCity: d.locationCity || null,
      locationCountry: d.locationCountry || null,
      remotePreference: d.remotePreference,
      workAuthorization: d.workAuthorization || null,
      targetSalaryMin: d.targetSalaryMin ?? null,
      targetSalaryMax: d.targetSalaryMax ?? null,
      onboardedAt: user.onboardedAt ?? new Date(),
    },
  });

  // Profile changes affect Fit Scores — recompute for already-scored jobs.
  if (updated.onboardedAt) {
    await rescoreFitsForUser(updated);
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/feed");
  return { ok: true };
}

/** Update the adjustable Fit threshold (default feed cutoff). */
export async function updateFitThreshold(value: number): Promise<ProfileResult> {
  const user = await requireUser();
  const threshold = Math.max(0, Math.min(100, Math.round(value)));
  await prisma.user.update({
    where: { id: user.id },
    data: { fitThreshold: threshold },
  });
  revalidatePath("/feed");
  revalidatePath("/settings");
  return { ok: true };
}
