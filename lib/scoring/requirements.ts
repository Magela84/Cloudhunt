import { capabilitiesInText, type Capability } from "@/lib/cloud/skill-map";

export interface JobRequirements {
  minYears: number | null;
  requiresDegree: boolean;
  degreeOrEquivalent: boolean;
  clearanceRequired: boolean;
  noSponsorship: boolean;
  citizenshipRequired: boolean;
  /** Capabilities the role references (cloud-aware buckets). */
  capabilities: Capability[];
}

const YEARS_RE =
  /(\d{1,2})\s*\+?\s*(?:-|to|–)?\s*(?:\d{1,2})?\s*\+?\s*years?(?:\s+of)?(?:\s+(?:experience|exp))?/gi;

/** Smallest "N years" figure mentioned — the minimum bar the posting states. */
export function extractMinYears(text: string): number | null {
  let min: number | null = null;
  for (const m of text.matchAll(YEARS_RE)) {
    const n = parseInt(m[1], 10);
    if (!Number.isNaN(n) && n <= 25) min = min == null ? n : Math.min(min, n);
  }
  return min;
}

export function extractRequirements(
  title: string,
  description: string,
): JobRequirements {
  const text = `${title}\n${description}`;
  const lower = text.toLowerCase();

  return {
    minYears: extractMinYears(text),
    requiresDegree:
      /\b(bachelor'?s?|master'?s?|b\.?s\.?\b|m\.?s\.?\b|degree in|bachelor of|phd)\b/i.test(
        text,
      ),
    degreeOrEquivalent: /or equivalent(?:\s+(?:work\s+)?experience)?/i.test(text),
    clearanceRequired:
      /\b(security clearance|ts\/sci|top secret|secret clearance|active clearance|clearance (?:is )?required|polygraph)\b/i.test(
        text,
      ),
    noSponsorship:
      /\b(no sponsorship|cannot sponsor|unable to sponsor|not (?:be )?able to sponsor|without sponsorship|sponsorship (?:is )?not (?:available|provided|offered)|not provide sponsorship)\b/i.test(
        lower,
      ),
    citizenshipRequired:
      /\b(u\.?s\.? citizen|must be a (?:u\.?s\.? )?citizen|citizenship (?:is )?required|us citizenship)\b/i.test(
        lower,
      ),
    capabilities: [...capabilitiesInText(text)],
  };
}
