"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  Loader2,
  Star,
  Trash2,
  Pencil,
  Plus,
} from "lucide-react";
import type { ResumeSections } from "@/lib/validations";
import { EMPTY_SECTIONS } from "@/lib/resume/extract-shared";
import { deleteResume, setBaseResume } from "@/app/resume/actions";
import { ResumeEditor } from "@/components/resume/resume-editor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface ResumeDTO {
  id: string;
  label: string;
  isBase: boolean;
  rawText: string;
  sections: ResumeSections;
  updatedAt: string;
  health?: { score: number; suggestions: string[] };
}

function healthVariant(score: number): "success" | "warning" | "destructive" {
  if (score >= 75) return "success";
  if (score >= 50) return "warning";
  return "destructive";
}

type ParsedUpload = {
  rawText: string;
  sections: ResumeSections;
  aiUsed: boolean;
  fileName: string;
};

type Mode =
  | { kind: "list" }
  | { kind: "new"; data: ParsedUpload; aiUsed: boolean }
  | { kind: "edit"; resume: ResumeDTO };

export function ResumeManager({ resumes }: { resumes: ResumeDTO[] }) {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>({ kind: "list" });
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busyId, startBusy] = React.useTransition();

  const onFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/resume/parse", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Upload failed.");
        return;
      }
      setMode({
        kind: "new",
        data: json as ParsedUpload,
        aiUsed: Boolean(json.aiUsed),
      });
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const onSaved = () => {
    setMode({ kind: "list" });
    router.refresh();
  };

  if (mode.kind === "new") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Review parsed resume</CardTitle>
          <CardDescription>
            From {mode.data.fileName}. Edit anything before saving — your edits
            are the source of truth.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResumeEditor
            initialLabel={
              resumes.length === 0 ? "Base resume" : mode.data.fileName
            }
            initialRawText={mode.data.rawText}
            initialSections={mode.data.sections}
            initialIsBase={resumes.length === 0}
            aiUsed={mode.aiUsed}
            onSaved={onSaved}
            onCancel={() => setMode({ kind: "list" })}
          />
        </CardContent>
      </Card>
    );
  }

  if (mode.kind === "edit") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit resume</CardTitle>
        </CardHeader>
        <CardContent>
          <ResumeEditor
            resumeId={mode.resume.id}
            initialLabel={mode.resume.label}
            initialRawText={mode.resume.rawText}
            initialSections={mode.resume.sections}
            initialIsBase={mode.resume.isBase}
            onSaved={onSaved}
            onCancel={() => setMode({ kind: "list" })}
          />
        </CardContent>
      </Card>
    );
  }

  // list mode
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) onFile(f);
            }}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-center transition-colors hover:bg-accent/40"
          >
            {uploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  Parsing your resume…
                </span>
              </>
            ) : (
              <>
                <UploadCloud className="h-7 w-7 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Drop a PDF or DOCX, or click to upload
                </span>
                <span className="text-xs text-muted-foreground">
                  Up to 5 MB. We extract text and structure it for you to review.
                </span>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
          </label>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          <div className="mt-3 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setMode({
                  kind: "new",
                  data: {
                    rawText: "",
                    sections: { ...EMPTY_SECTIONS },
                    aiUsed: false,
                    fileName: "Manual entry",
                  },
                  aiUsed: false,
                })
              }
            >
              <Plus className="h-4 w-4" /> Or enter a resume manually
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Your resumes ({resumes.length})
        </h2>
        {resumes.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No resumes yet. Upload one above to get started.
          </p>
        )}
        {resumes.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.label}</span>
                    {r.isBase && (
                      <Badge variant="secondary" className="gap-1">
                        <Star className="h-3 w-3" /> Base
                      </Badge>
                    )}
                    {r.health && (
                      <Badge
                        variant={healthVariant(r.health.score)}
                        title="Resume health score (estimate)"
                      >
                        Health {r.health.score}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.sections.experience.length} roles ·{" "}
                    {r.sections.skills.length} skills · updated{" "}
                    {new Date(r.updatedAt).toLocaleDateString()}
                  </p>
                  {r.health && r.health.suggestions.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tip: {r.health.suggestions[0]}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!r.isBase && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyId}
                    onClick={() => startBusy(() => setBaseResume(r.id).then(() => router.refresh()))}
                  >
                    <Star className="h-4 w-4" /> Set base
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMode({ kind: "edit", resume: r })}
                  aria-label="Edit resume"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  disabled={busyId}
                  onClick={() => {
                    if (confirm(`Delete "${r.label}"?`))
                      startBusy(() => deleteResume(r.id).then(() => router.refresh()));
                  }}
                  aria-label="Delete resume"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
