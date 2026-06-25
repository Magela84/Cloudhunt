"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { RefreshCw, Loader2, Inbox } from "lucide-react";
import type { FeedJob } from "@/lib/jobs/feed";
import { refreshFeed, type RefreshResult } from "@/app/(app)/feed/actions";
import { FeedFilters } from "@/components/feed/feed-filters";
import { JobCard } from "@/components/feed/job-card";
import { Button } from "@/components/ui/button";

export function FeedView({
  jobs,
  total,
  filtered,
  showAll,
  fitThreshold,
}: {
  jobs: FeedJob[];
  total: number;
  filtered: boolean;
  showAll: boolean;
  fitThreshold: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = React.useTransition();
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const [msg, setMsg] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const visible = jobs.filter((j) => !hidden.has(j.id));

  const toggleAll = (all: boolean) => {
    const next = new URLSearchParams(params.toString());
    if (all) next.set("all", "1");
    else next.delete("all");
    router.push(`${pathname}?${next.toString()}`);
  };

  const onRefresh = () => {
    setMsg(null);
    setError(null);
    startTransition(async () => {
      const res: RefreshResult = await refreshFeed();
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setMsg(
        `Fetched ${res.fetched} listings → ${res.unique} unique, ${res.scored} scored & fit-ranked from ${res.sources.length} source(s).`,
      );
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-md border p-0.5 text-sm">
          <button
            onClick={() => toggleAll(false)}
            className={`rounded px-3 py-1 ${!showAll ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
          >
            Strong matches (Fit ≥ {fitThreshold})
          </button>
          <button
            onClick={() => toggleAll(true)}
            className={`rounded px-3 py-1 ${showAll ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
          >
            Show all
          </button>
        </div>
        <Button onClick={onRefresh} disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh feed
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {total} scored job{total === 1 ? "" : "s"} total ·{" "}
        {visible.length} shown
        {!showAll && " (strong matches)"}
        {filtered ? " · filters applied" : ""}
      </p>

      {msg && <p className="text-sm text-success">{msg}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <FeedFilters />

      {total === 0 ? (
        <EmptyState
          title="No jobs yet"
          body="Click “Refresh feed” to pull listings from your configured sources, then score and fit-rank them against your profile."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title="Nothing matches"
          body={
            showAll
              ? "No jobs match your current filters. Try clearing some."
              : `No roles cleared your Fit threshold (${fitThreshold}). Switch to “Show all”, lower the threshold in Settings, or refresh for more listings.`
          }
        />
      ) : (
        <div className="space-y-3">
          {visible.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onHide={(id) => setHidden((h) => new Set(h).add(id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
      <Inbox className="h-8 w-8 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
