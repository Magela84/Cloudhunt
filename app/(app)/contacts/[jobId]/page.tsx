import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getJobContacts } from "@/lib/contacts";
import { isAnthropicConfigured } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { ContactsClient } from "@/components/contacts/contacts-client";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  params,
}: {
  params: { jobId: string };
}) {
  const user = await requireUser();
  const data = await getJobContacts(user.id, params.jobId);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/feed">
            <ArrowLeft className="h-4 w-4" /> Back to feed
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Contacts &amp; outreach</h1>
        <p className="text-muted-foreground">
          {data.jobTitle} · {data.company}
        </p>
      </div>

      <ContactsClient data={data} aiEnabled={isAnthropicConfigured()} />
    </div>
  );
}
