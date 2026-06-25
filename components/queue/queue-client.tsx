"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ExternalLink,
  FileDown,
  Trash2,
  Inbox,
  MapPin,
  Wand2,
  Users,
  GraduationCap,
} from "lucide-react";
import type { ReviewItemDTO } from "@/lib/queue";
import {
  updateReviewStatus,
  updateOutcome,
  updateNotes,
  removeFromQueue,
} from "@/app/(app)/queue/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = ["QUEUED", "REVIEWED", "SUBMITTED", "SKIPPED"] as const;
const OUTCOME_OPTIONS = [
  "NONE",
  "CALLBACK",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
] as const;

const OUTCOME_LABEL: Record<string, string> = {
  NONE: "No outcome yet",
  CALLBACK: "Callback",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

export function QueueClient({ items }: { items: ReviewItemDTO[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Your queue is empty</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Add strong matches from the feed (the “Queue” button) or after tailoring
          a resume. They&apos;ll show up here to review, submit, and track.
        </p>
        <Button asChild size="sm" className="mt-2">
          <Link href="/feed">Go to feed</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <QueueRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function QueueRow({ item }: { item: ReviewItemDTO }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [notes, setNotes] = React.useState(item.notes);

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{item.jobTitle}</p>
            <p className="text-sm text-muted-foreground">
              {item.company}
              {item.location ? (
                <span className="inline-flex items-center gap-0.5">
                  {" · "}
                  <MapPin className="h-3 w-3" />
                  {item.location}
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {item.fitScore != null && (
              <Badge variant="secondary">Fit {item.fitScore}</Badge>
            )}
            {item.legitScore != null && (
              <Badge variant="outline">Legit {item.legitScore}</Badge>
            )}
            {item.atsScore != null && (
              <Badge variant="outline">ATS {item.atsScore}</Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select
              value={item.status}
              onValueChange={(v) =>
                run(() => updateReviewStatus(item.id, v as typeof STATUS_OPTIONS[number]))
              }
            >
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Outcome</label>
            <Select
              value={item.outcome}
              onValueChange={(v) =>
                run(() => updateOutcome(item.id, v as typeof OUTCOME_OPTIONS[number]))
              }
            >
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OUTCOME_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {OUTCOME_LABEL[o]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {item.submittedAt && (
            <p className="pb-2 text-xs text-muted-foreground">
              Submitted {new Date(item.submittedAt).toLocaleDateString()}
            </p>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            {item.tailoredResumeId ? (
              <>
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/resume/${item.tailoredResumeId}/export?format=pdf`}>
                    <FileDown className="h-4 w-4" /> Resume
                  </a>
                </Button>
              </>
            ) : (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/tailor/${item.jobId}`}>
                  <Wand2 className="h-4 w-4" /> Tailor
                </Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link href={`/prep/${item.jobId}`}>
                <GraduationCap className="h-4 w-4" /> Prep
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/contacts/${item.jobId}`}>
                <Users className="h-4 w-4" /> Contacts
              </Link>
            </Button>
            <Button asChild size="sm">
              <a href={item.applyUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" /> Open application
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={pending}
              onClick={() => {
                if (confirm("Remove this item from your queue?"))
                  run(() => removeFromQueue(item.id));
              }}
              aria-label="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Textarea
          rows={2}
          placeholder="Notes — recruiter name, follow-up date, interview prep, etc."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (notes !== item.notes) run(() => updateNotes(item.id, notes));
          }}
        />
        {item.tailoredResumeLabel && (
          <p className="text-xs text-muted-foreground">
            Tailored resume: {item.tailoredResumeLabel} · also available as{" "}
            <a
              className="underline"
              href={`/api/resume/${item.tailoredResumeId}/export?format=docx`}
            >
              DOCX
            </a>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
