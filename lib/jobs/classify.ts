export type CloudProvider = "AWS" | "Azure" | "GCP";
export type Seniority =
  | "intern"
  | "junior"
  | "mid"
  | "senior"
  | "lead"
  | "principal"
  | "unknown";

const PROVIDER_PATTERNS: Record<CloudProvider, RegExp> = {
  AWS: /\b(aws|amazon web services|ec2|s3|eks|lambda|cloudformation|dynamodb|fargate)\b/i,
  Azure: /\b(azure|aks|az-?\d{3}|azure devops|entra)\b/i,
  GCP: /\b(gcp|google cloud|gke|bigquery|cloud run|vertex ai)\b/i,
};

export function detectProviders(text: string): CloudProvider[] {
  return (Object.keys(PROVIDER_PATTERNS) as CloudProvider[]).filter((p) =>
    PROVIDER_PATTERNS[p].test(text),
  );
}

export function detectSeniority(title: string): Seniority {
  const t = title.toLowerCase();
  if (/\bintern(ship)?\b/.test(t)) return "intern";
  if (/\b(principal|distinguished)\b/.test(t)) return "principal";
  if (/\b(staff|lead|architect|head of)\b/.test(t)) return "lead";
  if (/\b(senior|sr\.?|sr)\b/.test(t)) return "senior";
  if (/\b(junior|jr\.?|entry[-\s]?level|associate|graduate)\b/.test(t))
    return "junior";
  if (/\b(mid|intermediate)\b/.test(t)) return "mid";
  return "unknown";
}

/** Heuristic: does the posting appear to require a certification? */
export function requiresCertification(text: string): boolean {
  return /\b(certif\w+\s+(is\s+)?(required|preferred|a plus)|must (have|hold) .{0,40}certif|certified (solutions architect|kubernetes|cloud))\b/i.test(
    text,
  );
}
