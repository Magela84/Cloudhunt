import { clampInt } from "@/lib/jobs/util";
import { capabilityLabel, type Capability } from "@/lib/cloud/skill-map";
import type { JobRequirements } from "@/lib/scoring/requirements";

export type FitBucket = "MATCH" | "STRETCH" | "REACH" | "SKIP";
export type RemotePreference = "REMOTE" | "HYBRID" | "ONSITE" | "ANY";

export interface FitInputs {
  userYears: number | null;
  userCapabilities: Set<Capability>;
  userRemotePreference: RemotePreference;
  userWorkAuthorization: string | null;
  requirements: JobRequirements;
  jobRemote: boolean;
}

export interface FitSignal {
  key: string;
  label: string;
  impact: number;
  detail: string;
}

export interface FitResult {
  score: number;
  bucket: FitBucket;
  matchedCapabilities: Capability[];
  missingCapabilities: Capability[];
  signals: FitSignal[];
  summary: string;
}

export function bucketFor(score: number): FitBucket {
  if (score >= 85) return "MATCH";
  if (score >= 70) return "STRETCH";
  if (score >= 50) return "REACH";
  return "SKIP";
}

function userNeedsSponsorship(auth: string | null): boolean {
  if (!auth) return false;
  return /sponsor/i.test(auth) && /requir|need|will/i.test(auth);
}
function userIsCitizen(auth: string | null): boolean {
  return auth ? /citizen|green card|permanent resident/i.test(auth) : false;
}

const BASE = 20;

/**
 * Compute an explainable Qualification Fit Score (0–100) and bucket. Cloud-aware
 * skill coverage + experience drive the base; hard blockers (clearance,
 * sponsorship, citizenship) apply penalties and are surfaced as gaps, never
 * silently ignored.
 */
export function computeFitScore(input: FitInputs): FitResult {
  const { requirements: req } = input;
  const signals: FitSignal[] = [];

  // --- Skill coverage (up to 55) ---
  const roleCaps = req.capabilities;
  const matched = roleCaps.filter((c) => input.userCapabilities.has(c));
  const missing = roleCaps.filter((c) => !input.userCapabilities.has(c));
  let skillPoints: number;
  if (roleCaps.length === 0) {
    skillPoints = 38; // no detectable skill requirements — neutral
    signals.push({
      key: "skills",
      label: "No specific cloud skills detected",
      impact: 0,
      detail: "Couldn't extract concrete skill requirements from the posting.",
    });
  } else {
    const coverage = matched.length / roleCaps.length;
    skillPoints = Math.round(coverage * 55);
    signals.push({
      key: "skills",
      label: `Skill coverage ${matched.length}/${roleCaps.length}`,
      impact: skillPoints,
      detail: matched.length
        ? `You match: ${matched.map(capabilityLabel).join(", ")}.`
        : "None of the role's key skills detected in your profile.",
    });
    if (missing.length) {
      signals.push({
        key: "gaps",
        label: `Missing: ${missing.map(capabilityLabel).join(", ")}`,
        impact: 0,
        detail: "Skills the role emphasizes that aren't in your profile yet.",
      });
    }
  }

  // --- Experience (up to 25) ---
  let expPoints: number;
  if (req.minYears == null) {
    expPoints = 22;
    signals.push({
      key: "experience",
      label: "No explicit experience requirement",
      impact: expPoints,
      detail: "The posting doesn't state a minimum years requirement.",
    });
  } else if (input.userYears == null) {
    expPoints = 10;
    signals.push({
      key: "experience",
      label: `Requires ~${req.minYears}y; yours unknown`,
      impact: expPoints,
      detail: "Add your years of experience for a sharper score.",
    });
  } else {
    const diff = input.userYears - req.minYears;
    expPoints = diff >= 0 ? 25 : diff === -1 ? 18 : diff === -2 ? 12 : 5;
    signals.push({
      key: "experience",
      label:
        diff >= 0
          ? `Meets experience (${input.userYears}y ≥ ${req.minYears}y)`
          : `${Math.abs(diff)}y short of ${req.minYears}y`,
      impact: expPoints,
      detail:
        diff >= 0
          ? "Your experience meets or exceeds the stated minimum."
          : "Below the stated minimum — a stretch, not necessarily a dealbreaker.",
    });
  }

  let score = BASE + skillPoints + expPoints;

  // --- Hard blockers (penalties + explicit gap flags) ---
  if (req.clearanceRequired) {
    score -= 30;
    signals.push({
      key: "clearance",
      label: "Security clearance required",
      impact: -30,
      detail: "Requires an active clearance — a hard gate if you don't hold one.",
    });
  }
  if (req.noSponsorship && userNeedsSponsorship(input.userWorkAuthorization)) {
    score -= 40;
    signals.push({
      key: "sponsorship",
      label: "No visa sponsorship",
      impact: -40,
      detail: "Posting won't sponsor, and your profile indicates you'd need it.",
    });
  }
  if (req.citizenshipRequired && !userIsCitizen(input.userWorkAuthorization)) {
    score -= 35;
    signals.push({
      key: "citizenship",
      label: "Citizenship required",
      impact: -35,
      detail: "Requires citizenship your profile doesn't indicate.",
    });
  }
  if (req.requiresDegree && !req.degreeOrEquivalent) {
    score -= 6;
    signals.push({
      key: "degree",
      label: "Degree required",
      impact: -6,
      detail: "States a degree requirement with no 'or equivalent experience'.",
    });
  }

  // --- Location / remote preference ---
  if (input.userRemotePreference === "REMOTE" && !input.jobRemote) {
    score -= 15;
    signals.push({
      key: "remote",
      label: "Not remote",
      impact: -15,
      detail: "You prefer remote-only; this role isn't listed as remote.",
    });
  } else if (input.userRemotePreference === "ONSITE" && input.jobRemote) {
    score -= 5;
    signals.push({
      key: "remote",
      label: "Remote role",
      impact: -5,
      detail: "You prefer on-site; this role is remote.",
    });
  }

  score = clampInt(score, 0, 100);
  const bucket = bucketFor(score);

  const summaryParts: string[] = [];
  if (roleCaps.length)
    summaryParts.push(`covers ${matched.length}/${roleCaps.length} key skills`);
  if (req.minYears != null && input.userYears != null) {
    const diff = input.userYears - req.minYears;
    summaryParts.push(diff >= 0 ? "meets experience" : `${Math.abs(diff)}y short`);
  }
  const blocker = signals.find((s) => s.impact <= -30);
  if (blocker) summaryParts.push(blocker.label.toLowerCase());
  const summary =
    summaryParts.length > 0
      ? summaryParts.join(", ") + "."
      : "Limited requirement data.";

  return {
    score,
    bucket,
    matchedCapabilities: matched,
    missingCapabilities: missing,
    signals,
    summary,
  };
}
