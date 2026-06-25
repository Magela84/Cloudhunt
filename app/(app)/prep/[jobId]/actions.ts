"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAnthropicConfigured } from "@/lib/env";
import { extractRequirements } from "@/lib/scoring/requirements";
import { buildUserCapabilities, capabilityLabel } from "@/lib/cloud/skill-map";
import {
  generateInterviewPrep,
  evaluateMockAnswer,
  type InterviewPrep,
  type MockFeedback,
} from "@/lib/interview/prep";

export type PrepResult = { ok: true; prep: InterviewPrep } | { error: string };
export type FeedbackResult =
  | { ok: true; feedback: MockFeedback }
  | { error: string };

export async function runPrep(jobId: string): Promise<PrepResult> {
  if (!isAnthropicConfigured())
    return { error: "Add your ANTHROPIC_API_KEY to generate interview prep." };
  const user = await requireUser();
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return { error: "Job not found." };

  const reqs = extractRequirements(job.title, job.description);
  const userCaps = buildUserCapabilities(user.cloudSkills, user.certifications);
  const gaps = reqs.capabilities
    .filter((c) => !userCaps.has(c))
    .map(capabilityLabel);

  try {
    const prep = await generateInterviewPrep(
      { title: job.title, company: job.company, description: job.description },
      gaps,
    );
    return { ok: true, prep };
  } catch (e) {
    return { error: `Prep failed: ${(e as Error).message}` };
  }
}

export async function runMockFeedback(
  jobId: string,
  question: string,
  answer: string,
): Promise<FeedbackResult> {
  if (!isAnthropicConfigured())
    return { error: "Add your ANTHROPIC_API_KEY to use the mock interview." };
  if (answer.trim().length < 10)
    return { error: "Write a fuller answer to get useful feedback." };

  const user = await requireUser();
  void user;
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return { error: "Job not found." };

  try {
    const feedback = await evaluateMockAnswer({ title: job.title }, question, answer);
    return { ok: true, feedback };
  } catch (e) {
    return { error: `Feedback failed: ${(e as Error).message}` };
  }
}
