import type { JobSource, JobQuery, NormalizedJob } from "@/lib/jobs/types";
import { fetchJson, cached } from "@/lib/jobs/http";
import { stripHtml, toDate } from "@/lib/jobs/util";
import { matchesKeywords } from "@/lib/jobs/sources/arbeitnow";

// RemoteOK returns an array whose first element is a legal/attribution notice.
interface RemoteOkJob {
  id?: string | number;
  slug?: string;
  position?: string;
  company?: string;
  description?: string;
  tags?: string[];
  location?: string;
  url?: string;
  apply_url?: string;
  date?: string;
  salary_min?: number;
  salary_max?: number;
  legal?: string;
}

const TTL = 10 * 60 * 1000;

export const remoteOkSource: JobSource = {
  id: "remoteok",
  label: "RemoteOK",
  requiresKey: false,
  isConfigured: () => true,

  async fetchJobs(query: JobQuery): Promise<NormalizedJob[]> {
    const data = await cached("remoteok:all", TTL, () =>
      fetchJson<RemoteOkJob[]>("https://remoteok.com/api"),
    );
    if (!Array.isArray(data)) return [];

    const limit = query.limit ?? 30;
    return data
      .filter((j) => j && !j.legal && j.position && j.url)
      .filter((j) =>
        matchesKeywords(
          `${j.position} ${j.tags?.join(" ") ?? ""}`,
          query.what,
        ),
      )
      .slice(0, limit)
      .map((j): NormalizedJob => {
        const description = stripHtml(j.description ?? "");
        return {
          source: "remoteok",
          sourceId: String(j.id ?? j.slug),
          title: (j.position ?? "Untitled").trim(),
          company: (j.company ?? "Unknown company").trim(),
          description,
          location: j.location || "Remote",
          remote: true,
          salaryMin: j.salary_min ? Math.round(j.salary_min) : null,
          salaryMax: j.salary_max ? Math.round(j.salary_max) : null,
          salaryCurrency: j.salary_min || j.salary_max ? "USD" : null,
          sourceUrl: j.url!,
          applyUrl: j.apply_url ?? j.url ?? null,
          postedAt: toDate(j.date),
        };
      });
  },
};
