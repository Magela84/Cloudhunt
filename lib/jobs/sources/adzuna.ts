import { env, isAdzunaConfigured } from "@/lib/env";
import type { JobSource, JobQuery, NormalizedJob } from "@/lib/jobs/types";
import { fetchJson, cached } from "@/lib/jobs/http";
import { stripHtml, toDate } from "@/lib/jobs/util";

interface AdzunaResult {
  id: string;
  title: string;
  description: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  redirect_url: string;
  created?: string;
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
}
interface AdzunaResponse {
  results?: AdzunaResult[];
}

const COUNTRY = "us"; // Adzuna salary data is richest for US/GB
const TTL = 10 * 60 * 1000;

function looksRemote(text: string): boolean {
  return /\bremote\b|\bwork from home\b|\bwfh\b|\bdistributed\b/i.test(text);
}

export const adzunaSource: JobSource = {
  id: "adzuna",
  label: "Adzuna",
  requiresKey: true,
  isConfigured: isAdzunaConfigured,

  async fetchJobs(query: JobQuery): Promise<NormalizedJob[]> {
    if (!isAdzunaConfigured()) return [];
    const params = new URLSearchParams({
      app_id: env.ADZUNA_APP_ID!,
      app_key: env.ADZUNA_APP_KEY!,
      results_per_page: String(Math.min(query.limit ?? 30, 50)),
      what: query.what,
      "content-type": "application/json",
      sort_by: "date",
    });
    if (query.where) params.set("where", query.where);
    const url = `https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search/1?${params}`;

    const data = await cached(`adzuna:${query.what}:${query.where ?? ""}`, TTL, () =>
      fetchJson<AdzunaResponse>(url),
    );
    if (!data?.results) return [];

    return data.results.map((r): NormalizedJob => {
      const description = stripHtml(r.description ?? "");
      const company = r.company?.display_name?.trim() || "Unknown company";
      const location = r.location?.display_name ?? null;
      return {
        source: "adzuna",
        sourceId: String(r.id),
        title: r.title?.trim() ?? "Untitled",
        company,
        description,
        location,
        remote: looksRemote(`${r.title} ${description} ${location ?? ""}`),
        salaryMin: r.salary_min ? Math.round(r.salary_min) : null,
        salaryMax: r.salary_max ? Math.round(r.salary_max) : null,
        salaryCurrency: r.salary_min || r.salary_max ? "USD" : null,
        sourceUrl: r.redirect_url,
        applyUrl: r.redirect_url,
        postedAt: toDate(r.created),
      };
    });
  },
};
