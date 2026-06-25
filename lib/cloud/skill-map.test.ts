import { describe, it, expect } from "vitest";
import {
  capabilitiesInText,
  capabilitiesFromCerts,
  buildUserCapabilities,
} from "@/lib/cloud/skill-map";

describe("capabilitiesInText", () => {
  it("maps EKS to both kubernetes and aws (cloud-aware)", () => {
    const caps = capabilitiesInText("Experience operating EKS clusters");
    expect(caps.has("kubernetes")).toBe(true);
    expect(caps.has("aws")).toBe(true);
  });

  it("recognizes IaC terms as terraform", () => {
    expect(capabilitiesInText("infrastructure as code").has("terraform")).toBe(true);
    expect(capabilitiesInText("Terraform and Pulumi").has("terraform")).toBe(true);
  });

  it("recognizes Azure exam codes", () => {
    expect(capabilitiesInText("AZ-104 certified").has("azure")).toBe(true);
  });

  it("does not match substrings across word boundaries", () => {
    // "goal" should not register the "go" language capability
    expect(capabilitiesInText("our goal is reliability").has("go")).toBe(false);
  });
});

describe("capabilitiesFromCerts", () => {
  it("maps certs to capabilities", () => {
    expect(capabilitiesFromCerts(["Certified Kubernetes Administrator (CKA)"]).has("kubernetes")).toBe(true);
    expect(capabilitiesFromCerts(["AWS Solutions Architect Associate (SAA)"]).has("aws")).toBe(true);
    expect(capabilitiesFromCerts(["HashiCorp Terraform Associate"]).has("terraform")).toBe(true);
    expect(capabilitiesFromCerts(["Azure Administrator (AZ-104)"]).has("azure")).toBe(true);
  });
});

describe("buildUserCapabilities", () => {
  it("combines skills and certs into one capability set", () => {
    const caps = buildUserCapabilities(
      ["Kubernetes", "Terraform"],
      ["AWS Solutions Architect Associate"],
    );
    expect(caps.has("kubernetes")).toBe(true);
    expect(caps.has("terraform")).toBe(true);
    expect(caps.has("aws")).toBe(true);
  });
});
