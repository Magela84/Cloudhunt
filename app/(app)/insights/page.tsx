import { TrendingUp, Lightbulb, Target } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getSkillGapRoi, getOutcomeInsights } from "@/lib/insights-run";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function k(n: number | null): string {
  if (n == null) return "—";
  return `$${Math.round(n / 1000)}k`;
}

export default async function InsightsPage() {
  const user = await requireUser();
  const [roi, insights] = await Promise.all([
    getSkillGapRoi(user),
    getOutcomeInsights(user),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
        <p className="text-muted-foreground">
          Where to invest next, and what&apos;s actually getting you responses.
        </p>
      </div>

      {/* 7a — Skill-gap ROI */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" /> Highest-ROI skills to add
          </CardTitle>
          <CardDescription>
            Based on the roles currently in your feed that you don&apos;t yet
            clear, ranked by how many they&apos;d unlock.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {roi.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No clear skill gaps yet — refresh your feed to pull more roles, or
              you already qualify for most of what&apos;s there. 🎉
            </p>
          ) : (
            roi.map((item) => (
              <div
                key={item.capability}
                className="flex items-start justify-between gap-4 rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">
                    {item.suggestedCredential
                      ? item.suggestedCredential
                      : `Learn ${item.label}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Unlocks <strong>{item.jobsUnlocked}</strong> more role
                    {item.jobsUnlocked === 1 ? "" : "s"} in your feed
                    {item.medianSalaryUnlocked != null && (
                      <>
                        {" "}
                        · median pay {k(item.medianSalaryUnlocked)}
                      </>
                    )}
                    .
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  +{item.jobsUnlocked}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 7c — What's working for you */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-primary" /> What&apos;s working for you
          </CardTitle>
          <CardDescription>
            Learned from your own submissions and outcomes. Future feed ranking
            leans toward what&apos;s getting responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!insights.hasEnoughData ? (
            <p className="text-sm text-muted-foreground">
              Not enough data yet. Submit a few applications and log their
              outcomes in the queue, and patterns will show up here (need at
              least 3 submissions — you have {insights.totalSubmitted}).
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 text-sm">
                <Stat label="Submitted" value={String(insights.totalSubmitted)} />
                <Stat label="Responses" value={String(insights.totalResponses)} />
                <Stat
                  label="Overall response rate"
                  value={`${Math.round(insights.overallRate * 100)}%`}
                />
              </div>
              <div className="space-y-2">
                {insights.rows.map((r) => (
                  <div key={r.key} className="flex items-center gap-3">
                    <span className="w-44 shrink-0 text-sm">{r.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.round(r.rate * 100)}%` }}
                      />
                    </div>
                    <span className="w-28 shrink-0 text-right text-xs text-muted-foreground">
                      {Math.round(r.rate * 100)}% ({r.responses}/{r.submitted})
                    </span>
                  </div>
                ))}
              </div>
              {insights.favored.providers.length > 0 && (
                <p className="flex items-center gap-1.5 pt-1 text-sm text-muted-foreground">
                  <Target className="h-4 w-4 text-success" />
                  Your strongest signal so far:{" "}
                  {insights.favored.providers.join(", ")}
                  {insights.favored.remote ? " · remote" : ""} roles.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border px-4 py-2">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
