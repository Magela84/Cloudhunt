import "server-only";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { extractRequirements } from "@/lib/scoring/requirements";
import { buildUserCapabilities } from "@/lib/cloud/skill-map";
import { detectProviders, detectSeniority } from "@/lib/jobs/classify";
import { computeSkillGapRoi, type RoiItem } from "@/lib/scoring/roi";
import {
  computeOutcomeInsights,
  type OutcomeInsights,
} from "@/lib/scoring/insights";

/** 7a — Skill-gap ROI across the user's scored feed. */
export async function getSkillGapRoi(user: User): Promise<RoiItem[]> {
  const rows = await prisma.jobScore.findMany({
    where: { userId: user.id },
    include: { job: true },
  });

  const jobs = rows.map((r) => ({
    requirements: extractRequirements(r.job.title, r.job.description),
    remote: r.job.remote,
    salaryMin: r.job.salaryMin,
    salaryMax: r.job.salaryMax,
  }));

  return computeSkillGapRoi(jobs, {
    userCapabilities: buildUserCapabilities(user.cloudSkills, user.certifications),
    userYears: user.yearsExperience,
    userRemotePreference: user.remotePreference,
    userWorkAuthorization: user.workAuthorization,
    threshold: user.fitThreshold,
  }).slice(0, 8);
}

/** 7c — "What's working for you" from the user's own application outcomes. */
export async function getOutcomeInsights(user: User): Promise<OutcomeInsights> {
  const items = await prisma.reviewItem.findMany({
    where: { userId: user.id },
    include: { job: true },
  });

  const records = items.map((it) => ({
    providers: detectProviders(`${it.job.title} ${it.job.description}`),
    remote: it.job.remote,
    seniority: detectSeniority(it.job.title),
    outcome: it.outcome,
    status: it.status,
  }));

  return computeOutcomeInsights(records);
}
