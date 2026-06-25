import Link from "next/link";
import { redirect } from "next/navigation";
import { Cloud, AlertTriangle } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";
import { getAuthUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  if (await getAuthUser()) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2 font-semibold"
        >
          <Cloud className="h-5 w-5 text-primary" />
          CloudHunt
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>
              Start finding well-matched cloud roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isSupabaseConfigured() && (
              <div className="mb-4 flex gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                <span>
                  Authentication isn&apos;t configured yet. Add your Supabase
                  keys to <code className="font-mono">.env</code> to enable
                  sign-up.
                </span>
              </div>
            )}
            <AuthForm mode="signup" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
