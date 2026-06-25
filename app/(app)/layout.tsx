import { redirect } from "next/navigation";
import { getCurrentUser, isOnboarded } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";

// Authenticated pages depend on per-request session cookies and the database.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Gate the app behind completed onboarding.
  if (!isOnboarded(user)) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-background">
      <AppNav email={user.email} />
      <div className="container py-8">{children}</div>
    </div>
  );
}
