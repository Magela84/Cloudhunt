"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { saveProfile } from "@/app/onboarding/actions";
import type { ProfileInput } from "@/lib/validations";
import {
  TARGET_TITLE_SUGGESTIONS,
  CLOUD_SKILL_SUGGESTIONS,
  CERTIFICATION_SUGGESTIONS,
  WORK_AUTH_SUGGESTIONS,
  REMOTE_PREFERENCES,
} from "@/lib/cloud/taxonomy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { TagInput } from "@/components/ui/tag-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormState = {
  fullName: string;
  targetTitles: string[];
  yearsExperience: string;
  certifications: string[];
  cloudSkills: string[];
  locationCity: string;
  locationCountry: string;
  remotePreference: ProfileInput["remotePreference"];
  workAuthorization: string;
  targetSalaryMin: string;
  targetSalaryMax: string;
};

const STEPS = ["Role & experience", "Cloud skills", "Preferences"];

export function OnboardingWizard({
  initial,
  redirectTo = "/resume",
  submitLabel = "Finish & continue",
}: {
  initial: Partial<FormState>;
  redirectTo?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const [form, setForm] = React.useState<FormState>({
    fullName: initial.fullName ?? "",
    targetTitles: initial.targetTitles ?? [],
    yearsExperience: initial.yearsExperience ?? "",
    certifications: initial.certifications ?? [],
    cloudSkills: initial.cloudSkills ?? [],
    locationCity: initial.locationCity ?? "",
    locationCountry: initial.locationCountry ?? "",
    remotePreference: initial.remotePreference ?? "ANY",
    workAuthorization: initial.workAuthorization ?? "",
    targetSalaryMin: initial.targetSalaryMin ?? "",
    targetSalaryMax: initial.targetSalaryMax ?? "",
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validateStep = (): string | null => {
    if (step === 0) {
      if (form.targetTitles.length === 0) return "Add at least one target role.";
      if (form.yearsExperience === "" || Number.isNaN(Number(form.yearsExperience)))
        return "Enter your years of experience.";
    }
    if (step === 1 && form.cloudSkills.length === 0)
      return "Add at least one cloud skill.";
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) return setError(err);
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = () => {
    const err = validateStep();
    if (err) return setError(err);
    setError(null);

    const payload: ProfileInput = {
      fullName: form.fullName,
      targetTitles: form.targetTitles,
      yearsExperience: Number(form.yearsExperience),
      certifications: form.certifications,
      cloudSkills: form.cloudSkills,
      locationCity: form.locationCity,
      locationCountry: form.locationCountry,
      remotePreference: form.remotePreference,
      workAuthorization: form.workAuthorization,
      targetSalaryMin:
        form.targetSalaryMin === "" ? undefined : Number(form.targetSalaryMin),
      targetSalaryMax:
        form.targetSalaryMax === "" ? undefined : Number(form.targetSalaryMax),
    };

    startTransition(async () => {
      const res = await saveProfile(payload);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    });
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
          <span>{STEPS[step]}</span>
        </div>
        <Progress value={progress} />
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Your name (optional)</Label>
            <Input
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              placeholder="Alex Rivera"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="titles">Target roles</Label>
            <TagInput
              id="titles"
              value={form.targetTitles}
              onChange={(v) => set("targetTitles", v)}
              placeholder="e.g. Cloud Engineer"
              suggestions={TARGET_TITLE_SUGGESTIONS}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="yoe">Years of experience</Label>
            <Input
              id="yoe"
              type="number"
              min={0}
              max={50}
              value={form.yearsExperience}
              onChange={(e) => set("yearsExperience", e.target.value)}
              placeholder="4"
              className="w-32"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="certs">Certifications you hold</Label>
            <TagInput
              id="certs"
              value={form.certifications}
              onChange={(v) => set("certifications", v)}
              placeholder="e.g. AWS SAA"
              suggestions={CERTIFICATION_SUGGESTIONS}
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="skills">Key cloud skills</Label>
            <p className="text-xs text-muted-foreground">
              Add the services and tools you actually work with. These power
              cloud-aware matching against each job.
            </p>
            <TagInput
              id="skills"
              value={form.cloudSkills}
              onChange={(v) => set("cloudSkills", v)}
              placeholder="e.g. Terraform, EKS, GitHub Actions"
              suggestions={CLOUD_SKILL_SUGGESTIONS}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input
                value={form.locationCity}
                onChange={(e) => set("locationCity", e.target.value)}
                placeholder="Austin"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input
                value={form.locationCountry}
                onChange={(e) => set("locationCountry", e.target.value)}
                placeholder="United States"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Remote preference</Label>
            <Select
              value={form.remotePreference}
              onValueChange={(v) =>
                set("remotePreference", v as FormState["remotePreference"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMOTE_PREFERENCES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="workauth">Work authorization</Label>
            <Input
              id="workauth"
              list="workauth-suggestions"
              value={form.workAuthorization}
              onChange={(e) => set("workAuthorization", e.target.value)}
              placeholder="e.g. U.S. Citizen"
            />
            <datalist id="workauth-suggestions">
              {WORK_AUTH_SUGGESTIONS.map((w) => (
                <option key={w} value={w} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Target salary min (USD)</Label>
              <Input
                type="number"
                min={0}
                value={form.targetSalaryMin}
                onChange={(e) => set("targetSalaryMin", e.target.value)}
                placeholder="120000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Target salary max (USD)</Label>
              <Input
                type="number"
                min={0}
                value={form.targetSalaryMax}
                onChange={(e) => set("targetSalaryMax", e.target.value)}
                placeholder="160000"
              />
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={back}
          disabled={step === 0 || pending}
        >
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={next}>
            Next
          </Button>
        ) : (
          <Button type="button" onClick={submit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
