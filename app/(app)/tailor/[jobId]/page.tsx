import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileWarning } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAnthropicConfigured } from "@/lib/env";
import { resumeSectionsSchema } from "@/lib/validations";
import { computeAtsMatch } from "@/lib/scoring/ats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TailorClient } from "@/components/tailor/tailor-client";

export const dynamic = "force-dynamic";

export default async function TailorPage({
  params,
}: {
  params: { jobId: string };
}) {
  const user = await requireUser();

  const job = await prisma.job.findUnique({ where: { id: params.jobId } });
  if (!job) notFound();

  const resume =
    (await prisma.resume.findFirst({
      where: { userId: user.id, isBase: true },
      orderBy: { updatedAt: "desc" },
    })) ??
    (await prisma.resume.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/feed">
            <ArrowLeft className="h-4 w-4" /> Back to feed
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Tailor for this role</h1>
        <p className="text-muted-foreground">
          {job.title} · {job.company}
          {job.location ? ` · ${job.location}` : ""}
        </p>
      </div>

      {!resume ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileWarning className="h-4 w-4 text-warning" /> No resume yet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>You need a resume on file before tailoring. Upload one first.</p>
            <Button asChild size="sm">
              <Link href="/resume">Go to Resumes</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <TailorClient
          jobId={job.id}
          jobTitle={job.title}
          company={job.company}
          applyUrl={job.applyUrl ?? job.sourceUrl}
          baseSections={resumeSectionsSchema.parse(resume.sections ?? {})}
          ats={computeAtsMatch(resume.rawText, job.title, job.description)}
          aiEnabled={isAnthropicConfigured()}
        />
      )}
    </div>
  );
}
