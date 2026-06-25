import { describe, it, expect } from "vitest";
import { computeLegitScore, isLikelyStaffing, type LegitInputs } from "./legit";

const NOW = new Date("2026-06-01T00:00:00Z");

function base(overrides: Partial<LegitInputs> = {}): LegitInputs {
  return {
    source: "adzuna",
    repostCount: 1,
    postedAt: new Date("2026-05-20T00:00:00Z"),
    hasSalary: true,
    company: "Acme Cloud Inc",
    descriptionLength: 1200,
    templateScore: null,
    now: NOW,
    ...overrides,
  };
}

describe("computeLegitScore", () => {
  it("returns a score within 0–100", () => {
    const r = computeLegitScore(base());
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("rewards direct ATS postings over aggregators", () => {
    const direct = computeLegitScore(base({ source: "greenhouse" }));
    const aggregator = computeLegitScore(base({ source: "adzuna" }));
    expect(direct.score).toBeGreaterThan(aggregator.score);
  });

  it("penalizes heavy reposting (ghost-job signal)", () => {
    const fresh = computeLegitScore(base({ repostCount: 1 }));
    const spammy = computeLegitScore(base({ repostCount: 8 }));
    expect(spammy.score).toBeLessThan(fresh.score);
    expect(spammy.signals.some((s) => s.key === "reposts" && s.impact < 0)).toBe(
      true,
    );
  });

  it("rewards salary transparency", () => {
    const withSalary = computeLegitScore(base({ hasSalary: true }));
    const without = computeLegitScore(base({ hasSalary: false }));
    expect(withSalary.score).toBeGreaterThan(without.score);
  });

  it("penalizes staffing-firm names", () => {
    const staffing = computeLegitScore(base({ company: "Apex Staffing Group" }));
    expect(
      staffing.signals.some((s) => s.key === "employer" && s.impact < 0),
    ).toBe(true);
  });

  it("penalizes very short descriptions", () => {
    const short = computeLegitScore(base({ descriptionLength: 100 }));
    const long = computeLegitScore(base({ descriptionLength: 1500 }));
    expect(short.score).toBeLessThan(long.score);
  });

  it("incorporates LLM template score when provided", () => {
    const specific = computeLegitScore(base({ templateScore: 0.1 }));
    const vague = computeLegitScore(base({ templateScore: 0.9 }));
    expect(specific.score).toBeGreaterThan(vague.score);
  });

  it("flags stale postings", () => {
    const stale = computeLegitScore(
      base({ postedAt: new Date("2026-01-01T00:00:00Z") }),
    );
    expect(stale.signals.some((s) => s.key === "age" && s.impact < 0)).toBe(true);
  });

  it("produces a non-empty plain-English summary", () => {
    const r = computeLegitScore(base());
    expect(r.summary.length).toBeGreaterThan(0);
  });
});

describe("isLikelyStaffing", () => {
  it("detects agency keywords", () => {
    expect(isLikelyStaffing("TechTalent Recruiting")).toBe(true);
    expect(isLikelyStaffing("Globant Staffing")).toBe(true);
    expect(isLikelyStaffing("Stripe")).toBe(false);
  });
});
