"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Sparkles,
  Loader2,
  Copy,
  Trash2,
  Mail,
  ExternalLink,
  UserPlus,
} from "lucide-react";
import type { JobContactsDTO, ContactDTO } from "@/lib/contacts";
import {
  addManualContact,
  generateDraft,
  saveOutreachDraft,
  updateOutreachStatus,
  deleteContact,
} from "@/app/(app)/contacts/[jobId]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS = ["DRAFTED", "SENT", "REPLIED"] as const;

export function ContactsClient({
  data,
  aiEnabled,
}: {
  data: JobContactsDTO;
  aiEnabled: boolean;
}) {
  const [error, setError] = React.useState<string | null>(null);

  return (
    <div className="space-y-5">
      {/* Guardrail explainer */}
      <div className="flex gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        <ShieldAlert className="h-4 w-4 shrink-0 text-primary" />
        CloudHunt only shows contacts the employer <strong>published in this
        posting</strong>. It never scrapes LinkedIn, guesses emails, or uses
        contact-finder services. Anything else here is what <em>you</em> add
        yourself, and you always send messages manually.
      </div>

      {data.contacts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No public contact listed</CardTitle>
            <CardDescription>
              This posting didn&apos;t include a contact. We won&apos;t hunt one
              down — check the company&apos;s official site, and add anyone you
              find below.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={data.careersUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" /> Company careers / contact page
              </a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" /> Original posting
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.contacts.map((c) => (
            <ContactRow
              key={c.id}
              jobTitle={data.jobTitle}
              company={data.company}
              contact={c}
              aiEnabled={aiEnabled}
              onError={setError}
            />
          ))}
        </div>
      )}

      <ManualAddCard jobId={data.jobId} onError={setError} />

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function ContactRow({
  jobTitle,
  company,
  contact,
  aiEnabled,
  onError,
}: {
  jobTitle: string;
  company: string;
  contact: ContactDTO;
  aiEnabled: boolean;
  onError: (s: string | null) => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = React.useState(contact.outreach?.draft ?? "");
  const [drafting, startDraft] = React.useTransition();
  const [busy, startBusy] = React.useTransition();

  const run = (fn: () => Promise<unknown>) =>
    startBusy(async () => {
      await fn();
      router.refresh();
    });

  const onGenerate = () => {
    onError(null);
    startDraft(async () => {
      const res = await generateDraft(contact.id);
      if ("error" in res) return onError(res.error);
      setDraft(res.draft);
      router.refresh();
    });
  };

  const subject = `Re: ${jobTitle} at ${company}`;
  const mailto = contact.email
    ? `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft)}`
    : undefined;

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">{contact.name ?? contact.email}</p>
            {contact.name && contact.email && (
              <p className="text-sm text-muted-foreground">{contact.email}</p>
            )}
            <Badge variant="outline" className="mt-1 text-[11px]">
              {contact.provenance}
            </Badge>
          </div>
          {contact.source === "manual" && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove contact"
              disabled={busy}
              onClick={() => run(() => deleteContact(contact.id))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Button onClick={onGenerate} disabled={!aiEnabled || drafting} variant="outline" size="sm">
          {drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {contact.outreach?.draft ? "Re-draft" : "Draft a message"}
        </Button>

        {(draft || contact.outreach) && (
          <div className="space-y-2">
            <Textarea rows={7} value={draft} onChange={(e) => setDraft(e.target.value)} />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => run(() => saveOutreachDraft(contact.id, draft))}
              >
                Save draft
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigator.clipboard?.writeText(draft)}>
                <Copy className="h-4 w-4" /> Copy
              </Button>
              {mailto && (
                <Button asChild variant="ghost" size="sm">
                  <a href={mailto}>
                    <Mail className="h-4 w-4" /> Open in email
                  </a>
                </Button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={contact.outreach?.status ?? "DRAFTED"}
                  onValueChange={(v) =>
                    run(() => updateOutreachStatus(contact.id, v as typeof STATUS[number]))
                  }
                >
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s.toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              You send this yourself — CloudHunt never emails or messages anyone
              on your behalf.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ManualAddCard({
  jobId,
  onError,
}: {
  jobId: string;
  onError: (s: string | null) => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [pending, start] = React.useTransition();

  const submit = () => {
    onError(null);
    start(async () => {
      const res = await addManualContact(jobId, name, email);
      if ("error" in res) return onError(res.error);
      setName("");
      setEmail("");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" /> Add a contact you found yourself
        </CardTitle>
        <CardDescription>
          Sourced a contact from the company&apos;s own site? Add it here to draft
          and track outreach. CloudHunt won&apos;t look one up for you.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cname">Name (optional)</Label>
          <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} className="w-44" placeholder="Jane Doe" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cemail">Email</Label>
          <Input id="cemail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-56" placeholder="jane@company.com" />
        </div>
        <Button onClick={submit} disabled={pending || !email}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Add contact
        </Button>
      </CardContent>
    </Card>
  );
}
