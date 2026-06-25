import type { JobSource, JobQuery, NormalizedJob } from "@/lib/jobs/types";
import { fetchJson, cached } from "@/lib/jobs/http";
import { stripHtml, toDate } from "@/lib/jobs/util";
import { matchesKeywords } from "@/lib/jobs/sources/arbeitnow";
import { getAtsCompanies } from "@/lib/jobs/sources/ats-config";

interface LeverPosting {
  id: string;
  text: string; // title
  categories?: { location?: string; team?: string; commitment?: string };
  descriptionPlain?: string;
  description?: string;
  hostedUrl: string;
  applyUrl?: string;
  createdAt?: number;
  workplaceType?: string;
}

const TTL = 30 * 60 * 1000;

function prettyName(token: string): string {
  return token.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchCompany(token: string, query: JobQuery): Promise<NormalizedJob[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(token)}?mode=json`;
  const data = await cached(`lever:${token}`, TTL, () =>
    fetchJson<LeverPosting[]>(url),
  );
  if (!Array.isArray(data)) return [];
  const company = prettyName(token);

  return data
    .filter((p) => matchesKeywords(p.text ?? "", query.what))
    .map((p): NormalizedJob => {
      const loc = p.categories?.location ?? null;
      return {
        source: "lever",
        sourceId: `${token}:${p.id}`,
        title: (p.text ?? "Untitled").trim(),
        company,
        description: p.descriptionPlain
          ? p.descriptionPlain.trim()
          : stripHtml(p.description ?? ""),
        location: loc,
        remote:
          /remote/i.test(loc ?? "") ||
          /remote/i.test(p.workplaceType ?? ""),
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null,
        sourceUrl: p.hostedUrl,
        applyUrl: p.applyUrl ?? p.hostedUrl,
        postedAt: toDate(p.createdAt),
      };
    });
}

export const leverSource: JobSource = {
  id: "lever",
  label: "Lever",
  requiresKey: false,
  isConfigured: () => getAtsCompanies().lever.length > 0,

  async fetchJobs(query: JobQuery): Promise<NormalizedJob[]> {
    const tokens = getAtsCompanies().lever;
    const results = await Promise.all(tokens.map((t) => fetchCompany(t, query)));
    return results.flat();
  },
};
