/**
 * Outcome-learning loop: from the user's own submitted applications and their
 * outcomes, learn which kinds of roles are getting responses — so we can show
 * "what's working for you" and gently bias future ranking.
 */

export interface OutcomeRecord {
  providers: string[]; // e.g. ["AWS"]
  remote: boolean;
  seniority: string; // "senior" | "mid" | ...
  outcome: "NONE" | "CALLBACK" | "INTERVIEW" | "OFFER" | "REJECTED";
  status: "QUEUED" | "REVIEWED" | "SUBMITTED" | "SKIPPED";
}

export interface InsightRow {
  key: string;
  label: string;
  submitted: number;
  responses: number;
  rate: number; // 0–1
}

export interface OutcomeInsights {
  totalSubmitted: number;
  totalResponses: number;
  overallRate: number;
  rows: InsightRow[];
  hasEnoughData: boolean;
  /** Attribute keys that outperform the overall rate (for feed bias). */
  favored: { providers: string[]; remote: boolean | null };
}

function isSubmitted(r: OutcomeRecord): boolean {
  return r.status === "SUBMITTED" || r.outcome !== "NONE";
}
function isResponse(r: OutcomeRecord): boolean {
  return r.outcome === "CALLBACK" || r.outcome === "INTERVIEW" || r.outcome === "OFFER";
}

export function computeOutcomeInsights(records: OutcomeRecord[]): OutcomeInsights {
  const submittedRecs = records.filter(isSubmitted);
  const totalSubmitted = submittedRecs.length;
  const totalResponses = submittedRecs.filter(isResponse).length;
  const overallRate = totalSubmitted ? totalResponses / totalSubmitted : 0;

  // Build attribute buckets.
  type Bucket = { label: string; subset: OutcomeRecord[] };
  const buckets: Record<string, Bucket> = {
    "remote:true": { label: "Remote roles", subset: [] },
    "remote:false": { label: "On-site / hybrid roles", subset: [] },
    "provider:AWS": { label: "AWS roles", subset: [] },
    "provider:Azure": { label: "Azure roles", subset: [] },
    "provider:GCP": { label: "GCP roles", subset: [] },
  };
  const seniorityBuckets = new Map<string, Bucket>();

  for (const r of submittedRecs) {
    buckets[r.remote ? "remote:true" : "remote:false"].subset.push(r);
    for (const p of r.providers) {
      const k = `provider:${p}`;
      if (buckets[k]) buckets[k].subset.push(r);
    }
    if (r.seniority && r.seniority !== "unknown") {
      const k = `seniority:${r.seniority}`;
      if (!seniorityBuckets.has(k))
        seniorityBuckets.set(k, {
          label: `${r.seniority[0].toUpperCase()}${r.seniority.slice(1)} roles`,
          subset: [],
        });
      seniorityBuckets.get(k)!.subset.push(r);
    }
  }

  const all = { ...buckets, ...Object.fromEntries(seniorityBuckets) };
  const rows: InsightRow[] = Object.entries(all)
    .filter(([, b]) => b.subset.length > 0)
    .map(([key, b]) => {
      const responses = b.subset.filter(isResponse).length;
      return {
        key,
        label: b.label,
        submitted: b.subset.length,
        responses,
        rate: responses / b.subset.length,
      };
    })
    .sort((a, b) => b.rate - a.rate || b.submitted - a.submitted);

  // Favored attributes: beat the overall rate with at least 2 submissions.
  const favoredProviders = rows
    .filter((r) => r.key.startsWith("provider:") && r.submitted >= 2 && r.rate > overallRate)
    .map((r) => r.key.split(":")[1]);
  const remoteRow = rows.find((r) => r.key === "remote:true");
  const favorRemote =
    remoteRow && remoteRow.submitted >= 2 && remoteRow.rate > overallRate ? true : null;

  return {
    totalSubmitted,
    totalResponses,
    overallRate,
    rows,
    hasEnoughData: totalSubmitted >= 3,
    favored: { providers: favoredProviders, remote: favorRemote },
  };
}
