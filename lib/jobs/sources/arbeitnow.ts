import type { JobSource, JobQuery, NormalizedJob } from "@/lib/jobs/types";
import { fetchJson, cached } from "@/lib/jobs/http";
import { stripHtml, toDate, normalizeKey } from "@/lib/jobs/util";

interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number;
}
interface ArbeitnowResponse {
  data?: ArbeitnowJob[];
}

const TTL = 10 * 60 * 1000;

/** True if any keyword token appears in the haystack. */
export function matchesKeywords(haystack: string, what: string): boolean {
  const tokens = normalizeKey(what).split(" ").filter((t) => t.length > 2);
  if (tokens.length === 0) return true;
  const hay = normalizeKey(haystack);
  return tokens.some((t) => hay.includes(t));
}

export const arbeitnowSource: JobSource = {
  id: "arbeitnow",
  label: "Arbeitnow",
  requiresKey: false,
  isConfigured: () => true,

  async fetchJobs(query: JobQuery): Promise<NormalizedJob[]> {
    const data = await cached("arbeitnow:board", TTL, () =>
      fetchJson<ArbeitnowResponse>("https://www.arbeitnow.com/api/job-board-api"),
    );
    if (!data?.data) return [];

    const limit = query.limit ?? 30;
    return data.data
      .filter((j) =>
        matchesKeywords(`${j.title} ${j.tags?.join(" ") ?? ""}`, query.what),
      )
      .slice(0, limit)
      .map((j): NormalizedJob => ({
        source: "arbeitnow",
        sourceId: j.slug,
        title: j.title?.trim() ?? "Untitled",
        company: j.company_name?.trim() || "Unknown company",
        description: stripHtml(j.description ?? ""),
        location: j.location ?? null,
        remote: Boolean(j.remote),
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null,
        sourceUrl: j.url,
        applyUrl: j.url,
        postedAt: toDate(j.created_at),
      }));
  },
};
