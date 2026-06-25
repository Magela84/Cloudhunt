import "server-only";
import { completeJson } from "@/lib/anthropic";
import { isAnthropicConfigured } from "@/lib/env";
import { resumeSectionsSchema, type ResumeSections } from "@/lib/validations";
import { EMPTY_SECTIONS } from "@/lib/resume/extract-shared";

export { EMPTY_SECTIONS };

const SYSTEM = `You are a precise resume parser. You convert raw resume text into structured JSON.
CRITICAL RULES:
- Only extract information that is actually present in the text. Never invent, infer, or embellish titles, dates, employers, skills, or certifications.
- Preserve the candidate's real wording for experience bullets; do not rewrite or quantify here.
- If a field is absent, return an empty string or empty array — do not guess.
- Return ONLY valid JSON, no prose, no markdown fences.`;

function buildPrompt(rawText: string): string {
  return `Parse the following resume text into this exact JSON shape:

{
  "summary": "professional summary / objective if present, else empty string",
  "experience": [
    {
      "title": "job title",
      "company": "employer",
      "location": "location if present else empty",
      "startDate": "as written, e.g. 'Jan 2021'",
      "endDate": "as written, e.g. 'Present'",
      "bullets": ["each responsibility/achievement bullet as written"]
    }
  ],
  "skills": ["individual skills as listed"],
  "education": [
    { "degree": "degree", "school": "institution", "year": "as written" }
  ],
  "certifications": ["each certification as written"]
}

RESUME TEXT:
"""
${rawText.slice(0, 24000)}
"""

Return only the JSON.`;
}

export interface ExtractResult {
  sections: ResumeSections;
  aiUsed: boolean;
}

/**
 * Extract structured sections from raw resume text using the LLM. Falls back to
 * empty sections (for manual entry) when Anthropic isn't configured or parsing
 * fails — the raw text is always preserved by the caller.
 */
export async function extractSections(rawText: string): Promise<ExtractResult> {
  if (!isAnthropicConfigured() || rawText.trim().length === 0) {
    return { sections: { ...EMPTY_SECTIONS }, aiUsed: false };
  }
  try {
    const raw = await completeJson<unknown>(buildPrompt(rawText), {
      system: SYSTEM,
      maxTokens: 8192,
    });
    // Coerce/validate; resumeSectionsSchema fills defaults for missing fields.
    const sections = resumeSectionsSchema.parse(raw);
    return { sections, aiUsed: true };
  } catch {
    return { sections: { ...EMPTY_SECTIONS }, aiUsed: false };
  }
}
