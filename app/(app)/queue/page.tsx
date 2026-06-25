import { ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getQueue } from "@/lib/queue";
import { QueueClient } from "@/components/queue/queue-client";

export default async function QueuePage() {
  const user = await requireUser();
  const { items, stats } = await getQueue(user.id);

  const cards = [
    { label: "In queue", value: stats.active },
    { label: "Submitted", value: stats.submitted },
    { label: "Responses", value: stats.responses },
    {
      label: "Response rate",
      value: stats.submitted ? `${Math.round(stats.responseRate * 100)}%` : "—",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Review &amp; submit queue</h1>
        <p className="text-muted-foreground">
          Your shortlist to review, submit, and track. CloudHunt prepares
          everything — you open each application and submit it yourself.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border p-4">
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
        CloudHunt never submits applications or sends messages for you. Use “Open
        application” to apply on the employer&apos;s own site, then mark it
        submitted and log the outcome here.
      </div>

      <QueueClient items={items} />
    </div>
  );
}
