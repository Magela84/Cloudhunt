import Link from "next/link";
import { FileText, Target, Award, MapPin, ArrowRight, ListChecks } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getQueue } from "@/lib/queue";
import { REMOTE_PREFERENCES } from "@/lib/cloud/taxonomy";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const user = await requireUser();
  const resumeCount = await prisma.resume.count({ where: { userId: user.id } });
  const hasBase = await prisma.resume.count({
    where: { userId: user.id, isBase: true },
  });

  const { stats } = await getQueue(user.id);
  const pipeline = [
    { name: "Queued", value: stats.byStatus.QUEUED, color: "#64748b" },
    { name: "Reviewed", value: stats.byStatus.REVIEWED, color: "#3b82f6" },
    { name: "Submitted", value: stats.byStatus.SUBMITTED, color: "#22c55e" },
    { name: "Skipped", value: stats.byStatus.SKIPPED, color: "#cbd5e1" },
  ];

  const remoteLabel =
    REMOTE_PREFERENCES.find((r) => r.value === user.remotePreference)?.label ??
    "No preference";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome{user.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground">
          Your cloud job-hunting cockpit. The job feed and scoring arrive in the
          next phase.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" /> Your profile
            </CardTitle>
            <CardDescription>Drives cloud-aware matching.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Target roles">
              <div className="flex flex-wrap gap-1">
                {user.targetTitles.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>
            </Row>
            <Row label="Experience">
              {user.yearsExperience ?? 0} years
            </Row>
            <Row label="Cloud skills">
              <span className="text-muted-foreground">
                {user.cloudSkills.length} skills
              </span>
            </Row>
            <Row label="Certifications">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Award className="h-3.5 w-3.5" />
                {user.certifications.length}
              </span>
            </Row>
            <Row label="Location">
              <span className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {[user.locationCity, user.locationCountry]
                  .filter(Boolean)
                  .join(", ") || "—"}{" "}
                · {remoteLabel}
              </span>
            </Row>
            <div className="pt-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/settings">Edit profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" /> Resume
            </CardTitle>
            <CardDescription>
              Your source-of-truth resume powers tailoring.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {resumeCount === 0 ? (
              <p className="text-muted-foreground">
                No resume yet. Upload one to unlock tailoring and ATS scoring.
              </p>
            ) : (
              <p className="text-muted-foreground">
                {resumeCount} resume{resumeCount > 1 ? "s" : ""} saved
                {hasBase ? " · base resume set" : " · no base resume yet"}.
              </p>
            )}
            <Button asChild size="sm">
              <Link href="/resume">
                {resumeCount === 0 ? "Upload resume" : "Manage resumes"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4 text-primary" /> Application pipeline
            </CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/queue">Open queue</Link>
            </Button>
          </div>
          <CardDescription>
            {stats.total === 0
              ? "Queue jobs from the feed to start tracking applications here."
              : `${stats.active} in progress · ${stats.submitted} submitted · ${stats.responses} response${stats.responses === 1 ? "" : "s"}` +
                (stats.submitted
                  ? ` · ${Math.round(stats.responseRate * 100)}% response rate`
                  : "")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PipelineChart data={pipeline} />
          {(stats.byOutcome.CALLBACK +
            stats.byOutcome.INTERVIEW +
            stats.byOutcome.OFFER +
            stats.byOutcome.REJECTED >
            0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {stats.byOutcome.CALLBACK > 0 && (
                <Badge variant="secondary">Callbacks: {stats.byOutcome.CALLBACK}</Badge>
              )}
              {stats.byOutcome.INTERVIEW > 0 && (
                <Badge variant="secondary">Interviews: {stats.byOutcome.INTERVIEW}</Badge>
              )}
              {stats.byOutcome.OFFER > 0 && (
                <Badge variant="success">Offers: {stats.byOutcome.OFFER}</Badge>
              )}
              {stats.byOutcome.REJECTED > 0 && (
                <Badge variant="outline">Rejected: {stats.byOutcome.REJECTED}</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}
