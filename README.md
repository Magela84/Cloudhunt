# CloudHunt

> Find legitimate, well-matched cloud-engineering jobs, tailor an ATS-friendly
> resume to each one, prepare for the interview, and track outreach — then hand
> off to **you** for the final submit. CloudHunt **prepares and organizes**; you
> review and submit. It never auto-applies and never auto-sends messages.

This is a portfolio-grade application built phase by phase. See
[the build plan](#build-status) for what's implemented.

## Tech stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + hand-rolled shadcn/ui-style components (dark mode included)
- **Supabase** Postgres + Supabase Auth (email + Google)
- **Prisma** ORM
- **Anthropic API** (`claude-sonnet-4-6`) for resume parsing/rewriting, scoring
  rationale, keyword extraction, and interview prep
- **recharts** for charts

## Build status

| Phase | Scope | Status |
|------|-------|--------|
| 0 | Scaffold, data model, tooling | ✅ Done |
| 1 | Auth + profile onboarding + resume intake | ✅ Done |
| 2 | Job aggregation + Legit Score | ⏳ Next |
| 3 | Qualification Fit Score | ⬜ |
| 4 | Resume tailor (per job) | ⬜ |
| 5 | Review & submit queue | ⬜ |
| 6 | Recruiter / contact panel | ⬜ |
| 7 | Signature features (ROI engine, interview prep, outcome loop) | ⬜ |
| ☁️ | Docker + Terraform (ECS/RDS/ALB/ECR) + CI/CD + CloudWatch | ⬜ |

## Local development

### 1. Prerequisites

- Node.js 18.18+ (this repo is developed on Node 24)
- A free [Supabase](https://supabase.com) project
- An [Anthropic API key](https://console.anthropic.com)
- (Phase 2+) Free [Adzuna API](https://developer.adzuna.com) credentials

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

- **Database / Supabase:** in your Supabase project, go to *Project Settings →
  Database* for `DATABASE_URL` (pooled, port 6543) and `DIRECT_URL` (direct,
  port 5432), and *Project Settings → API* for the URL + anon + service-role
  keys.
- **Anthropic:** `ANTHROPIC_API_KEY` (model is pinned to `claude-sonnet-4-6`).
- **Google login:** enable the Google provider in *Supabase → Authentication →
  Providers* and add `http://localhost:3000/auth/callback` as a redirect URL.

> The app boots even with missing keys — auth and AI features show a clear
> "not configured" state instead of crashing.

### 3. Install & set up the database

```bash
npm install
npm run db:push      # creates the schema in your Supabase Postgres
npm run db:generate  # generates the Prisma client (also runs on install)
```

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>. Sign up → complete the onboarding wizard → upload
a resume (PDF/DOCX) and review the AI-extracted sections.

> **Windows + OneDrive note:** this project disables Next.js `standalone` output
> locally (it creates symlinks OneDrive can't read). It's enabled only in the
> Docker build via `BUILD_STANDALONE=1`. If a build wedges, delete `.next`
> (`rmdir /s /q .next`) and rebuild.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run db:push` | Push the Prisma schema to the database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run test` | Run unit tests (Vitest) — scoring/dedupe/ROI in later phases |
| `npm run typecheck` | Type-check without emitting |

## Guardrails (enforced throughout)

- No auto-submission of applications; no automated/bulk messaging.
- Resume rewriting never fabricates experience — gaps are flagged, not filled.
- Scores are **estimates**, labeled as such — never "100% legit" or guaranteed.
- Contact data only ever comes from the job source — no scraping, guessing, or
  enrichment.
- All third-party keys live in environment variables.
