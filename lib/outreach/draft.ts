import "server-only";
import type { User } from "@prisma/client";
import { complete } from "@/lib/anthropic";

const SYSTEM = `You write short, professional outreach notes a job seeker sends THEMSELVES to a recruiter or hiring manager. Rules:
- Keep it 110-160 words, warm but professional, specific to the role.
- Reference one or two genuine, relevant strengths from the candidate's profile. Never invent experience, titles, or skills.
- No flattery clichés, no desperation, no spam. One clear, low-pressure ask (a brief chat or consideration).
- The candidate will review and send it themselves from their own email/LinkedIn. Do not include a subject line unless asked. End with the candidate's name.
Return only the message text.`;

/** Draft a follow-up message for a job, optionally addressed to a named contact. */
export async function generateOutreachDraft(
  job: { title: string; company: string },
  user: User,
  contactName: string | null,
): Promise<string> {
  const greeting = contactName ? `addressed to ${contactName}` : "with a neutral greeting (e.g. 'Hello,')";
  const prompt = `Write a short outreach note ${greeting} about this role.

ROLE: ${job.title} at ${job.company}

CANDIDATE PROFILE (use only what's here):
- Name: ${user.fullName || "(no name set)"}
- Target roles: ${user.targetTitles.join(", ") || "Cloud Engineer"}
- Years of experience: ${user.yearsExperience ?? "(unspecified)"}
- Key skills: ${user.cloudSkills.slice(0, 10).join(", ") || "(none listed)"}
- Certifications: ${user.certifications.join(", ") || "(none)"}

Return only the message text.`;

  return complete(prompt, { system: SYSTEM, maxTokens: 600 });
}
