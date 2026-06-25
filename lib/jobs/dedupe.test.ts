import { describe, it, expect } from "vitest";
import { dedupeJobs } from "./dedupe";
import type { NormalizedJob } from "./types";

function job(overrides: Partial<NormalizedJob> = {}): NormalizedJob {
  return {
    source: "adzuna",
    sourceId: Math.random().toString(36).slice(2),
    title: "Cloud Engineer",
    company: "Acme",
    description: "desc",
    location: "Remote",
    remote: true,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    sourceUrl: "https://example.com",
    applyUrl: null,
    postedAt: new Date("2026-05-01T00:00:00Z"),
    ...overrides,
  };
}

describe("dedupeJobs", () => {
  it("removes exact (source + sourceId) duplicates", () => {
    const j = job({ sourceId: "x1" });
    const { unique } = dedupeJobs([j, { ...j }]);
    expect(unique).toHaveLength(1);
  });

  it("collapses same title+company across sources into one", () => {
    const { unique, repostCounts } = dedupeJobs([
      job({ source: "adzuna", sourceId: "a", title: "Cloud Engineer", company: "Acme" }),
      job({ source: "remoteok", sourceId: "b", title: "cloud  engineer", company: "ACME" }),
    ]);
    expect(unique).toHaveLength(1);
    const hash = unique[0].rawHash;
    expect(repostCounts[hash]).toBe(2);
  });

  it("prefers the direct ATS source as the representative", () => {
    const { unique } = dedupeJobs([
      job({ source: "remoteok", sourceId: "b", title: "SRE", company: "Acme" }),
      job({ source: "greenhouse", sourceId: "g", title: "SRE", company: "Acme" }),
    ]);
    expect(unique).toHaveLength(1);
    expect(unique[0].source).toBe("greenhouse");
  });

  it("keeps genuinely different roles separate", () => {
    const { unique } = dedupeJobs([
      job({ title: "Cloud Engineer", company: "Acme", sourceId: "1" }),
      job({ title: "DevOps Engineer", company: "Acme", sourceId: "2" }),
    ]);
    expect(unique).toHaveLength(2);
  });

  it("attaches a stable rawHash", () => {
    const { unique } = dedupeJobs([job({ title: "Platform Engineer", company: "Beta" })]);
    expect(unique[0].rawHash).toMatch(/^[a-f0-9]{32}$/);
  });
});
