"use client";

import * as React from "react";
import Link from "next/link";
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  EyeOff,
  FileText,
  ListPlus,
  Check,
  Loader2,
  MapPin,
  Users,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import type { FeedJob } from "@/lib/jobs/feed";
import { addToQueue } from "@/app/(app)/queue/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LegitBadge } from "@/components/feed/legit-badge";
import { FitBadge } from "@/components/feed/fit-badge";

function salaryText(j: FeedJob): string | null {
  if (j.salaryMin == null && j.salaryMax == null) return null;
  const cur = j.salaryCurrency === "USD" ? "$" : "";
  const fmt = (n: number) => `${cur}${Math.round(n / 1000)}k`;
  if (j.salaryMin != null && j.salaryMax != null)
    return `${fmt(j.salaryMin)}–${fmt(j.salaryMax)}`;
  return fmt((j.salaryMin ?? j.salaryMax)!);
}

function ageText(iso: string | null): string | null {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} mo ago`;
}

export function JobCard({
  job,
  onHide,
}: {
  job: FeedJob;
  onHide: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [queued, setQueued] = React.useState(false);
  const [queuing, startQueue] = React.useTransition();
  const salary = salaryText(job);
  const age = ageText(job.postedAt);

  const onQueue = () =>
    startQueue(async () => {
      const res = await addToQueue(job.id);
      if (!("error" in res)) setQueued(true);
    });

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <a
              href={job.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline"
            >
              {job.title}
            </a>
            <p className="text-sm text-muted-foreground">
              {job.company}
              {job.location ? (
                <>
                  {" · "}
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" />
                    {job.location}
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <FitBadge score={job.fitScore} bucket={job.fitBucket} />
            <LegitBadge score={job.legitScore} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {job.remote && <Badge variant="secondary">Remote</Badge>}
          {job.providers.map((p) => (
            <Badge key={p} variant="outline">
              {p}
            </Badge>
          ))}
          {job.seniority !== "unknown" && (
            <Badge variant="outline" className="capitalize">
              {job.seniority}
            </Badge>
          )}
          {salary && <Badge variant="outline">{salary}</Badge>}
          {job.requiresCert && <Badge variant="outline">Cert required</Badge>}
          <span className="ml-auto text-muted-foreground">
            {job.source}
            {age ? ` · ${age}` : ""}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen((o) => !o)}
            className="px-2"
          >
            {open ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Why these scores
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <Button asChild variant="outline" size="sm">
              <a href={job.applyUrl ?? job.sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" /> Open
              </a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/tailor/${job.id}`}>
                <FileText className="h-4 w-4" /> Tailor
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/contacts/${job.id}`}>
                <Users className="h-4 w-4" /> Contacts
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onQueue}
              disabled={queuing || queued}
              title="Add to review queue"
            >
              {queuing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : queued ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <ListPlus className="h-4 w-4" />
              )}
              {queued ? "Queued" : "Queue"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onHide(job.id)}
              aria-label="Hide"
              title="Hide from this view"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {open && (
          <div className="space-y-4 rounded-md border bg-muted/30 p-3 text-sm">
            {job.fitScore != null && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Fit — {job.fitSummary}
                </p>
                {(job.matchedSkills.length > 0 || job.missingSkills.length > 0) && (
                  <div className="flex flex-wrap gap-1">
                    {job.matchedSkills.map((s) => (
                      <Badge key={`m-${s}`} variant="success" className="text-[11px]">
                        ✓ {s}
                      </Badge>
                    ))}
                    {job.missingSkills.map((s) => (
                      <Badge key={`x-${s}`} variant="outline" className="text-[11px]">
                        gap: {s}
                      </Badge>
                    ))}
                  </div>
                )}
                <ul className="space-y-1">
                  {job.fitSignals.map((s, i) => (
                    <SignalRow
                      key={`f-${i}`}
                      label={s.label}
                      impact={s.impact}
                      detail={s.detail}
                    />
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Legit (estimate) — {job.legitSummary}
              </p>
              <ul className="space-y-1">
                {job.legitSignals.map((s, i) => (
                  <SignalRow
                    key={`l-${i}`}
                    label={s.label}
                    impact={s.impact}
                    detail={s.detail}
                  />
                ))}
              </ul>
            </div>

            <p className="pt-1 text-xs text-muted-foreground">
              Both scores are estimates — Legit from public signals, Fit vs your
              profile. Not a verification or a guarantee. Always vet the employer
              yourself.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SignalRow({
  label,
  impact,
  detail,
}: {
  label: string;
  impact: number;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-2">
      {impact > 0 ? (
        <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
      ) : impact < 0 ? (
        <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
      ) : (
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
      )}
      <span>
        <span className="font-medium">{label}</span>{" "}
        <span className="text-muted-foreground">
          {impact !== 0 ? `(${impact > 0 ? "+" : ""}${impact}) ` : ""}— {detail}
        </span>
      </span>
    </li>
  );
}
