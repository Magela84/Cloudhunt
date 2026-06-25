"use client";

import * as React from "react";
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Mic,
  Star,
} from "lucide-react";
import type { InterviewPrep, MockFeedback } from "@/lib/interview/prep";
import { runPrep, runMockFeedback } from "@/app/(app)/prep/[jobId]/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PrepClient({
  jobId,
  aiEnabled,
}: {
  jobId: string;
  aiEnabled: boolean;
}) {
  const [prep, setPrep] = React.useState<InterviewPrep | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  const generate = () => {
    setError(null);
    start(async () => {
      const res = await runPrep(jobId);
      if ("error" in res) return setError(res.error);
      setPrep(res.prep);
    });
  };

  return (
    <div className="space-y-6">
      {!aiEnabled && (
        <div className="flex gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          Add <code className="font-mono">ANTHROPIC_API_KEY</code> to{" "}
          <code className="font-mono">.env</code> to generate interview prep.
        </div>
      )}

      <Button onClick={generate} disabled={!aiEnabled || pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {prep ? "Re-generate study pack" : "Generate study pack"}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {prep && (
        <>
          {prep.plan.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your focused plan</CardTitle>
                <CardDescription>Ordered to close your gaps for this role first.</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  {prep.plan.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {prep.concepts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Concepts to review</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {prep.concepts.map((c, i) => (
                  <Badge key={i} variant="secondary">{c}</Badge>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Likely questions &amp; mock interview</CardTitle>
              <CardDescription>
                Expand a question to see what a strong answer covers, or practice
                it and get AI feedback.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {prep.questions.map((q, i) => (
                <QuestionCard
                  key={i}
                  jobId={jobId}
                  question={q.question}
                  lookingFor={q.whatTheyreLookingFor}
                />
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function QuestionCard({
  jobId,
  question,
  lookingFor,
}: {
  jobId: string;
  question: string;
  lookingFor: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [practice, setPractice] = React.useState(false);
  const [answer, setAnswer] = React.useState("");
  const [feedback, setFeedback] = React.useState<MockFeedback | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  const getFeedback = () => {
    setError(null);
    start(async () => {
      const res = await runMockFeedback(jobId, question, answer);
      if ("error" in res) return setError(res.error);
      setFeedback(res.feedback);
    });
  };

  return (
    <div className="rounded-lg border p-3">
      <p className="font-medium">{question}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" className="px-2" onClick={() => setOpen((o) => !o)}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          What they&apos;re looking for
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="px-2"
          onClick={() => setPractice((p) => !p)}
        >
          <Mic className="h-4 w-4" /> Practice
        </Button>
      </div>

      {open && (
        <p className="mt-2 rounded-md bg-muted/40 p-2 text-sm text-muted-foreground">
          {lookingFor}
        </p>
      )}

      {practice && (
        <div className="mt-3 space-y-2">
          <Textarea
            rows={5}
            placeholder="Answer out loud, then type the gist here for feedback…"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <Button size="sm" onClick={getFeedback} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Get feedback
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {feedback && (
            <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < feedback.rating ? "fill-warning text-warning" : "text-muted-foreground"}`}
                  />
                ))}
                <span className="ml-2 text-muted-foreground">{feedback.overall}</span>
              </div>
              {feedback.strengths.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-success">Strengths</p>
                  <ul className="list-disc pl-5 text-muted-foreground">
                    {feedback.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.improvements.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-primary">To improve</p>
                  <ul className="list-disc pl-5 text-muted-foreground">
                    {feedback.improvements.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
