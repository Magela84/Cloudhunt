import { requireUser } from "@/lib/auth";
import {
  isSupabaseConfigured,
  isAnthropicConfigured,
  isAdzunaConfigured,
  isDatabaseConfigured,
} from "@/lib/env";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FitThresholdControl } from "@/components/settings/fit-threshold";
import type { ProfileInput } from "@/lib/validations";

export default async function SettingsPage() {
  const user = await requireUser();

  const initial = {
    fullName: user.fullName ?? "",
    targetTitles: user.targetTitles,
    yearsExperience:
      user.yearsExperience != null ? String(user.yearsExperience) : "",
    certifications: user.certifications,
    cloudSkills: user.cloudSkills,
    locationCity: user.locationCity ?? "",
    locationCountry: user.locationCountry ?? "",
    remotePreference: user.remotePreference as ProfileInput["remotePreference"],
    workAuthorization: user.workAuthorization ?? "",
    targetSalaryMin:
      user.targetSalaryMin != null ? String(user.targetSalaryMin) : "",
    targetSalaryMax:
      user.targetSalaryMax != null ? String(user.targetSalaryMax) : "",
  };

  const integrations = [
    { name: "Database", ok: isDatabaseConfigured() },
    { name: "Supabase Auth", ok: isSupabaseConfigured() },
    { name: "Anthropic (AI)", ok: isAnthropicConfigured() },
    { name: "Adzuna (jobs)", ok: isAdzunaConfigured() },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Edit your profile and matching preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integrations</CardTitle>
          <CardDescription>
            Configured via environment variables. See{" "}
            <code className="font-mono">.env.example</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {integrations.map((i) => (
            <Badge key={i.name} variant={i.ok ? "success" : "outline"}>
              {i.name}: {i.ok ? "connected" : "not configured"}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feed preferences</CardTitle>
          <CardDescription>
            The Fit threshold controls which roles show under “Strong matches” in
            your feed. Lower it to see more stretch roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FitThresholdControl value={user.fitThreshold} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingWizard
            initial={initial}
            redirectTo="/settings"
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>
    </div>
  );
}
