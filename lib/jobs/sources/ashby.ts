import type { JobSource, JobQuery, NormalizedJob } from "@/lib/jobs/types";
import { fetchJson, cached } from "@/lib/jobs/http";
import { stripHtml, toDate } from "@/lib/jobs/util";
import { matchesKeywords } from "@/lib/jobs/sources/arbeitnow";
import { getAtsCompanies } from "@/lib/jobs/sources/ats-config";

interface AshbyJob {
  id: string;
  title: string;
  location?: string;
  isRemote?: boolean;
  descriptionPlain?: string;
  descriptionHtml?: string;
  publishedAt?: string;
  jobUrl: string;
  applyUrl?: string;
  compensation?: { compensationTierSummary?: string };
}
interface AshbyResponse {
  jobs?: AshbyJob[];
}

const TTL = 30 * 60 * 1000;

function prettyName(token: string): string {
  return token.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Parse "$150K – $200K" style summaries into numeric min/max USD. */
export function parseCompensation(
  summary?: string,
): { min: number | null; max: number | null; currency: string | null } {
  if (!summary) return { min: null, max: null, currency: null };
  const isUsd = summary.includes("$") || /USD/i.test(summary);
  const matches = [...summary.matchAll(/(\d[\d,.]*)\s*([kK])?/g)]
    .map((m) => {
      const n = parseFloat(m[1].replace(/,/g, ""));
      if (Number.isNaN(n)) return null;
      return m[2] ? n * 1000 : n;
    })
    .filter((n): n is number => n != null && n >= 1000);
  if (matches.length === 0) return { min: null, max: null, currency: null };
  const min = Math.round(Math.min(...matches));
  const max = Math.round(Math.max(...matches));
  return { min, max: max === min ? null : max, currency: isUsd ? "USD" : null };
}

async function fetchBoard(token: string, query: JobQuery): Promise<NormalizedJob[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(token)}?includeCompensation=true`;
  const data = await cached(`ashby:${token}`, TTL, () =>
    fetchJson<AshbyResponse>(url),
  );
  if (!data?.jobs) return [];
  const company = prettyName(token);

  return data.jobs
    .filter((j) => matchesKeywords(j.title, query.what))
    .map((j): NormalizedJob => {
      const comp = parseCompensation(j.compensation?.compensationTierSummary);
      return {
        source: "ashby",
        sourceId: `${token}:${j.id}`,
        title: (j.title ?? "Untitled").trim(),
        company,
        description: j.descriptionPlain
          ? j.descriptionPlain.trim()
          : stripHtml(j.descriptionHtml ?? ""),
        location: j.location ?? null,
        remote: Boolean(j.isRemote) || /remote/i.test(j.location ?? ""),
        salaryMin: comp.min,
        salaryMax: comp.max,
        salaryCurrency: comp.currency,
        sourceUrl: j.jobUrl,
        applyUrl: j.applyUrl ?? j.jobUrl,
        postedAt: toDate(j.publishedAt),
      };
    });
}

export const ashbySource: JobSource = {
  id: "ashby",
  label: "Ashby",
  requiresKey: false,
  isConfigured: () => getAtsCompanies().ashby.length > 0,

  async fetchJobs(query: JobQuery): Promise<NormalizedJob[]> {
    const tokens = getAtsCompanies().ashby;
    const results = await Promise.all(tokens.map((t) => fetchBoard(t, query)));
    return results.flat();
  },
};
