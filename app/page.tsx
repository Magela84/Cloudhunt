import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Cloud, ShieldCheck, FileText, Target, ListChecks } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Legit Score (estimate)",
    body: "Every posting gets a transparent 0–100 trust estimate from repost frequency, salary transparency, template detection, and more — with a plain-English why. Always vet employers yourself.",
  },
  {
    icon: Target,
    title: "Qualification Fit Score",
    body: "Cloud-aware matching (EKS↔Kubernetes, AZ-104↔Azure admin, IaC↔Terraform) buckets each role MATCH / STRETCH / REACH / SKIP against your real profile.",
  },
  {
    icon: FileText,
    title: "Resume tailoring, honestly",
    body: "Rephrase, quantify, and resurface your real experience for each job. Gaps are flagged — never fabricated. Export ATS-safe PDF & DOCX.",
  },
  {
    icon: ListChecks,
    title: "Review & submit queue",
    body: "Strong matches land in a queue with scores, rationale, and a tailored resume. You open the real apply page and submit. CloudHunt never auto-applies.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Cloud className="h-5 w-5 text-primary" />
            CloudHunt
          </div>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="container py-20 text-center">
        <p className="mb-4 inline-block rounded-full border px-3 py-1 text-xs text-muted-foreground">
          For Cloud / DevOps / Platform Engineers
        </p>
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Find legit cloud jobs, tailor your resume, and prepare to apply — the
          honest way.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
          CloudHunt aggregates real listings from legitimate sources, scores
          them for trust and fit, and tailors your resume per role. It prepares
          and organizes; you review and submit. It never auto-applies and never
          sends messages for you.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">Create your account</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      <section className="container grid gap-6 pb-20 sm:grid-cols-2">
        {features.map((f) => (
          <Card key={f.title}>
            <CardHeader>
              <f.icon className="h-6 w-6 text-primary" />
              <CardTitle>{f.title}</CardTitle>
              <CardDescription>{f.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <footer className="border-t">
        <div className="container flex h-16 items-center justify-between text-xs text-muted-foreground">
          <span>
            CloudHunt prepares and organizes. Scores are estimates, not
            guarantees. Always vet employers yourself.
          </span>
          <span>No scraping · No auto-apply · No bulk messaging</span>
        </div>
      </footer>
    </main>
  );
}
