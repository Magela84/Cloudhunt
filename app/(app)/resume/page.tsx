import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAnthropicConfigured } from "@/lib/env";
import { resumeSectionsSchema } from "@/lib/validations";
import { computeResumeHealth } from "@/lib/scoring/resume-health";
import { ResumeManager, type ResumeDTO } from "@/components/resume/resume-manager";
import { AlertTriangle } from "lucide-react";

export default async function ResumePage() {
  const user = await requireUser();
  const resumes = await prisma.resume.findMany({
    where: { userId: user.id },
    orderBy: [{ isBase: "desc" }, { updatedAt: "desc" }],
  });

  const dtos: ResumeDTO[] = resumes.map((r) => {
    // sections is JSON; coerce to the typed shape (filling defaults).
    const sections = resumeSectionsSchema.parse(r.sections ?? {});
    const health = computeResumeHealth(sections, r.rawText);
    return {
      id: r.id,
      label: r.label,
      isBase: r.isBase,
      rawText: r.rawText,
      sections,
      updatedAt: r.updatedAt.toISOString(),
      health: { score: health.score, suggestions: health.suggestions.slice(0, 3) },
    };
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resumes</h1>
        <p className="text-muted-foreground">
          Upload your resume — we extract the text and structure it for review.
          Your edits are the source of truth; tailoring never invents content.
        </p>
      </div>

      {!isAnthropicConfigured() && (
        <div className="flex gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <span>
            Anthropic isn&apos;t configured, so uploads won&apos;t auto-extract
            sections. You can still upload and fill sections in manually, or add{" "}
            <code className="font-mono">ANTHROPIC_API_KEY</code> to{" "}
            <code className="font-mono">.env</code>.
          </span>
        </div>
      )}

      <ResumeManager resumes={dtos} />
    </div>
  );
}
