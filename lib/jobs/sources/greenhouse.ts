import type { JobSource, JobQuery, NormalizedJob } from "@/lib/jobs/types";
import { fetchJson, cached } from "@/lib/jobs/http";
import { stripHtml, decodeEntities, toDate } from "@/lib/jobs/util";
import { matchesKeywords } from "@/lib/jobs/sources/arbeitnow";
import { getAtsCompanies } from "@/lib/jobs/sources/ats-config";

interface GreenhouseJob {
  id: number;
  title: string;
  updated_at?: string;
  location?: { name?: string };
  content?: string; // HTML-escaped
  absolute_url: string;
}
interface GreenhouseResponse {
  jobs?: GreenhouseJob[];
}

const TTL = 30 * 60 * 1000;

function prettyName(token: string): string {
  return token
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchBoard(token: string, query: JobQuery): Promise<NormalizedJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`;
  const data = await cached(`greenhouse:${token}`, TTL, () =>
    fetchJson<GreenhouseResponse>(url),
  );
  if (!data?.jobs) return [];
  const company = prettyName(token);

  return data.jobs
    .filter((j) => matchesKeywords(j.title, query.what))
    .map((j): NormalizedJob => {
      const description = stripHtml(decodeEntities(j.content ?? ""));
      const loc = j.location?.name ?? null;
      return {
        source: "greenhouse",
        sourceId: `${token}:${j.id}`,
        title: j.title?.trim() ?? "Untitled",
        company,
        description,
        location: loc,
        remote: /remote/i.test(loc ?? ""),
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null,
        sourceUrl: j.absolute_url,
        applyUrl: j.absolute_url,
        postedAt: toDate(j.updated_at),
      };
    });
}

export const greenhouseSource: JobSource = {
  id: "greenhouse",
  label: "Greenhouse",
  requiresKey: false,
  isConfigured: () => getAtsCompanies().greenhouse.length > 0,

  async fetchJobs(query: JobQuery): Promise<NormalizedJob[]> {
    const tokens = getAtsCompanies().greenhouse;
    const results = await Promise.all(tokens.map((t) => fetchBoard(t, query)));
    return results.flat();
  },
};
