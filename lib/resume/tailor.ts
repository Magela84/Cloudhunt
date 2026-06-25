import "server-only";
import { complete, completeJson } from "@/lib/anthropic";
import type { ResumeSections } from "@/lib/validations";

export interface TailoredExperience {
  bullets: string[];
}

export interface TailorResult {
  summary: string;
  experience: TailoredExperience[];
  /** Skills/requirements the role wants that the resume does NOT support. */
  gaps: string[];
}

const GUARDRAIL = `You tailor a candidate's REAL resume to a specific job. This is the inviolable rule:

NEVER invent, add, or imply jobs, employers, titles, dates, degrees, certifications, tools, or skills the candidate does not already have in their resume. You may ONLY:
- rephrase and tighten existing content,
- re-order or emphasize what's most relevant to this job,
- quantify an achievement ONLY if a number is already present or clearly implied — never fabricate metrics,
- mirror the job's terminology for things the candidate genuinely already did.

If the job requires something the candidate lacks, DO NOT add it to the resume. Instead list it under "gaps". Do not keyword-stuff. Keep every bullet truthful and verifiable in an interview. Return ONLY valid JSON.`;

/**
 * Produce a job-tailored rewrite of the candidate's real resume content.
 * Returns reworded summary + per-role bullets (same order/count as input) and a
 * list of genuine gaps. Skills/education/certs are intentionally left untouched.
 */
export async function tailorForJob(
  sections: ResumeSections,
  job: { title: string; company: string; description: string },
  missingKeywords: string[],
): Promise<TailorResult> {
  const input = {
    summary: sections.summary,
    experience: sections.experience.map((e) => ({
      title: e.title,
      company: e.company,
      bullets: e.bullets,
    })),
    skills: sections.skills,
    certifications: sections.certifications,
  };

  const prompt = `Tailor this candidate's resume to the job below.

RETURN THIS EXACT JSON SHAPE:
{
  "summary": "rewritten professional summary, 2-4 sentences, targeting this role using only real info",
  "experience": [ { "bullets": ["reworded bullet", "..."] } ],  // SAME number of roles and SAME order as input; keep each role's bullet count roughly the same
  "gaps": ["skill or requirement the job wants that the resume does NOT support"]
}

JOB:
Title: ${job.title}
Company: ${job.company}
Description:
"""
${job.description.slice(0, 8000)}
"""

KEYWORDS THE JOB EMPHASIZES THAT MAY BE MISSING FROM THE RESUME: ${missingKeywords.join(", ") || "(none detected)"}
(Only use a missing keyword if the candidate's existing content already demonstrates it; otherwise put it in "gaps".)

CANDIDATE RESUME (real content — do not add to it):
${JSON.stringify(input, null, 2)}

Return only the JSON.`;

  const result = await completeJson<TailorResult>(prompt, {
    system: GUARDRAIL,
    maxTokens: 4096,
  });

  // Normalize shape defensively.
  return {
    summary: typeof result.summary === "string" ? result.summary : sections.summary,
    experience: Array.isArray(result.experience)
      ? result.experience.map((e) => ({
          bullets: Array.isArray(e?.bullets) ? e.bullets.filter((b) => typeof b === "string") : [],
        }))
      : sections.experience.map((e) => ({ bullets: e.bullets })),
    gaps: Array.isArray(result.gaps) ? result.gaps.filter((g) => typeof g === "string") : [],
  };
}

/** Generate a concise, truthful cover letter for the job from real resume content. */
export async function generateCoverLetter(
  sections: ResumeSections,
  job: { title: string; company: string; description: string },
  candidateName: string | null,
): Promise<string> {
  const prompt = `Write a concise, professional cover letter (3 short paragraphs, ~180-250 words) for this candidate applying to the role.

RULES:
- Use ONLY real experience and skills from the resume below. Never invent anything.
- Reference 1-2 concrete, relevant accomplishments the candidate actually has.
- Open by naming the role and a genuine reason for interest; close with a brief, confident call to action.
- Professional, specific, no clichés or filler. No placeholders like [Company] — use the real names.
- Do not claim skills the candidate lacks.

CANDIDATE NAME: ${candidateName || "the candidate"}
ROLE: ${job.title} at ${job.company}
JOB DESCRIPTION:
"""
${job.description.slice(0, 6000)}
"""
RESUME:
${JSON.stringify(
  {
    summary: sections.summary,
    experience: sections.experience,
    skills: sections.skills,
    certifications: sections.certifications,
  },
  null,
  2,
)}

Return only the cover letter text (no preamble, no markdown).`;

  return complete(prompt, { maxTokens: 1024 });
}
