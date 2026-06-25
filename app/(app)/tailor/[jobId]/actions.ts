"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAnthropicConfigured } from "@/lib/env";
import { resumeSectionsSchema, type ResumeSections } from "@/lib/validations";
import { computeAtsMatch } from "@/lib/scoring/ats";
import { tailorForJob, generateCoverLetter, type TailorResult } from "@/lib/resume/tailor";
import { sectionsToText } from "@/lib/resume/sections-text";

async function loadBaseResume(userId: string) {
  return (
    (await prisma.resume.findFirst({
      where: { userId, isBase: true },
      orderBy: { updatedAt: "desc" },
    })) ??
    (await prisma.resume.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }))
  );
}

export type TailorActionResult =
  | { error: string }
  | { ok: true; tailor: TailorResult };

export async function runTailor(jobId: string): Promise<TailorActionResult> {
  if (!isAnthropicConfigured())
    return { error: "Add your ANTHROPIC_API_KEY to enable AI tailoring." };

  const user = await requireUser();
  const [job, resume] = await Promise.all([
    prisma.job.findUnique({ where: { id: jobId } }),
    loadBaseResume(user.id),
  ]);
  if (!job) return { error: "Job not found." };
  if (!resume) return { error: "Upload a resume first." };

  const sections = resumeSectionsSchema.parse(resume.sections ?? {});
  const ats = computeAtsMatch(resume.rawText, job.title, job.description);

  try {
    const tailor = await tailorForJob(
      sections,
      { title: job.title, company: job.company, description: job.description },
      ats.missing,
    );
    return { ok: true, tailor };
  } catch (e) {
    return { error: `Tailoring failed: ${(e as Error).message}` };
  }
}

export type CoverLetterResult =
  | { error: string }
  | { ok: true; letter: string };

export async function runCoverLetter(jobId: string): Promise<CoverLetterResult> {
  if (!isAnthropicConfigured())
    return { error: "Add your ANTHROPIC_API_KEY to enable cover letters." };

  const user = await requireUser();
  const [job, resume] = await Promise.all([
    prisma.job.findUnique({ where: { id: jobId } }),
    loadBaseResume(user.id),
  ]);
  if (!job) return { error: "Job not found." };
  if (!resume) return { error: "Upload a resume first." };

  const sections = resumeSectionsSchema.parse(resume.sections ?? {});
  try {
    const letter = await generateCoverLetter(
      sections,
      { title: job.title, company: job.company, description: job.description },
      user.fullName,
    );
    return { ok: true, letter };
  } catch (e) {
    return { error: `Cover letter failed: ${(e as Error).message}` };
  }
}

export type SaveTailoredResult = { error: string } | { ok: true; id: string };

export async function saveTailoredResume(
  jobId: string,
  label: string,
  sections: ResumeSections,
): Promise<SaveTailoredResult> {
  const user = await requireUser();
  const parsed = resumeSectionsSchema.safeParse(sections);
  if (!parsed.success) return { error: "Tailored sections are malformed." };

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return { error: "Job not found." };

  const created = await prisma.resume.create({
    data: {
      userId: user.id,
      label: label.trim() || `Tailored — ${job.company}`,
      rawText: sectionsToText(parsed.data),
      sections: parsed.data,
      isBase: false,
      tailoredForJobId: jobId,
    },
  });

  // Persist the ATS match for this tailored resume so the queue can show it.
  const ats = computeAtsMatch(created.rawText, job.title, job.description);
  await prisma.jobScore.upsert({
    where: { userId_jobId: { userId: user.id, jobId } },
    create: {
      userId: user.id,
      jobId,
      atsScore: ats.score,
      matchedKeywords: ats.matched,
      missingKeywords: ats.missing,
    },
    update: {
      atsScore: ats.score,
      matchedKeywords: ats.matched,
      missingKeywords: ats.missing,
    },
  });

  revalidatePath("/resume");
  return { ok: true, id: created.id };
}
