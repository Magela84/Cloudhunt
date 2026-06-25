import { describe, it, expect } from "vitest";
import { extractMinYears, extractRequirements } from "@/lib/scoring/requirements";

describe("extractMinYears", () => {
  it("parses common phrasings and takes the minimum", () => {
    expect(extractMinYears("5+ years of experience")).toBe(5);
    expect(extractMinYears("3-5 years in cloud")).toBe(3);
    expect(extractMinYears("minimum of 7 years")).toBe(7);
    expect(extractMinYears("no experience requirement stated")).toBeNull();
  });
});

describe("extractRequirements", () => {
  it("detects hard requirements", () => {
    const r = extractRequirements(
      "Senior Cloud Engineer",
      "Requires an active security clearance. We are unable to sponsor visas. 6+ years of experience with AWS, Terraform, and Kubernetes. Bachelor's degree required.",
    );
    expect(r.minYears).toBe(6);
    expect(r.clearanceRequired).toBe(true);
    expect(r.noSponsorship).toBe(true);
    expect(r.requiresDegree).toBe(true);
    expect(r.capabilities).toEqual(
      expect.arrayContaining(["aws", "terraform", "kubernetes"]),
    );
  });

  it("honors 'or equivalent experience'", () => {
    const r = extractRequirements(
      "Cloud Engineer",
      "Bachelor's degree or equivalent experience. Work with GCP.",
    );
    expect(r.requiresDegree).toBe(true);
    expect(r.degreeOrEquivalent).toBe(true);
    expect(r.capabilities).toContain("gcp");
  });

  it("detects citizenship requirements", () => {
    const r = extractRequirements("Engineer", "Must be a US citizen.");
    expect(r.citizenshipRequired).toBe(true);
  });
});
