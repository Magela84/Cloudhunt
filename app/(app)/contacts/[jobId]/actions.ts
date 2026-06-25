"use server";

import { revalidatePath } from "next/cache";
import type { OutreachStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAnthropicConfigured } from "@/lib/env";
import { generateOutreachDraft } from "@/lib/outreach/draft";

export type ContactResult = { ok: true } | { error: string };
export type DraftResult = { ok: true; draft: string } | { error: string };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function revalidate(jobId: string) {
  revalidatePath(`/contacts/${jobId}`);
}

/** Add a contact the USER sourced themselves (e.g. from the careers page). */
export async function addManualContact(
  jobId: string,
  name: string,
  email: string,
): Promise<ContactResult> {
  const user = await requireUser();
  const cleanEmail = email.trim().toLowerCase();
  if (!EMAIL_RE.test(cleanEmail)) return { error: "Enter a valid email address." };

  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true } });
  if (!job) return { error: "Job not found." };

  await prisma.contact.upsert({
    where: { userId_jobId_email: { userId: user.id, jobId, email: cleanEmail } },
    create: {
      userId: user.id,
      jobId,
      email: cleanEmail,
      name: name.trim() || null,
      source: "manual",
      provenance: "added by you",
    },
    update: { name: name.trim() || null },
  });
  revalidate(jobId);
  return { ok: true };
}

async function ownContact(userId: string, contactId: string) {
  return prisma.contact.findFirst({
    where: { id: contactId, userId },
    include: { job: true, outreach: true },
  });
}

export async function generateDraft(contactId: string): Promise<DraftResult> {
  if (!isAnthropicConfigured())
    return { error: "Add your ANTHROPIC_API_KEY to draft outreach." };
  const user = await requireUser();
  const contact = await ownContact(user.id, contactId);
  if (!contact) return { error: "Contact not found." };

  try {
    const draft = await generateOutreachDraft(
      { title: contact.job.title, company: contact.job.company },
      user,
      contact.name,
    );
    await prisma.outreach.upsert({
      where: { contactId },
      create: { userId: user.id, contactId, draft, status: "DRAFTED" },
      update: { draft }, // keep existing status (don't reset SENT/REPLIED)
    });
    revalidate(contact.jobId);
    return { ok: true, draft };
  } catch (e) {
    return { error: `Draft failed: ${(e as Error).message}` };
  }
}

export async function saveOutreachDraft(
  contactId: string,
  draft: string,
): Promise<ContactResult> {
  const user = await requireUser();
  const contact = await ownContact(user.id, contactId);
  if (!contact) return { error: "Contact not found." };
  await prisma.outreach.upsert({
    where: { contactId },
    create: { userId: user.id, contactId, draft, status: "DRAFTED" },
    update: { draft },
  });
  revalidate(contact.jobId);
  return { ok: true };
}

export async function updateOutreachStatus(
  contactId: string,
  status: OutreachStatus,
): Promise<ContactResult> {
  const user = await requireUser();
  const contact = await ownContact(user.id, contactId);
  if (!contact) return { error: "Contact not found." };
  await prisma.outreach.upsert({
    where: { contactId },
    create: {
      userId: user.id,
      contactId,
      status,
      sentAt: status === "SENT" ? new Date() : null,
    },
    update: {
      status,
      sentAt:
        status === "SENT" && !contact.outreach?.sentAt
          ? new Date()
          : contact.outreach?.sentAt,
    },
  });
  revalidate(contact.jobId);
  return { ok: true };
}

export async function deleteContact(contactId: string): Promise<ContactResult> {
  const user = await requireUser();
  const contact = await ownContact(user.id, contactId);
  if (!contact) return { error: "Contact not found." };
  await prisma.contact.delete({ where: { id: contactId } });
  revalidate(contact.jobId);
  return { ok: true };
}
