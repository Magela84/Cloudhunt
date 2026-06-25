import { describe, it, expect } from "vitest";
import { computeResumeHealth } from "@/lib/scoring/resume-health";
import type { ResumeSections } from "@/lib/validations";

const strongResume: ResumeSections = {
  summary:
    "Cloud engineer with 5 years building reliable AWS infrastructure and CI/CD pipelines.",
  experience: [
    {
      title: "Cloud Engineer",
      company: "Acme",
      location: "Remote",
      startDate: "2021",
      endDate: "Present",
      bullets: [
        "Built Terraform modules that reduced provisioning time by 60%.",
        "Automated CI/CD with GitHub Actions across 12 services.",
        "Migrated 30 workloads to EKS, cutting costs by $40k/year.",
      ],
    },
  ],
  skills: ["AWS", "Terraform", "Kubernetes", "CI/CD", "Docker", "Python", "Linux", "Prometheus"],
  education: [{ degree: "BS Computer Science", school: "State U", year: "2018" }],
  certifications: ["AWS Solutions Architect Associate"],
};

const strongRaw = (strongResume.summary + " " + strongResume.experience[0].bullets.join(" ")).repeat(6);

const weakResume: ResumeSections = {
  summary: "",
  experience: [],
  skills: ["AWS"],
  education: [],
  certifications: [],
};

describe("computeResumeHealth", () => {
  it("scores a strong, quantified, cloud-focused resume highly", () => {
    const r = computeResumeHealth(strongResume, strongRaw);
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("scores a sparse resume low and suggests fixes", () => {
    const r = computeResumeHealth(weakResume, "AWS engineer");
    expect(r.score).toBeLessThan(50);
    expect(r.suggestions.join(" ")).toMatch(/summary/i);
  });

  it("returns explainable signals", () => {
    const r = computeResumeHealth(strongResume, strongRaw);
    expect(r.signals.some((s) => s.key === "completeness")).toBe(true);
    expect(r.signals.some((s) => s.key === "impact")).toBe(true);
  });
});
