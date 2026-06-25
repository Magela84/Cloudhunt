import "server-only";
import { completeJson } from "@/lib/anthropic";

export interface InterviewQuestion {
  question: string;
  whatTheyreLookingFor: string;
}
export interface InterviewPrep {
  questions: InterviewQuestion[];
  concepts: string[];
  plan: string[];
}

const PREP_SYSTEM = `You are a senior cloud/DevOps hiring manager preparing a candidate for a specific interview. Produce a realistic, role-specific study pack grounded in the job description — system design, IaC/Terraform scenarios, troubleshooting, and the specific cloud services the role emphasizes. Be concrete and practical, not generic. Return ONLY valid JSON.`;

export async function generateInterviewPrep(
  job: { title: string; company: string; description: string },
  gaps: string[],
): Promise<InterviewPrep> {
  const prompt = `Create an interview study pack for this role.

RETURN THIS JSON:
{
  "questions": [ { "question": "likely interview question", "whatTheyreLookingFor": "what a strong answer covers" } ],  // 6-9 questions, mostly technical, derived from the JD
  "concepts": ["concept to review", "..."],   // 6-10 focused topics
  "plan": ["prioritized study step", "..."]    // 4-6 steps, putting the candidate's gaps first
}

ROLE: ${job.title} at ${job.company}
JOB DESCRIPTION:
"""
${job.description.slice(0, 8000)}
"""
CANDIDATE'S LIKELY GAPS (prioritize these in the plan): ${gaps.join(", ") || "(none detected)"}

Return only the JSON.`;

  const r = await completeJson<InterviewPrep>(prompt, {
    system: PREP_SYSTEM,
    maxTokens: 4096,
  });
  return {
    questions: Array.isArray(r.questions) ? r.questions.slice(0, 12) : [],
    concepts: Array.isArray(r.concepts) ? r.concepts : [],
    plan: Array.isArray(r.plan) ? r.plan : [],
  };
}

export interface MockFeedback {
  rating: number; // 1–5
  overall: string;
  strengths: string[];
  improvements: string[];
}

const MOCK_SYSTEM = `You are a fair, experienced technical interviewer giving structured feedback on a candidate's spoken answer. Be honest and specific, encouraging but not inflated. Return ONLY valid JSON.`;

export async function evaluateMockAnswer(
  job: { title: string },
  question: string,
  answer: string,
): Promise<MockFeedback> {
  const prompt = `Evaluate this interview answer for a ${job.title} role.

QUESTION: ${question}
CANDIDATE'S ANSWER:
"""
${answer.slice(0, 4000)}
"""

RETURN THIS JSON:
{
  "rating": 1-5 integer,
  "overall": "1-2 sentence assessment",
  "strengths": ["what was good"],
  "improvements": ["specific, actionable suggestion"]
}

Return only the JSON.`;

  const r = await completeJson<MockFeedback>(prompt, {
    system: MOCK_SYSTEM,
    maxTokens: 1024,
  });
  return {
    rating: Math.max(1, Math.min(5, Math.round(Number(r.rating) || 0))),
    overall: typeof r.overall === "string" ? r.overall : "",
    strengths: Array.isArray(r.strengths) ? r.strengths : [],
    improvements: Array.isArray(r.improvements) ? r.improvements : [],
  };
}
