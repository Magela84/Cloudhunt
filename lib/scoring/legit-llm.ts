import "server-only";
import { completeJson } from "@/lib/anthropic";
import { isAnthropicConfigured } from "@/lib/env";

interface TemplateVerdict {
  templateScore: number; // 0..1, higher = more vague/templated
  reason: string;
}

const SYSTEM = `You assess whether a job description reads as a specific, real role or as vague/templated boilerplate (a weak legitimacy signal). You are calibrated and fair: real corporate postings have some boilerplate. Only score high when the posting is genuinely empty of role-specific substance. Return ONLY JSON.`;

/**
 * LLM estimate of how templated/vague a description is, in [0,1]. Returns null
 * when Anthropic isn't configured or the call fails (so scoring still works).
 */
export async function scoreTemplateVagueness(
  title: string,
  description: string,
): Promise<number | null> {
  if (!isAnthropicConfigured() || description.trim().length < 60) return null;
  const prompt = `Rate how vague/templated this posting is from 0.0 (specific, concrete, role-focused) to 1.0 (generic boilerplate with no real substance).

Return JSON: { "templateScore": number, "reason": "short phrase" }

TITLE: ${title}
DESCRIPTION:
"""
${description.slice(0, 6000)}
"""`;
  try {
    const verdict = await completeJson<TemplateVerdict>(prompt, {
      system: SYSTEM,
      maxTokens: 256,
    });
    const s = Number(verdict.templateScore);
    if (Number.isNaN(s)) return null;
    return Math.max(0, Math.min(1, s));
  } catch {
    return null;
  }
}
