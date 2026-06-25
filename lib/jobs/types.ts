/** A job normalized to a single shape across all sources. */
export interface NormalizedJob {
  source: string; // "adzuna" | "arbeitnow" | "remoteok" | "greenhouse" | "lever" | "ashby"
  sourceId: string; // id within the source
  title: string;
  company: string;
  description: string; // plain text
  location: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  sourceUrl: string;
  applyUrl: string | null;
  postedAt: Date | null;
}

export interface JobQuery {
  /** Free-text keywords, e.g. "Cloud Engineer". */
  what: string;
  /** Location filter, e.g. "United States". */
  where?: string;
  /** Prefer remote roles. */
  remote?: boolean;
  /** Soft cap on results requested from each source. */
  limit?: number;
}

/** Adapter contract — one implementation per legitimate job source. */
export interface JobSource {
  id: string;
  label: string;
  /** Whether this source needs credentials to work. */
  requiresKey: boolean;
  /** True when the source can run (key present, or no key required). */
  isConfigured(): boolean;
  /** Fetch and normalize jobs. Implementations must never throw — return []. */
  fetchJobs(query: JobQuery): Promise<NormalizedJob[]>;
}
