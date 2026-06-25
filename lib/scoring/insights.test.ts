import { describe, it, expect } from "vitest";
import { computeOutcomeInsights, type OutcomeRecord } from "@/lib/scoring/insights";

const recs: OutcomeRecord[] = [
  { providers: ["AWS"], remote: true, seniority: "senior", outcome: "CALLBACK", status: "SUBMITTED" },
  { providers: ["AWS"], remote: true, seniority: "senior", outcome: "INTERVIEW", status: "SUBMITTED" },
  { providers: ["Azure"], remote: false, seniority: "mid", outcome: "REJECTED", status: "SUBMITTED" },
];

describe("computeOutcomeInsights", () => {
  it("computes overall response rate and per-attribute rates", () => {
    const i = computeOutcomeInsights(recs);
    expect(i.totalSubmitted).toBe(3);
    expect(i.totalResponses).toBe(2);
    expect(i.overallRate).toBeCloseTo(2 / 3, 5);
    const aws = i.rows.find((r) => r.key === "provider:AWS");
    expect(aws?.rate).toBe(1);
    expect(aws?.responses).toBe(2);
  });

  it("flags favored attributes that beat the overall rate", () => {
    const i = computeOutcomeInsights(recs);
    expect(i.favored.providers).toContain("AWS");
    expect(i.favored.remote).toBe(true);
    expect(i.hasEnoughData).toBe(true);
  });

  it("reports not-enough-data below 3 submissions", () => {
    const i = computeOutcomeInsights([recs[0]]);
    expect(i.hasEnoughData).toBe(false);
  });

  it("treats unsubmitted items as not counted", () => {
    const i = computeOutcomeInsights([
      { providers: ["AWS"], remote: true, seniority: "mid", outcome: "NONE", status: "QUEUED" },
    ]);
    expect(i.totalSubmitted).toBe(0);
    expect(i.overallRate).toBe(0);
  });
});
