import type { JobSource } from "@/lib/jobs/types";
import { adzunaSource } from "@/lib/jobs/sources/adzuna";
import { arbeitnowSource } from "@/lib/jobs/sources/arbeitnow";
import { remoteOkSource } from "@/lib/jobs/sources/remoteok";
import { greenhouseSource } from "@/lib/jobs/sources/greenhouse";
import { leverSource } from "@/lib/jobs/sources/lever";
import { ashbySource } from "@/lib/jobs/sources/ashby";

/** All adapters, in priority order. */
export const ALL_SOURCES: JobSource[] = [
  adzunaSource,
  greenhouseSource,
  leverSource,
  ashbySource,
  arbeitnowSource,
  remoteOkSource,
];

export function configuredSources(): JobSource[] {
  return ALL_SOURCES.filter((s) => s.isConfigured());
}
