"use client";

import * as React from "react";
import { Loader2, Plus, Trash2, Sparkles, Info } from "lucide-react";
import { saveResume } from "@/app/resume/actions";
import type { ResumeSections } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";

export interface ResumeEditorProps {
  resumeId?: string;
  initialLabel: string;
  initialRawText: string;
  initialSections: ResumeSections;
  initialIsBase: boolean;
  aiUsed?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}

export function ResumeEditor({
  resumeId,
  initialLabel,
  initialRawText,
  initialSections,
  initialIsBase,
  aiUsed,
  onSaved,
  onCancel,
}: ResumeEditorProps) {
  const [label, setLabel] = React.useState(initialLabel);
  const [isBase, setIsBase] = React.useState(initialIsBase);
  const [sections, setSections] = React.useState<ResumeSections>(initialSections);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const update = (patch: Partial<ResumeSections>) =>
    setSections((s) => ({ ...s, ...patch }));

  const updateExperience = (
    idx: number,
    patch: Partial<ResumeSections["experience"][number]>,
  ) =>
    setSections((s) => ({
      ...s,
      experience: s.experience.map((e, i) =>
        i === idx ? { ...e, ...patch } : e,
      ),
    }));

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await saveResume({
        id: resumeId,
        label,
        rawText: initialRawText,
        sections,
        isBase,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      onSaved?.();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="label">Resume label</Label>
          <Input
            id="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Base resume"
          />
        </div>
        <label className="flex h-9 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isBase}
            onChange={(e) => setIsBase(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          Use as my base resume
        </label>
      </div>

      {aiUsed === false && (
        <div className="flex gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
          <Info className="h-4 w-4 shrink-0 text-warning" />
          <span>
            AI extraction wasn&apos;t available, so sections start empty. Fill
            them in from the raw text below, or add your Anthropic key and
            re-upload for auto-fill.
          </span>
        </div>
      )}
      {aiUsed === true && (
        <div className="flex gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span>
            AI extracted these sections from your resume. Review and correct
            anything — your edits are what get saved.
          </span>
        </div>
      )}

      {/* Summary */}
      <section className="space-y-1.5">
        <Label htmlFor="summary">Professional summary</Label>
        <Textarea
          id="summary"
          rows={3}
          value={sections.summary}
          onChange={(e) => update({ summary: e.target.value })}
          placeholder="A concise summary of your experience…"
        />
      </section>

      {/* Experience */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Experience</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              update({
                experience: [
                  ...sections.experience,
                  {
                    title: "",
                    company: "",
                    location: "",
                    startDate: "",
                    endDate: "",
                    bullets: [],
                  },
                ],
              })
            }
          >
            <Plus className="h-4 w-4" /> Add role
          </Button>
        </div>
        {sections.experience.length === 0 && (
          <p className="text-sm text-muted-foreground">No experience yet.</p>
        )}
        {sections.experience.map((exp, i) => (
          <div key={i} className="space-y-3 rounded-lg border p-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={exp.title}
                onChange={(e) => updateExperience(i, { title: e.target.value })}
                placeholder="Title"
              />
              <Input
                value={exp.company}
                onChange={(e) =>
                  updateExperience(i, { company: e.target.value })
                }
                placeholder="Company"
              />
              <Input
                value={exp.location}
                onChange={(e) =>
                  updateExperience(i, { location: e.target.value })
                }
                placeholder="Location"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={exp.startDate}
                  onChange={(e) =>
                    updateExperience(i, { startDate: e.target.value })
                  }
                  placeholder="Start"
                />
                <Input
                  value={exp.endDate}
                  onChange={(e) =>
                    updateExperience(i, { endDate: e.target.value })
                  }
                  placeholder="End"
                />
              </div>
            </div>
            <div className="space-y-2">
              {exp.bullets.map((b, bi) => (
                <div key={bi} className="flex gap-2">
                  <Textarea
                    rows={2}
                    value={b}
                    onChange={(e) =>
                      updateExperience(i, {
                        bullets: exp.bullets.map((x, xi) =>
                          xi === bi ? e.target.value : x,
                        ),
                      })
                    }
                    placeholder="Accomplishment or responsibility"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      updateExperience(i, {
                        bullets: exp.bullets.filter((_, xi) => xi !== bi),
                      })
                    }
                    aria-label="Remove bullet"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateExperience(i, { bullets: [...exp.bullets, ""] })
                  }
                >
                  <Plus className="h-4 w-4" /> Add bullet
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() =>
                    update({
                      experience: sections.experience.filter((_, xi) => xi !== i),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" /> Remove role
                </Button>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Skills */}
      <section className="space-y-1.5">
        <Label>Skills</Label>
        <TagInput
          value={sections.skills}
          onChange={(v) => update({ skills: v })}
          placeholder="Add a skill"
        />
      </section>

      {/* Certifications */}
      <section className="space-y-1.5">
        <Label>Certifications</Label>
        <TagInput
          value={sections.certifications}
          onChange={(v) => update({ certifications: v })}
          placeholder="Add a certification"
        />
      </section>

      {/* Education */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Education</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              update({
                education: [
                  ...sections.education,
                  { degree: "", school: "", year: "" },
                ],
              })
            }
          >
            <Plus className="h-4 w-4" /> Add education
          </Button>
        </div>
        {sections.education.map((ed, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_6rem_auto] gap-2">
            <Input
              value={ed.degree}
              onChange={(e) =>
                update({
                  education: sections.education.map((x, xi) =>
                    xi === i ? { ...x, degree: e.target.value } : x,
                  ),
                })
              }
              placeholder="Degree"
            />
            <Input
              value={ed.school}
              onChange={(e) =>
                update({
                  education: sections.education.map((x, xi) =>
                    xi === i ? { ...x, school: e.target.value } : x,
                  ),
                })
              }
              placeholder="School"
            />
            <Input
              value={ed.year}
              onChange={(e) =>
                update({
                  education: sections.education.map((x, xi) =>
                    xi === i ? { ...x, year: e.target.value } : x,
                  ),
                })
              }
              placeholder="Year"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                update({
                  education: sections.education.filter((_, xi) => xi !== i),
                })
              }
              aria-label="Remove education"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </section>

      <details className="rounded-lg border p-4">
        <summary className="cursor-pointer text-sm font-medium">
          View raw extracted text
        </summary>
        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
          {initialRawText}
        </pre>
      </details>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        )}
        <Button type="button" onClick={save} disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save resume
        </Button>
      </div>
    </div>
  );
}
