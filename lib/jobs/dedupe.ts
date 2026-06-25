import type { NormalizedJob } from "@/lib/jobs/types";
import { computeRawHash } from "@/lib/jobs/util";

export type DedupedJob = NormalizedJob & { rawHash: string };

export interface DedupeResult {
  unique: DedupedJob[];
  /** Number of distinct postings sharing each rawHash (repost frequency). */
  repostCounts: Record<string, number>;
}

// Direct-employer ATS boards are the most trustworthy source for a posting.
export const SOURCE_RANK: Record<string, number> = {
  greenhouse: 5,
  lever: 5,
  ashby: 5,
  adzuna: 3,
  arbeitnow: 2,
  remoteok: 2,
};

function rank(source: string): number {
  return SOURCE_RANK[source] ?? 1;
}

function newer(a: Date | null, b: Date | null): number {
  return (a?.getTime() ?? 0) - (b?.getTime() ?? 0);
}

/**
 * Collapse a multi-source batch into one posting per title+company, preferring
 * the most trustworthy source. Also reports how many distinct postings shared
 * each title+company (the repost-frequency signal for Legit Score).
 */
export function dedupeJobs(jobs: NormalizedJob[]): DedupeResult {
  // 1. Drop exact duplicates (same source + sourceId).
  const bySourceId = new Map<string, NormalizedJob>();
  for (const job of jobs) {
    const key = `${job.source}:${job.sourceId}`;
    if (!bySourceId.has(key)) bySourceId.set(key, job);
  }

  // 2. Group by rawHash (normalized title + company).
  const groups = new Map<string, DedupedJob[]>();
  for (const job of bySourceId.values()) {
    const rawHash = computeRawHash(job.title, job.company);
    const withHash: DedupedJob = { ...job, rawHash };
    const arr = groups.get(rawHash);
    if (arr) arr.push(withHash);
    else groups.set(rawHash, [withHash]);
  }

  // 3. Pick the best representative per group and tally repost counts.
  const unique: DedupedJob[] = [];
  const repostCounts: Record<string, number> = {};
  for (const [rawHash, group] of groups) {
    repostCounts[rawHash] = group.length;
    const best = group.reduce((a, b) => {
      const r = rank(b.source) - rank(a.source);
      if (r !== 0) return r > 0 ? b : a;
      const t = newer(b.postedAt, a.postedAt);
      if (t !== 0) return t > 0 ? b : a;
      return b.description.length > a.description.length ? b : a;
    });
    unique.push(best);
  }

  unique.sort((a, b) => newer(b.postedAt, a.postedAt));
  return { unique, repostCounts };
}
