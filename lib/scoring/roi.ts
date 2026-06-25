import { computeFitScore, type FitInputs } from "@/lib/scoring/fit";
import type { JobRequirements } from "@/lib/scoring/requirements";
import { capabilityLabel, type Capability } from "@/lib/cloud/skill-map";

/** A credential that demonstrates a capability, for "what to earn next". */
const CREDENTIAL: Record<Capability, string> = {
  aws: "AWS Solutions Architect Associate",
  azure: "Azure Administrator (AZ-104)",
  gcp: "Google Associate Cloud Engineer",
  kubernetes: "Certified Kubernetes Administrator (CKA)",
  terraform: "HashiCorp Terraform Associate",
};

export interface RoiJob {
  requirements: JobRequirements;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
}

export interface RoiProfile {
  userCapabilities: Set<Capability>;
  userYears: number | null;
  userRemotePreference: FitInputs["userRemotePreference"];
  userWorkAuthorization: string | null;
  threshold: number;
}

export interface RoiItem {
  capability: Capability;
  label: string;
  suggestedCredential: string | null;
  jobsUnlocked: number;
  medianSalaryUnlocked: number | null;
}

function midpoint(min: number | null, max: number | null): number | null {
  if (min != null && max != null) return Math.round((min + max) / 2);
  return min ?? max ?? null;
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function fitOf(
  profile: RoiProfile,
  caps: Set<Capability>,
  job: RoiJob,
): number {
  return computeFitScore({
    userYears: profile.userYears,
    userCapabilities: caps,
    userRemotePreference: profile.userRemotePreference,
    userWorkAuthorization: profile.userWorkAuthorization,
    requirements: job.requirements,
    jobRemote: job.remote,
  }).score;
}

/**
 * Skill-gap ROI: for each capability the user lacks, how many currently
 * out-of-reach jobs would clear the Fit threshold if they had it, and the
 * median salary of those newly-unlocked roles. Ranked by jobs unlocked.
 */
export function computeSkillGapRoi(
  jobs: RoiJob[],
  profile: RoiProfile,
): RoiItem[] {
  // Baseline fit per job with the user's current capabilities.
  const baseScores = jobs.map((j) => fitOf(profile, profile.userCapabilities, j));

  // Candidate capabilities = anything required somewhere that the user lacks.
  const candidates = new Set<Capability>();
  for (const job of jobs) {
    for (const cap of job.requirements.capabilities) {
      if (!profile.userCapabilities.has(cap)) candidates.add(cap);
    }
  }

  const items: RoiItem[] = [];
  for (const cap of candidates) {
    const augmented = new Set(profile.userCapabilities);
    augmented.add(cap);

    const unlockedSalaries: number[] = [];
    let jobsUnlocked = 0;
    jobs.forEach((job, i) => {
      if (baseScores[i] >= profile.threshold) return; // already qualified
      if (fitOf(profile, augmented, job) >= profile.threshold) {
        jobsUnlocked += 1;
        const mid = midpoint(job.salaryMin, job.salaryMax);
        if (mid != null) unlockedSalaries.push(mid);
      }
    });

    if (jobsUnlocked > 0) {
      items.push({
        capability: cap,
        label: capabilityLabel(cap),
        suggestedCredential: CREDENTIAL[cap] ?? null,
        jobsUnlocked,
        medianSalaryUnlocked: median(unlockedSalaries),
      });
    }
  }

  items.sort(
    (a, b) =>
      b.jobsUnlocked - a.jobsUnlocked ||
      (b.medianSalaryUnlocked ?? 0) - (a.medianSalaryUnlocked ?? 0),
  );
  return items;
}
