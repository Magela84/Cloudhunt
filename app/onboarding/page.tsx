import { Cloud } from "lucide-react";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ProfileInput } from "@/lib/validations";

export default async function OnboardingPage() {
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center justify-center gap-2 font-semibold">
          <Cloud className="h-5 w-5 text-primary" />
          CloudHunt
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Set up your profile</CardTitle>
            <CardDescription>
              This drives cloud-aware matching and resume tailoring. You can edit
              everything later in Settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingWizard initial={initial} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
