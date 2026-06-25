import { clampInt } from "@/lib/jobs/util";
import { termsInText } from "@/lib/cloud/skill-map";

export interface AtsResult {
  score: number; // 0–100
  matched: string[]; // job keywords present in the resume
  missing: string[]; // job keywords absent from the resume
  suggestions: string[];
}

/** Title-case a surface term for display (keeps known acronyms upper). */
function pretty(term: string): string {
  if (/^[a-z0-9/+.\-]{2,5}$/.test(term) && !term.includes(" "))
    return term.toUpperCase();
  return term.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Per-job ATS keyword match. Compares cloud/devops keywords the posting uses
 * against what's actually in the resume. This is guidance for tailoring — never
 * a reason to keyword-stuff. Missing keywords are surfaced as "add if real".
 */
export function computeAtsMatch(
  resumeText: string,
  jobTitle: string,
  jobDescription: string,
): AtsResult {
  const jobTerms = [...new Set(termsInText(`${jobTitle} ${jobDescription}`))];
  const resumeTerms = new Set(termsInText(resumeText));

  const matched = jobTerms.filter((t) => resumeTerms.has(t));
  const missing = jobTerms.filter((t) => !resumeTerms.has(t));

  const score =
    jobTerms.length === 0
      ? 60 // no extractable keywords — neutral
      : clampInt((matched.length / jobTerms.length) * 100, 0, 100);

  const suggestions: string[] = [];
  if (missing.length) {
    suggestions.push(
      `The posting emphasizes ${missing
        .slice(0, 6)
        .map(pretty)
        .join(", ")} — surface any of these you have genuine experience with.`,
    );
  }
  if (matched.length) {
    suggestions.push(
      `You already match ${matched.length} of ${jobTerms.length} key terms — make sure they appear in your summary and bullets, not just a skills list.`,
    );
  }
  suggestions.push(
    "Never add a keyword you can't back up — ATS scores are guidance, and fabrication gets caught in interviews.",
  );

  return {
    score,
    matched: matched.map(pretty),
    missing: missing.map(pretty),
    suggestions,
  };
}
