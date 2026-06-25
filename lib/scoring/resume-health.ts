import { clampInt } from "@/lib/jobs/util";
import { capabilitiesInText } from "@/lib/cloud/skill-map";
import type { ResumeSections } from "@/lib/validations";

export interface HealthSignal {
  key: string;
  label: string;
  impact: number;
  detail: string;
}

export interface ResumeHealthResult {
  score: number; // 0–100
  signals: HealthSignal[];
  suggestions: string[];
}

const ACTION_VERBS = [
  "built","designed","implemented","automated","migrated","deployed","reduced",
  "improved","led","architected","optimized","managed","scaled","developed",
  "configured","orchestrated","provisioned","monitored","launched","delivered",
];

const QUANTIFIED =
  /(\d+[.,]?\d*\s?(%|percent|x|k\b|m\b|hours?|days?|weeks?|users?|requests?|servers?|services?|nodes?|clusters?))|(\$\s?\d)/i;

function allBullets(s: ResumeSections): string[] {
  return s.experience.flatMap((e) => e.bullets).filter((b) => b.trim().length > 0);
}

/**
 * General resume-health score (ATS-friendliness, completeness, impact, cloud
 * relevance, length). Deterministic and explainable. Suggestions only ever ask
 * the user to surface/quantify REAL content — never to fabricate.
 */
export function computeResumeHealth(
  sections: ResumeSections,
  rawText: string,
): ResumeHealthResult {
  const signals: HealthSignal[] = [];
  const suggestions: string[] = [];
  const bullets = allBullets(sections);

  // --- Completeness (25) ---
  let completeness = 0;
  const has = (cond: boolean, pts: number) => (cond ? pts : 0);
  completeness += has(sections.summary.trim().length > 40, 6);
  completeness += has(sections.experience.length > 0, 8);
  completeness += has(sections.skills.length >= 5, 5);
  completeness += has(sections.education.length > 0, 3);
  completeness += has(sections.certifications.length > 0, 3);
  signals.push({
    key: "completeness",
    label: `Completeness ${completeness}/25`,
    impact: completeness,
    detail: "Has a summary, experience, skills, education, and certs.",
  });
  if (sections.summary.trim().length <= 40)
    suggestions.push("Add a 2–3 line professional summary up top.");
  if (sections.skills.length < 5)
    suggestions.push("List more of your real cloud skills (aim for 8–15).");
  if (sections.certifications.length === 0)
    suggestions.push("List any certifications you hold — they're strong signals.");

  // --- Impact / quantification (25) ---
  let impact = 0;
  if (bullets.length > 0) {
    const quantified = bullets.filter((b) => QUANTIFIED.test(b)).length;
    const withVerb = bullets.filter((b) =>
      ACTION_VERBS.some((v) => new RegExp(`\\b${v}`, "i").test(b)),
    ).length;
    const qRatio = quantified / bullets.length;
    const vRatio = withVerb / bullets.length;
    impact = Math.round(qRatio * 15 + vRatio * 10);
    if (qRatio < 0.4)
      suggestions.push(
        "Quantify more bullets with real numbers (%, $, latency, scale, team size).",
      );
    if (vRatio < 0.5)
      suggestions.push("Start more bullets with strong action verbs (Built, Automated, Reduced…).");
  } else {
    suggestions.push("Add accomplishment bullets under each role.");
  }
  signals.push({
    key: "impact",
    label: `Impact & quantification ${impact}/25`,
    impact,
    detail: "Bullets that quantify results and lead with action verbs.",
  });

  // --- Cloud relevance (20) ---
  const caps = capabilitiesInText(`${sections.skills.join(" ")} ${rawText}`);
  const cloudPoints = clampInt(caps.size * 4, 0, 20);
  signals.push({
    key: "cloud",
    label: `Cloud relevance ${cloudPoints}/20`,
    impact: cloudPoints,
    detail: `Detected ${caps.size} distinct cloud capability area(s).`,
  });
  if (caps.size < 3)
    suggestions.push("Surface more cloud tooling you've actually used (Terraform, Kubernetes, CI/CD, a provider).");

  // --- Length (15) ---
  const words = rawText.split(/\s+/).filter(Boolean).length;
  let lengthPoints: number;
  if (words >= 300 && words <= 900) lengthPoints = 15;
  else if (words < 300) {
    lengthPoints = clampInt(Math.round((words / 300) * 15), 0, 15);
    suggestions.push("Your resume looks short — expand on responsibilities and results.");
  } else {
    lengthPoints = clampInt(15 - Math.round((words - 900) / 150), 5, 15);
    if (words > 1200) suggestions.push("Trim toward 1–2 pages; cut older or low-impact detail.");
  }
  signals.push({
    key: "length",
    label: `Length ${lengthPoints}/15`,
    impact: lengthPoints,
    detail: `${words} words.`,
  });

  // --- ATS parseability (15) ---
  const parseable = sections.experience.length > 0 && sections.skills.length > 0;
  const atsPoints = parseable ? 15 : 6;
  signals.push({
    key: "ats",
    label: `ATS-friendly structure ${atsPoints}/15`,
    impact: atsPoints,
    detail: parseable
      ? "Sections parsed cleanly into experience and skills."
      : "Some sections didn't parse — use standard headings and plain formatting.",
  });

  const score = clampInt(
    completeness + impact + cloudPoints + lengthPoints + atsPoints,
    0,
    100,
  );

  return { score, signals, suggestions };
}
