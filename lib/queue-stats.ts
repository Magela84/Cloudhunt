import type { ReviewStatus, Outcome } from "@prisma/client";

export interface QueueStatItem {
  status: ReviewStatus;
  outcome: Outcome;
}

export interface QueueStats {
  total: number;
  byStatus: Record<ReviewStatus, number>;
  byOutcome: Record<Outcome, number>;
  /** Items still to act on (QUEUED or REVIEWED). */
  active: number;
  submitted: number;
  /** Any positive response: callback, interview, or offer. */
  responses: number;
  /** responses / submitted, 0–1 (0 when nothing submitted). */
  responseRate: number;
}

const STATUSES: ReviewStatus[] = ["QUEUED", "REVIEWED", "SUBMITTED", "SKIPPED"];
const OUTCOMES: Outcome[] = [
  "NONE",
  "CALLBACK",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
];

/** Aggregate review items into pipeline + outcome stats for the dashboard. */
export function computeQueueStats(items: QueueStatItem[]): QueueStats {
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<
    ReviewStatus,
    number
  >;
  const byOutcome = Object.fromEntries(OUTCOMES.map((o) => [o, 0])) as Record<
    Outcome,
    number
  >;

  for (const item of items) {
    byStatus[item.status] += 1;
    byOutcome[item.outcome] += 1;
  }

  const submitted = byStatus.SUBMITTED;
  const responses = byOutcome.CALLBACK + byOutcome.INTERVIEW + byOutcome.OFFER;

  return {
    total: items.length,
    byStatus,
    byOutcome,
    active: byStatus.QUEUED + byStatus.REVIEWED,
    submitted,
    responses,
    responseRate: submitted > 0 ? responses / submitted : 0,
  };
}
