import { describe, it, expect } from "vitest";
import { computeAtsMatch } from "@/lib/scoring/ats";

describe("computeAtsMatch", () => {
  it("matches resume keywords against the job and scores coverage", () => {
    const resume = "Cloud engineer experienced with AWS, Terraform and Kubernetes.";
    const r = computeAtsMatch(
      resume,
      "Cloud Engineer",
      "We need AWS, Terraform, and Azure experience.",
    );
    const lower = (a: string[]) => a.map((s) => s.toLowerCase());
    expect(lower(r.matched)).toEqual(expect.arrayContaining(["aws", "terraform"]));
    expect(lower(r.missing)).toContain("azure");
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThan(100);
  });

  it("returns a neutral score when no keywords are present", () => {
    const r = computeAtsMatch("generic text", "Manager", "lead a team");
    expect(r.score).toBe(60);
  });

  it("always includes the anti-fabrication caution", () => {
    const r = computeAtsMatch("aws", "Engineer", "aws kubernetes");
    expect(r.suggestions.some((s) => /never add a keyword/i.test(s))).toBe(true);
  });
});
