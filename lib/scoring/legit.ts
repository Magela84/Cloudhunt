import { clampInt } from "@/lib/jobs/util";

/** Inputs for the Legit Score — all derived from the job + corpus, no user data. */
export interface LegitInputs {
  source: string;
  /** Distinct postings sharing this title+company (repost frequency). */
  repostCount: number;
  postedAt: Date | null;
  hasSalary: boolean;
  company: string;
  descriptionLength: number;
  /**
   * Optional LLM template/vagueness score in [0,1] — higher = more
   * templated/vague (worse). Null when not computed.
   */
  templateScore: number | null;
  /** "Now" for age calculations; injectable for deterministic tests. */
  now?: Date;
}

export interface LegitSignal {
  key: string;
  label: string;
  impact: number; // signed contribution to the score
  detail: string;
}

export interface LegitResult {
  score: number; // 0–100
  signals: LegitSignal[];
  summary: string;
}

const DIRECT_SOURCES = new Set(["greenhouse", "lever", "ashby"]);

const STAFFING_PATTERNS = [
  /staffing/i,
  /recruit/i,
  /talent\s/i,
  /headhunt/i,
  /\brpo\b/i,
  /placement/i,
  /consultanc/i,
  /\bagency\b/i,
];

export function isLikelyStaffing(company: string): boolean {
  return STAFFING_PATTERNS.some((p) => p.test(company));
}

const BASE_SCORE = 60;

/**
 * Compute an explainable Legit Score (estimate) from deterministic signals.
 * The score is guidance, never a verification — always shown with a caution.
 */
export function computeLegitScore(input: LegitInputs): LegitResult {
  const now = input.now ?? new Date();
  const signals: LegitSignal[] = [];

  // 1. Source / employer directness
  if (DIRECT_SOURCES.has(input.source)) {
    signals.push({
      key: "source",
      label: "Direct employer posting",
      impact: 15,
      detail: "Listed on the company's own ATS board, not an aggregator.",
    });
  } else if (input.source === "adzuna") {
    signals.push({
      key: "source",
      label: "Aggregator listing",
      impact: 2,
      detail: "From an aggregator with salary data; verify the employer directly.",
    });
  } else {
    signals.push({
      key: "source",
      label: "Job-board listing",
      impact: 0,
      detail: "From a public job board; confirm the employer is real.",
    });
  }

  // 2. Staffing / recruiter vs direct employer name
  if (isLikelyStaffing(input.company)) {
    signals.push({
      key: "employer",
      label: "Looks like a staffing/recruiting firm",
      impact: -12,
      detail:
        "Company name suggests an agency rather than the hiring employer. Not necessarily a scam, but vet who you'd actually work for.",
    });
  }

  // 3. Salary transparency
  if (input.hasSalary) {
    signals.push({
      key: "salary",
      label: "Salary range disclosed",
      impact: 12,
      detail: "Transparent compensation is a positive legitimacy signal.",
    });
  } else {
    signals.push({
      key: "salary",
      label: "No salary range",
      impact: -6,
      detail: "Missing pay data is common but reduces transparency.",
    });
  }

  // 4. Repost frequency (ghost-job signal)
  if (input.repostCount >= 6) {
    signals.push({
      key: "reposts",
      label: `Reposted ${input.repostCount}× (title + company)`,
      impact: -12,
      detail:
        "Frequently reposted listings can be evergreen pipelines or ghost jobs.",
    });
  } else if (input.repostCount >= 3) {
    signals.push({
      key: "reposts",
      label: `Seen ${input.repostCount}× across sources`,
      impact: -4,
      detail: "Appears on several boards — could be wide distribution or reposting.",
    });
  } else {
    signals.push({
      key: "reposts",
      label: "Not heavily reposted",
      impact: 4,
      detail: "Low repost frequency is a mild positive signal.",
    });
  }

  // 5. Posting age
  if (input.postedAt) {
    const ageDays = Math.floor(
      (now.getTime() - input.postedAt.getTime()) / 86_400_000,
    );
    if (ageDays <= 30) {
      signals.push({
        key: "age",
        label: "Recently posted",
        impact: 4,
        detail: `Posted about ${Math.max(ageDays, 0)} day(s) ago.`,
      });
    } else if (ageDays > 60) {
      signals.push({
        key: "age",
        label: "Stale posting",
        impact: -6,
        detail: `Posted ~${ageDays} days ago and still active.`,
      });
    }
  }

  // 6. Description substance
  if (input.descriptionLength < 300) {
    signals.push({
      key: "description",
      label: "Very short description",
      impact: -8,
      detail: "Sparse descriptions correlate with low-effort or fake listings.",
    });
  } else {
    signals.push({
      key: "description",
      label: "Substantive description",
      impact: 4,
      detail: "The role description has meaningful detail.",
    });
  }

  // 7. LLM template / vagueness (optional)
  if (input.templateScore != null) {
    const impact = clampInt((0.5 - input.templateScore) * 20, -10, 10);
    signals.push({
      key: "template",
      label:
        input.templateScore > 0.6
          ? "Vague / templated language"
          : "Specific, role-focused language",
      impact,
      detail:
        input.templateScore > 0.6
          ? "AI flagged generic, template-like phrasing."
          : "AI read the description as specific and concrete.",
    });
  }

  const raw = signals.reduce((sum, s) => sum + s.impact, BASE_SCORE);
  const score = clampInt(raw, 0, 100);

  const sorted = [...signals].sort((a, b) => b.impact - a.impact);
  const topPos = sorted.find((s) => s.impact > 0);
  const topNeg = [...sorted].reverse().find((s) => s.impact < 0);
  const parts: string[] = [];
  if (topPos) parts.push(topPos.label.toLowerCase());
  if (topNeg) parts.push(`but ${topNeg.label.toLowerCase()}`);
  const summary =
    parts.length > 0
      ? `Mainly: ${parts.join(", ")}.`
      : "Limited signals available.";

  return { score, signals, summary };
}
