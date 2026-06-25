import { describe, it, expect } from "vitest";
import { computeFitScore, bucketFor, type FitInputs } from "@/lib/scoring/fit";
import type { JobRequirements } from "@/lib/scoring/requirements";

function reqs(partial: Partial<JobRequirements> = {}): JobRequirements {
  return {
    minYears: null,
    requiresDegree: false,
    degreeOrEquivalent: false,
    clearanceRequired: false,
    noSponsorship: false,
    citizenshipRequired: false,
    capabilities: [],
    ...partial,
  };
}

function inputs(partial: Partial<FitInputs> = {}): FitInputs {
  return {
    userYears: 5,
    userCapabilities: new Set(["aws", "terraform", "kubernetes"]),
    userRemotePreference: "ANY",
    userWorkAuthorization: "U.S. Citizen",
    requirements: reqs(),
    jobRemote: false,
    ...partial,
  };
}

describe("bucketFor", () => {
  it("maps scores to buckets", () => {
    expect(bucketFor(90)).toBe("MATCH");
    expect(bucketFor(75)).toBe("STRETCH");
    expect(bucketFor(55)).toBe("REACH");
    expect(bucketFor(30)).toBe("SKIP");
  });
});

describe("computeFitScore", () => {
  it("scores a well-matched role as MATCH", () => {
    const r = computeFitScore(
      inputs({
        userYears: 5,
        requirements: reqs({
          minYears: 3,
          capabilities: ["aws", "terraform", "kubernetes"],
        }),
      }),
    );
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.bucket).toBe("MATCH");
    expect(r.missingCapabilities).toHaveLength(0);
  });

  it("lowers the score when key skills are missing", () => {
    const r = computeFitScore(
      inputs({
        userCapabilities: new Set(["aws"]),
        requirements: reqs({
          minYears: 3,
          capabilities: ["aws", "terraform", "kubernetes", "azure", "gcp"],
        }),
      }),
    );
    expect(r.bucket).not.toBe("MATCH");
    expect(r.missingCapabilities).toEqual(
      expect.arrayContaining(["terraform", "kubernetes", "azure", "gcp"]),
    );
  });

  it("applies a heavy penalty when sponsorship is needed but unavailable", () => {
    const base = computeFitScore(
      inputs({
        requirements: reqs({ minYears: 3, capabilities: ["aws", "terraform", "kubernetes"] }),
      }),
    );
    const blocked = computeFitScore(
      inputs({
        userWorkAuthorization: "Requires sponsorship now",
        requirements: reqs({
          minYears: 3,
          capabilities: ["aws", "terraform", "kubernetes"],
          noSponsorship: true,
        }),
      }),
    );
    expect(blocked.score).toBeLessThan(base.score);
    expect(blocked.signals.some((s) => s.key === "sponsorship")).toBe(true);
  });

  it("penalizes experience shortfall", () => {
    const r = computeFitScore(
      inputs({
        userYears: 1,
        requirements: reqs({ minYears: 6, capabilities: ["aws"] }),
      }),
    );
    const exp = r.signals.find((s) => s.key === "experience");
    expect(exp?.impact).toBeLessThanOrEqual(5);
  });

  it("flags remote mismatch for remote-only seekers", () => {
    const r = computeFitScore(
      inputs({ userRemotePreference: "REMOTE", jobRemote: false }),
    );
    expect(r.signals.some((s) => s.key === "remote")).toBe(true);
  });

  it("clamps to the 0–100 range", () => {
    const r = computeFitScore(
      inputs({
        userYears: 0,
        userCapabilities: new Set(),
        userWorkAuthorization: "Requires sponsorship now",
        requirements: reqs({
          minYears: 10,
          capabilities: ["aws", "azure", "gcp"],
          clearanceRequired: true,
          noSponsorship: true,
          citizenshipRequired: true,
        }),
      }),
    );
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.bucket).toBe("SKIP");
  });
});
