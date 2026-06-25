import "server-only";
import type { OutreachStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { extractPublishedContacts, careersSearchUrl } from "@/lib/contacts/extract";

export interface OutreachDTO {
  id: string;
  status: OutreachStatus;
  draft: string;
  notes: string;
  sentAt: string | null;
}

export interface ContactDTO {
  id: string;
  name: string | null;
  email: string | null;
  source: string;
  provenance: string;
  outreach: OutreachDTO | null;
}

export interface JobContactsDTO {
  jobId: string;
  jobTitle: string;
  company: string;
  applyUrl: string;
  sourceUrl: string;
  careersUrl: string;
  contacts: ContactDTO[];
}

/**
 * Returns contacts for a job — only those PUBLISHED in the posting (auto), plus
 * any the user added themselves. Never finds contacts any other way.
 */
export async function getJobContacts(
  userId: string,
  jobId: string,
): Promise<JobContactsDTO | null> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return null;

  // Extract published contacts from the posting we already have, and persist
  // them for this user (idempotent on userId+jobId+email).
  const published = extractPublishedContacts(job.description);
  for (const c of published) {
    await prisma.contact.upsert({
      where: { userId_jobId_email: { userId, jobId, email: c.email } },
      create: {
        userId,
        jobId,
        email: c.email,
        name: c.name,
        source: job.source,
        provenance: c.provenance,
      },
      update: {}, // never overwrite — published data is read-only
    });
  }

  const rows = await prisma.contact.findMany({
    where: { userId, jobId },
    include: { outreach: true },
    orderBy: { createdAt: "asc" },
  });

  return {
    jobId: job.id,
    jobTitle: job.title,
    company: job.company,
    applyUrl: job.applyUrl ?? job.sourceUrl,
    sourceUrl: job.sourceUrl,
    careersUrl: careersSearchUrl(job.company),
    contacts: rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      source: r.source,
      provenance: r.provenance,
      outreach: r.outreach
        ? {
            id: r.outreach.id,
            status: r.outreach.status,
            draft: r.outreach.draft ?? "",
            notes: r.outreach.notes ?? "",
            sentAt: r.outreach.sentAt ? r.outreach.sentAt.toISOString() : null,
          }
        : null,
    })),
  };
}
