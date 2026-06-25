import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAnthropicConfigured } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { PrepClient } from "@/components/prep/prep-client";

export const dynamic = "force-dynamic";

export default async function PrepPage({
  params,
}: {
  params: { jobId: string };
}) {
  await requireUser();
  const job = await prisma.job.findUnique({ where: { id: params.jobId } });
  if (!job) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/feed">
            <ArrowLeft className="h-4 w-4" /> Back to feed
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Interview prep</h1>
        <p className="text-muted-foreground">
          {job.title} · {job.company}
        </p>
      </div>

      <PrepClient
        jobId={job.id}
        aiEnabled={isAnthropicConfigured()}
      />
    </div>
  );
}
