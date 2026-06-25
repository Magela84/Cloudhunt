"use server";

import { revalidatePath } from "next/cache";
import type { ReviewStatus, Outcome } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type QueueResult = { ok: true; id: string } | { error: string };
export type SimpleResult = { ok: true } | { error: string };

/** Add a job to the review queue (idempotent per user+job). */
export async function addToQueue(
  jobId: string,
  tailoredResumeId?: string,
): Promise<QueueResult> {
  const user = await requireUser();
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return { error: "Job not found." };

  // Verify the tailored resume belongs to the user, if provided.
  let resumeId: string | undefined;
  if (tailoredResumeId) {
    const r = await prisma.resume.findFirst({
      where: { id: tailoredResumeId, userId: user.id },
      select: { id: true },
    });
    resumeId = r?.id;
  }

  const item = await prisma.reviewItem.upsert({
    where: { userId_jobId: { userId: user.id, jobId } },
    create: {
      userId: user.id,
      jobId,
      status: "QUEUED",
      tailoredResumeId: resumeId ?? null,
    },
    update: resumeId ? { tailoredResumeId: resumeId } : {},
  });

  revalidatePath("/queue");
  revalidatePath("/dashboard");
  return { ok: true, id: item.id };
}

async function ownItem(userId: string, id: string) {
  return prisma.reviewItem.findFirst({ where: { id, userId } });
}

export async function updateReviewStatus(
  id: string,
  status: ReviewStatus,
): Promise<SimpleResult> {
  const user = await requireUser();
  const existing = await ownItem(user.id, id);
  if (!existing) return { error: "Item not found." };

  await prisma.reviewItem.update({
    where: { id },
    data: {
      status,
      // Stamp the submission time the first time it's marked submitted.
      submittedAt:
        status === "SUBMITTED" && !existing.submittedAt
          ? new Date()
          : existing.submittedAt,
    },
  });
  revalidatePath("/queue");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateOutcome(
  id: string,
  outcome: Outcome,
): Promise<SimpleResult> {
  const user = await requireUser();
  if (!(await ownItem(user.id, id))) return { error: "Item not found." };
  await prisma.reviewItem.update({ where: { id }, data: { outcome } });
  revalidatePath("/queue");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateNotes(
  id: string,
  notes: string,
): Promise<SimpleResult> {
  const user = await requireUser();
  if (!(await ownItem(user.id, id))) return { error: "Item not found." };
  await prisma.reviewItem.update({
    where: { id },
    data: { notes: notes.slice(0, 4000) },
  });
  revalidatePath("/queue");
  return { ok: true };
}

export async function removeFromQueue(id: string): Promise<SimpleResult> {
  const user = await requireUser();
  if (!(await ownItem(user.id, id))) return { error: "Item not found." };
  await prisma.reviewItem.delete({ where: { id } });
  revalidatePath("/queue");
  revalidatePath("/dashboard");
  return { ok: true };
}
