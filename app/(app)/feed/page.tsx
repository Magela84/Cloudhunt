import { Info } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getFeed, type FeedFilters } from "@/lib/jobs/feed";
import { getOutcomeInsights } from "@/lib/insights-run";
import { configuredSources } from "@/lib/jobs/sources";
import { isAdzunaConfigured } from "@/lib/env";
import type { CloudProvider, Seniority } from "@/lib/jobs/classify";
import type { FitBucket } from "@/lib/scoring/fit";
import { FeedView } from "@/components/feed/feed-view";

function parseFilters(
  sp: Record<string, string | string[] | undefined>,
): FeedFilters {
  const s = (k: string) => {
    const v = sp[k];
    return typeof v === "string" && v.length ? v : undefined;
  };
  const n = (k: string) => {
    const v = s(k);
    const num = v ? Number(v) : NaN;
    return Number.isFinite(num) ? num : undefined;
  };
  return {
    provider: s("provider") as CloudProvider | undefined,
    seniority: s("seniority") as Seniority | undefined,
    remote: s("remote") === "1" ? true : undefined,
    salaryFloor: n("salaryFloor"),
    include: s("include"),
    exclude: s("exclude"),
    legitMin: n("legitMin"),
    bucket: s("bucket") as FitBucket | undefined,
    minFit: n("minFit"),
  };
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await requireUser();
  const filters = parseFilters(searchParams);
  const hasExplicitFilters = Object.values(filters).some((v) => v !== undefined);

  // Default view: strong matches only (Fit >= adjustable threshold), unless the
  // user opts into "show all" or sets an explicit fit filter.
  const showAll = searchParams.all === "1";
  if (!showAll && filters.minFit == null && !filters.bucket) {
    filters.minFit = user.fitThreshold;
  }

  // Phase 7c — bias ranking toward what's worked for this user.
  const insights = await getOutcomeInsights(user);
  const { jobs, total } = await getFeed(user.id, filters, insights.favored);
  const sources = configuredSources();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Job feed</h1>
        <p className="text-muted-foreground">
          Aggregated from legitimate sources, scored for trust (Legit) and how
          well each role matches you (Fit). Strong matches are shown by default.
        </p>
      </div>

      <div className="flex gap-2 rounded-md border bg-muted/30 p-3 text-xs">
        <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-muted-foreground">
          Sources active: {sources.map((s) => s.label).join(", ") || "none"}.
          {!isAdzunaConfigured() && " Add Adzuna keys for salary-rich listings."}{" "}
          Legit &amp; Fit are <strong>estimates</strong> — not verifications or
          guarantees. Always vet employers yourself before applying.
        </span>
      </div>

      <FeedView
        jobs={jobs}
        total={total}
        filtered={hasExplicitFilters}
        showAll={showAll}
        fitThreshold={user.fitThreshold}
      />
    </div>
  );
}
