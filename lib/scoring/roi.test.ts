import { describe, it, expect } from "vitest";
import { computeSkillGapRoi, type RoiJob, type RoiProfile } from "@/lib/scoring/roi";
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

const profile: RoiProfile = {
  userCapabilities: new Set(["aws"]),
  userYears: 5,
  userRemotePreference: "ANY",
  userWorkAuthorization: "U.S. Citizen",
  threshold: 85,
};

describe("computeSkillGapRoi", () => {
  it("identifies a capability that unlocks an otherwise out-of-reach job", () => {
    const jobs: RoiJob[] = [
      {
        requirements: reqs({ capabilities: ["aws", "terraform"], minYears: 3 }),
        remote: false,
        salaryMin: 120000,
        salaryMax: 160000,
      },
    ];
    const roi = computeSkillGapRoi(jobs, profile);
    const terraform = roi.find((r) => r.capability === "terraform");
    expect(terraform).toBeDefined();
    expect(terraform!.jobsUnlocked).toBe(1);
    expect(terraform!.medianSalaryUnlocked).toBe(140000);
    expect(terraform!.suggestedCredential).toMatch(/terraform/i);
  });

  it("does not suggest capabilities the user already has", () => {
    const jobs: RoiJob[] = [
      { requirements: reqs({ capabilities: ["aws"] }), remote: false, salaryMin: null, salaryMax: null },
    ];
    const roi = computeSkillGapRoi(jobs, profile);
    expect(roi.find((r) => r.capability === "aws")).toBeUndefined();
  });

  it("ranks by jobs unlocked", () => {
    const jobs: RoiJob[] = [
      { requirements: reqs({ capabilities: ["aws", "terraform"], minYears: 3 }), remote: false, salaryMin: null, salaryMax: null },
      { requirements: reqs({ capabilities: ["aws", "terraform"], minYears: 3 }), remote: false, salaryMin: null, salaryMax: null },
      { requirements: reqs({ capabilities: ["aws", "kubernetes"], minYears: 3 }), remote: false, salaryMin: null, salaryMax: null },
    ];
    const roi = computeSkillGapRoi(jobs, profile);
    expect(roi[0].capability).toBe("terraform"); // unlocks 2 vs kubernetes 1
    expect(roi[0].jobsUnlocked).toBe(2);
  });
});
