import { describe, it, expect } from "vitest";
import { computeQueueStats } from "@/lib/queue-stats";

describe("computeQueueStats", () => {
  it("aggregates status, outcomes, and response rate", () => {
    const stats = computeQueueStats([
      { status: "QUEUED", outcome: "NONE" },
      { status: "REVIEWED", outcome: "NONE" },
      { status: "SUBMITTED", outcome: "CALLBACK" },
      { status: "SUBMITTED", outcome: "INTERVIEW" },
      { status: "SUBMITTED", outcome: "REJECTED" },
      { status: "SKIPPED", outcome: "NONE" },
    ]);

    expect(stats.total).toBe(6);
    expect(stats.byStatus.QUEUED).toBe(1);
    expect(stats.byStatus.SUBMITTED).toBe(3);
    expect(stats.active).toBe(2); // QUEUED + REVIEWED
    expect(stats.submitted).toBe(3);
    expect(stats.responses).toBe(2); // callback + interview
    expect(stats.responseRate).toBeCloseTo(2 / 3, 5);
  });

  it("handles an empty queue without dividing by zero", () => {
    const stats = computeQueueStats([]);
    expect(stats.total).toBe(0);
    expect(stats.responseRate).toBe(0);
    expect(stats.byStatus.SUBMITTED).toBe(0);
  });
});
