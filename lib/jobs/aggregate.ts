import "server-only";
import { Prisma, type User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { configuredSources } from "@/lib/jobs/sources";
import { dedupeJobs } from "@/lib/jobs/dedupe";
import { computeLegitScore } from "@/lib/scoring/legit";
import { scoreTemplateVagueness } from "@/lib/scoring/legit-llm";
import { rescoreFitsForUser } from "@/lib/scoring/fit-run";
import type { JobQuery } from "@/lib/jobs/types";

/** Cap LLM template-scoring per run to bound cost/latency. */
const MAX_LLM_PER_RUN = 12;

export interface AggregateResult {
  fetched: number;
  unique: number;
  scored: number;
  sources: string[];
}

export function buildQuery(user: User): JobQuery {
  const what = user.targetTitles[0] ?? "Cloud Engineer";
  const remote = user.remotePreference === "REMOTE";
  const where = remote ? undefined : user.locationCountry || "United States";
  return { what, where, remote, limit: 25 };
}

function readTemplateScore(v: unknown): number | null {
  if (v && typeof v === "object" && "templateScore" in v) {
    const t = (v as Record<string, unknown>).templateScore;
    return typeof t === "number" ? t : null;
  }
  return null;
}

/**
 * Fetch from all configured sources, dedupe, persist Jobs, and compute a Legit
 * Score (estimate) per job for this user. Adapters never throw, so partial
 * source failures degrade gracefully.
 */
export async function aggregateForUser(user: User): Promise<AggregateResult> {
  const sources = configuredSources();
  const query = buildQuery(user);

  const settled = await Promise.allSettled(
    sources.map((s) => s.fetchJobs(query)),
  );
  const raw = settled.flatMap((r) =>
    r.status === "fulfilled" ? r.value : [],
  );
  const { unique } = dedupeJobs(raw);

  // 1. Persist jobs, tracking the DB id for each.
  const jobIdByKey = new Map<string, string>();
  for (const j of unique) {
    const job = await prisma.job.upsert({
      where: { source_sourceId: { source: j.source, sourceId: j.sourceId } },
      create: {
        source: j.source,
        sourceId: j.sourceId,
        title: j.title,
        company: j.company,
        description: j.description,
        location: j.location,
        remote: j.remote,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        salaryCurrency: j.salaryCurrency,
        sourceUrl: j.sourceUrl,
        applyUrl: j.applyUrl,
        postedAt: j.postedAt,
        rawHash: j.rawHash,
      },
      update: {
        description: j.description,
        location: j.location,
        remote: j.remote,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        salaryCurrency: j.salaryCurrency,
        applyUrl: j.applyUrl,
        postedAt: j.postedAt,
        lastSeenAt: new Date(),
        seenCount: { increment: 1 },
        rawHash: j.rawHash,
      },
    });
    jobIdByKey.set(`${j.source}:${j.sourceId}`, job.id);
  }

  // 2. Corpus repost frequency: distinct postings sharing each title+company.
  const hashes = [...new Set(unique.map((u) => u.rawHash))];
  const grouped = hashes.length
    ? await prisma.job.groupBy({
        by: ["rawHash"],
        where: { rawHash: { in: hashes } },
        _count: { _all: true },
      })
    : [];
  const repostByHash = new Map(grouped.map((g) => [g.rawHash, g._count._all]));

  // 3. Existing scores (to reuse cached LLM template scores).
  const jobIds = [...jobIdByKey.values()];
  const existing = await prisma.jobScore.findMany({
    where: { userId: user.id, jobId: { in: jobIds } },
    select: { jobId: true, legitSignals: true },
  });
  const signalsByJobId = new Map(
    existing.map((s) => [s.jobId, s.legitSignals]),
  );

  // 4. Score each job and upsert JobScore.
  let llmBudget = MAX_LLM_PER_RUN;
  let scored = 0;
  for (const j of unique) {
    const jobId = jobIdByKey.get(`${j.source}:${j.sourceId}`);
    if (!jobId) continue;

    let templateScore = readTemplateScore(signalsByJobId.get(jobId));
    if (templateScore == null && llmBudget > 0) {
      const t = await scoreTemplateVagueness(j.title, j.description);
      if (t != null) {
        templateScore = t;
        llmBudget -= 1;
      }
    }

    const result = computeLegitScore({
      source: j.source,
      repostCount: repostByHash.get(j.rawHash) ?? 1,
      postedAt: j.postedAt,
      hasSalary: j.salaryMin != null || j.salaryMax != null,
      company: j.company,
      descriptionLength: j.description.length,
      templateScore,
    });

    const legitSignals = {
      signals: result.signals,
      summary: result.summary,
      templateScore,
    } as unknown as Prisma.InputJsonObject;

    await prisma.jobScore.upsert({
      where: { userId_jobId: { userId: user.id, jobId } },
      create: {
        userId: user.id,
        jobId,
        legitScore: result.score,
        legitSignals,
      },
      update: { legitScore: result.score, legitSignals },
    });
    scored += 1;
  }

  // 5. Compute Fit Score across all of the user's scored jobs.
  await rescoreFitsForUser(user);

  return {
    fetched: raw.length,
    unique: unique.length,
    scored,
    sources: sources.map((s) => s.id),
  };
}
