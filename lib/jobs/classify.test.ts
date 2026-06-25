import { describe, it, expect } from "vitest";
import { detectProviders, detectSeniority, requiresCertification } from "./classify";

describe("detectProviders", () => {
  it("detects providers from keywords", () => {
    expect(detectProviders("Strong AWS, EKS and Lambda experience")).toContain("AWS");
    expect(detectProviders("Azure AKS and AZ-104")).toContain("Azure");
    expect(detectProviders("GCP with GKE and BigQuery")).toContain("GCP");
  });
  it("returns empty when no provider is mentioned", () => {
    expect(detectProviders("General software role")).toEqual([]);
  });
});

describe("detectSeniority", () => {
  it("classifies titles", () => {
    expect(detectSeniority("Senior Cloud Engineer")).toBe("senior");
    expect(detectSeniority("Staff Platform Engineer")).toBe("lead");
    expect(detectSeniority("Principal SRE")).toBe("principal");
    expect(detectSeniority("Junior DevOps Engineer")).toBe("junior");
    expect(detectSeniority("Cloud Engineer")).toBe("unknown");
  });
});

describe("requiresCertification", () => {
  it("detects certification requirements", () => {
    expect(
      requiresCertification("AWS certification is required for this role"),
    ).toBe(true);
    expect(requiresCertification("Nice to have some cloud experience")).toBe(false);
  });
});
