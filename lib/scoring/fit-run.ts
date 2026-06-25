import "server-only";
import { Prisma, type User, type FitBucket } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildUserCapabilities } from "@/lib/cloud/skill-map";
import { extractRequirements } from "@/lib/scoring/requirements";
import { computeFitScore } from "@/lib/scoring/fit";

/**
 * Recompute the Fit Score for every job the user has scored. Cheap and
 * deterministic, so it's safe to run after aggregation and whenever the user's
 * profile changes.
 */
export async function rescoreFitsForUser(user: User): Promise<number> {
  const caps = buildUserCapabilities(user.cloudSkills, user.certifications);
  const scores = await prisma.jobScore.findMany({
    where: { userId: user.id },
    include: { job: true },
  });

  let updated = 0;
  for (const s of scores) {
    const req = extractRequirements(s.job.title, s.job.description);
    const fit = computeFitScore({
      userYears: user.yearsExperience,
      userCapabilities: caps,
      userRemotePreference: user.remotePreference,
      userWorkAuthorization: user.workAuthorization,
      requirements: req,
      jobRemote: s.job.remote,
    });

    await prisma.jobScore.update({
      where: { id: s.id },
      data: {
        fitScore: fit.score,
        fitBucket: fit.bucket as FitBucket,
        fitReasoning: {
          signals: fit.signals,
          summary: fit.summary,
          matched: fit.matchedCapabilities,
          missing: fit.missingCapabilities,
        } as unknown as Prisma.InputJsonObject,
      },
    });
    updated += 1;
  }
  return updated;
}
