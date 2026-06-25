import "server-only";
import type { ReviewStatus, Outcome, FitBucket } from "@prisma/client";
import { prisma } from "@/lib/db";
import { computeQueueStats, type QueueStats } from "@/lib/queue-stats";

export interface ReviewItemDTO {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  location: string | null;
  applyUrl: string;
  status: ReviewStatus;
  outcome: Outcome;
  submittedAt: string | null;
  notes: string;
  tailoredResumeId: string | null;
  tailoredResumeLabel: string | null;
  legitScore: number | null;
  fitScore: number | null;
  fitBucket: FitBucket | null;
  atsScore: number | null;
  createdAt: string;
}

export async function getQueue(userId: string): Promise<{
  items: ReviewItemDTO[];
  stats: QueueStats;
}> {
  const rows = await prisma.reviewItem.findMany({
    where: { userId },
    include: { job: true, tailoredResume: true },
    orderBy: { createdAt: "desc" },
  });

  // Scores live on JobScore (per user+job).
  const jobIds = rows.map((r) => r.jobId);
  const scores = await prisma.jobScore.findMany({
    where: { userId, jobId: { in: jobIds } },
  });
  const scoreByJob = new Map(scores.map((s) => [s.jobId, s]));

  const items: ReviewItemDTO[] = rows.map((r) => {
    const score = scoreByJob.get(r.jobId);
    return {
      id: r.id,
      jobId: r.jobId,
      jobTitle: r.job.title,
      company: r.job.company,
      location: r.job.location,
      applyUrl: r.job.applyUrl ?? r.job.sourceUrl,
      status: r.status,
      outcome: r.outcome,
      submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
      notes: r.notes ?? "",
      tailoredResumeId: r.tailoredResumeId,
      tailoredResumeLabel: r.tailoredResume?.label ?? null,
      legitScore: score?.legitScore ?? null,
      fitScore: score?.fitScore ?? null,
      fitBucket: score?.fitBucket ?? null,
      atsScore: score?.atsScore ?? null,
      createdAt: r.createdAt.toISOString(),
    };
  });

  return { items, stats: computeQueueStats(items) };
}
