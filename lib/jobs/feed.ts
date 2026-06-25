import "server-only";
import { prisma } from "@/lib/db";
import {
  detectProviders,
  detectSeniority,
  requiresCertification,
  type CloudProvider,
  type Seniority,
} from "@/lib/jobs/classify";
import type { LegitSignal } from "@/lib/scoring/legit";
import type { FitBucket, FitSignal } from "@/lib/scoring/fit";
import { capabilityLabel } from "@/lib/cloud/skill-map";

export interface FeedFilters {
  provider?: CloudProvider;
  seniority?: Seniority;
  remote?: boolean;
  salaryFloor?: number;
  include?: string;
  exclude?: string;
  legitMin?: number;
  certRequired?: boolean;
  /** Minimum Fit Score (the adjustable threshold; default from user setting). */
  minFit?: number;
  bucket?: FitBucket;
}

export interface FeedJob {
  id: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  source: string;
  sourceUrl: string;
  applyUrl: string | null;
  postedAt: string | null;
  seenCount: number;
  legitScore: number;
  legitSummary: string;
  legitSignals: LegitSignal[];
  providers: CloudProvider[];
  seniority: Seniority;
  requiresCert: boolean;
  // Fit (Phase 3) — may be null if not yet scored
  fitScore: number | null;
  fitBucket: FitBucket | null;
  fitSummary: string;
  fitSignals: FitSignal[];
  matchedSkills: string[];
  missingSkills: string[];
}

function parseSignals(v: unknown): { signals: LegitSignal[]; summary: string } {
  if (v && typeof v === "object") {
    const obj = v as Record<string, unknown>;
    const signals = Array.isArray(obj.signals)
      ? (obj.signals as LegitSignal[])
      : [];
    const summary = typeof obj.summary === "string" ? obj.summary : "";
    return { signals, summary };
  }
  return { signals: [], summary: "" };
}

function parseFit(v: unknown): {
  signals: FitSignal[];
  summary: string;
  matched: string[];
  missing: string[];
} {
  const empty = { signals: [] as FitSignal[], summary: "", matched: [], missing: [] };
  if (!v || typeof v !== "object") return empty;
  const o = v as Record<string, unknown>;
  return {
    signals: Array.isArray(o.signals) ? (o.signals as FitSignal[]) : [],
    summary: typeof o.summary === "string" ? o.summary : "",
    matched: Array.isArray(o.matched)
      ? (o.matched as string[]).map(capabilityLabel)
      : [],
    missing: Array.isArray(o.missing)
      ? (o.missing as string[]).map(capabilityLabel)
      : [],
  };
}

function tokens(s?: string): string[] {
  return (s ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

export interface FeedBias {
  providers: string[];
  remote: boolean | null;
}

export async function getFeed(
  userId: string,
  filters: FeedFilters = {},
  bias?: FeedBias,
): Promise<{ jobs: FeedJob[]; total: number }> {
  const rows = await prisma.jobScore.findMany({
    where: { userId, legitScore: { not: null } },
    include: { job: true },
    orderBy: { legitScore: "desc" },
  });

  const all: FeedJob[] = rows.map((r) => {
    const { signals, summary } = parseSignals(r.legitSignals);
    const fit = parseFit(r.fitReasoning);
    const text = `${r.job.title} ${r.job.description}`;
    return {
      id: r.job.id,
      title: r.job.title,
      company: r.job.company,
      location: r.job.location,
      remote: r.job.remote,
      salaryMin: r.job.salaryMin,
      salaryMax: r.job.salaryMax,
      salaryCurrency: r.job.salaryCurrency,
      source: r.job.source,
      sourceUrl: r.job.sourceUrl,
      applyUrl: r.job.applyUrl,
      postedAt: r.job.postedAt ? r.job.postedAt.toISOString() : null,
      seenCount: r.job.seenCount,
      legitScore: r.legitScore!,
      legitSummary: summary,
      legitSignals: signals,
      providers: detectProviders(text),
      seniority: detectSeniority(r.job.title),
      requiresCert: requiresCertification(r.job.description),
      fitScore: r.fitScore,
      fitBucket: r.fitBucket as FitBucket | null,
      fitSummary: fit.summary,
      fitSignals: fit.signals,
      matchedSkills: fit.matched,
      missingSkills: fit.missing,
    };
  });

  const inc = tokens(filters.include);
  const exc = tokens(filters.exclude);

  const jobs = all.filter((j) => {
    if (filters.provider && !j.providers.includes(filters.provider)) return false;
    if (filters.seniority && j.seniority !== filters.seniority) return false;
    if (filters.remote && !j.remote) return false;
    if (filters.legitMin != null && j.legitScore < filters.legitMin) return false;
    if (filters.minFit != null && (j.fitScore == null || j.fitScore < filters.minFit))
      return false;
    if (filters.bucket && j.fitBucket !== filters.bucket) return false;
    if (filters.certRequired != null && j.requiresCert !== filters.certRequired)
      return false;
    if (filters.salaryFloor != null) {
      const top = j.salaryMax ?? j.salaryMin;
      // Exclude only when we have salary data below the floor; keep unknowns.
      if (top != null && top < filters.salaryFloor) return false;
    }
    if (inc.length) {
      const hay = `${j.title} ${j.company}`.toLowerCase();
      if (!inc.some((t) => hay.includes(t))) return false;
    }
    if (exc.length) {
      const hay = `${j.title} ${j.company}`.toLowerCase();
      if (exc.some((t) => hay.includes(t))) return false;
    }
    return true;
  });

  // Light, learned bias (Phase 7c): nudge roles matching what's worked for the
  // user. Small enough to only reorder near-equal fits.
  const boostFor = (j: FeedJob): number => {
    if (!bias) return 0;
    let b = 0;
    if (j.providers.some((p) => bias.providers.includes(p))) b += 2;
    if (bias.remote && j.remote) b += 1;
    return b;
  };

  // Sort: Fit (+ learned bias) desc, then Legit desc, then most recent.
  jobs.sort((a, b) => {
    const af = (a.fitScore ?? -1) + boostFor(a);
    const bf = (b.fitScore ?? -1) + boostFor(b);
    if (bf !== af) return bf - af;
    if (b.legitScore !== a.legitScore) return b.legitScore - a.legitScore;
    return (b.postedAt ?? "").localeCompare(a.postedAt ?? "");
  });

  return { jobs, total: all.length };
}
