"use client";

import * as React from "react";
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  FileDown,
  ExternalLink,
  Copy,
  Wand2,
  ListPlus,
} from "lucide-react";
import type { ResumeSections } from "@/lib/validations";
import type { AtsResult } from "@/lib/scoring/ats";
import type { TailorResult } from "@/lib/resume/tailor";
import {
  runTailor,
  runCoverLetter,
  saveTailoredResume,
} from "@/app/(app)/tailor/[jobId]/actions";
import { addToQueue } from "@/app/(app)/queue/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function atsTier(score: number) {
  if (score >= 75) return "success" as const;
  if (score >= 50) return "warning" as const;
  return "destructive" as const;
}

export function TailorClient({
  jobId,
  jobTitle,
  company,
  applyUrl,
  baseSections,
  ats,
  aiEnabled,
}: {
  jobId: string;
  jobTitle: string;
  company: string;
  applyUrl: string;
  baseSections: ResumeSections;
  ats: AtsResult;
  aiEnabled: boolean;
}) {
  const [tailor, setTailor] = React.useState<TailorResult | null>(null);
  const [useSummary, setUseSummary] = React.useState(true);
  const [roleUse, setRoleUse] = React.useState<boolean[]>([]);
  const [cover, setCover] = React.useState<string | null>(null);
  const [label, setLabel] = React.useState(`Tailored — ${company}`);
  const [savedId, setSavedId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [queued, setQueued] = React.useState(false);
  const [tailoring, startTailor] = React.useTransition();
  const [covering, startCover] = React.useTransition();
  const [saving, startSave] = React.useTransition();
  const [queuing, startQueue] = React.useTransition();

  const finalSections: ResumeSections = React.useMemo(() => {
    if (!tailor) return baseSections;
    return {
      ...baseSections,
      summary: useSummary ? tailor.summary : baseSections.summary,
      experience: baseSections.experience.map((e, i) => ({
        ...e,
        bullets:
          roleUse[i] && tailor.experience[i]?.bullets?.length
            ? tailor.experience[i].bullets
            : e.bullets,
      })),
    };
  }, [tailor, useSummary, roleUse, baseSections]);

  const onTailor = () => {
    setError(null);
    setSavedId(null);
    startTailor(async () => {
      const res = await runTailor(jobId);
      if ("error" in res) return setError(res.error);
      setTailor(res.tailor);
      setUseSummary(true);
      setRoleUse(baseSections.experience.map(() => true));
    });
  };

  const onCover = () => {
    setError(null);
    startCover(async () => {
      const res = await runCoverLetter(jobId);
      if ("error" in res) return setError(res.error);
      setCover(res.letter);
    });
  };

  const onSave = () => {
    setError(null);
    startSave(async () => {
      const res = await saveTailoredResume(jobId, label, finalSections);
      if ("error" in res) return setError(res.error);
      setSavedId(res.id);
    });
  };

  return (
    <div className="space-y-6">
      {/* ATS match report */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ATS keyword match</CardTitle>
          <CardDescription>
            How your base resume aligns with this posting&apos;s keywords.
            Guidance for tailoring — not a target to game.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant={atsTier(ats.score)} className="text-sm">
              ATS {ats.score}/100
            </Badge>
            <span className="text-sm text-muted-foreground">
              {ats.matched.length} matched · {ats.missing.length} missing
            </span>
          </div>
          {ats.matched.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Matched keywords</p>
              <div className="flex flex-wrap gap-1">
                {ats.matched.map((k) => (
                  <Badge key={k} variant="success" className="text-[11px]">{k}</Badge>
                ))}
              </div>
            </div>
          )}
          {ats.missing.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Missing keywords</p>
              <div className="flex flex-wrap gap-1">
                {ats.missing.map((k) => (
                  <Badge key={k} variant="outline" className="text-[11px]">{k}</Badge>
                ))}
              </div>
            </div>
          )}
          <ul className="space-y-1 text-sm text-muted-foreground">
            {ats.suggestions.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary">→</span>
                {s}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* AI tailoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wand2 className="h-4 w-4 text-primary" /> AI-tailored resume
          </CardTitle>
          <CardDescription>
            Rewrites your real content to emphasize what matters for this role.
            Review each change — your edits are what get saved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!aiEnabled && (
            <div className="flex gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
              Add <code className="font-mono">ANTHROPIC_API_KEY</code> to{" "}
              <code className="font-mono">.env</code> to enable AI tailoring and
              cover letters.
            </div>
          )}

          <Button onClick={onTailor} disabled={!aiEnabled || tailoring}>
            {tailoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {tailor ? "Re-generate" : "Generate tailored resume"}
          </Button>

          {tailor && (
            <div className="space-y-5">
              {tailor.gaps.length > 0 && (
                <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
                  <p className="mb-1 flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="h-4 w-4 text-warning" /> Gaps (flagged, not added)
                  </p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    The role wants these, but they aren&apos;t in your resume. We
                    won&apos;t fabricate them — consider whether you can speak to
                    them honestly, or treat them as growth areas.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {tailor.gaps.map((g, i) => (
                      <Badge key={i} variant="outline" className="text-[11px]">{g}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary diff */}
              <DiffBlock
                title="Summary"
                original={baseSections.summary || "(none)"}
                tailored={tailor.summary}
                useTailored={useSummary}
                onToggle={setUseSummary}
              />

              {/* Experience diffs */}
              {baseSections.experience.map((e, i) => (
                <DiffBlock
                  key={i}
                  title={`${e.title || "Role"}${e.company ? ` · ${e.company}` : ""}`}
                  original={e.bullets.join("\n") || "(no bullets)"}
                  tailored={(tailor.experience[i]?.bullets ?? e.bullets).join("\n")}
                  useTailored={roleUse[i] ?? true}
                  onToggle={(v) =>
                    setRoleUse((r) => {
                      const next = [...r];
                      next[i] = v;
                      return next;
                    })
                  }
                />
              ))}

              <p className="text-xs text-muted-foreground">
                Guardrail: tailoring only rephrases and resurfaces your real
                experience. It never invents jobs, titles, dates, certs, or skills.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save + export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Save &amp; export</CardTitle>
          <CardDescription>
            Saves a tailored version (your base resume stays untouched), then
            export ATS-safe files.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="tlabel">Label</Label>
              <Input id="tlabel" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <Button onClick={onSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save tailored resume
            </Button>
          </div>

          {savedId && (
            <div className="space-y-3 rounded-md border bg-muted/30 p-3">
              <p className="flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" /> Saved. Download or open the application page.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/resume/${savedId}/export?format=pdf`}>
                    <FileDown className="h-4 w-4" /> PDF
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/resume/${savedId}/export?format=docx`}>
                    <FileDown className="h-4 w-4" /> DOCX
                  </a>
                </Button>
                <Button asChild size="sm">
                  <a href={applyUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" /> Open application page
                  </a>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={queuing || queued}
                  onClick={() =>
                    startQueue(async () => {
                      const r = await addToQueue(jobId, savedId ?? undefined);
                      if (!("error" in r)) setQueued(true);
                    })
                  }
                >
                  {queued ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <ListPlus className="h-4 w-4" />
                  )}
                  {queued ? "Added to queue" : "Add to queue"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                CloudHunt never submits applications — you review and submit on the
                employer&apos;s site yourself.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cover letter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cover letter</CardTitle>
          <CardDescription>
            Generated from your real experience for {jobTitle} at {company}. Edit
            freely before using it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={onCover} disabled={!aiEnabled || covering} variant="outline">
            {covering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {cover ? "Re-generate cover letter" : "Generate cover letter"}
          </Button>
          {cover != null && (
            <div className="space-y-2">
              <Textarea
                rows={12}
                value={cover}
                onChange={(e) => setCover(e.target.value)}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigator.clipboard?.writeText(cover)}
              >
                <Copy className="h-4 w-4" /> Copy to clipboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function DiffBlock({
  title,
  original,
  tailored,
  useTailored,
  onToggle,
}: {
  title: string;
  original: string;
  tailored: string;
  useTailored: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={useTailored}
            onChange={(e) => onToggle(e.target.checked)}
          />
          Use tailored
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[11px] uppercase text-muted-foreground">Original</p>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{original}</p>
        </div>
        <div>
          <p className="mb-1 text-[11px] uppercase text-primary">Tailored</p>
          <p className={`whitespace-pre-wrap text-sm ${useTailored ? "" : "text-muted-foreground line-through opacity-60"}`}>
            {tailored}
          </p>
        </div>
      </div>
    </div>
  );
}
