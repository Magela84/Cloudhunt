import { z } from "zod";

export const remotePreferenceEnum = z.enum([
  "REMOTE",
  "HYBRID",
  "ONSITE",
  "ANY",
]);

export const profileSchema = z.object({
  fullName: z.string().trim().max(120).optional().or(z.literal("")),
  targetTitles: z.array(z.string().trim().min(1)).min(1, "Add at least one target role"),
  yearsExperience: z.coerce.number().int().min(0).max(50),
  certifications: z.array(z.string().trim().min(1)).default([]),
  cloudSkills: z.array(z.string().trim().min(1)).min(1, "Add at least one cloud skill"),
  locationCity: z.string().trim().max(120).optional().or(z.literal("")),
  locationCountry: z.string().trim().max(120).optional().or(z.literal("")),
  remotePreference: remotePreferenceEnum,
  workAuthorization: z.string().trim().max(160).optional().or(z.literal("")),
  targetSalaryMin: z.coerce.number().int().min(0).max(2_000_000).optional(),
  targetSalaryMax: z.coerce.number().int().min(0).max(2_000_000).optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/** Structured resume sections produced by the LLM and edited by the user. */
export const resumeSectionsSchema = z.object({
  summary: z.string().default(""),
  experience: z
    .array(
      z.object({
        title: z.string().default(""),
        company: z.string().default(""),
        location: z.string().default(""),
        startDate: z.string().default(""),
        endDate: z.string().default(""),
        bullets: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  skills: z.array(z.string()).default([]),
  education: z
    .array(
      z.object({
        degree: z.string().default(""),
        school: z.string().default(""),
        year: z.string().default(""),
      }),
    )
    .default([]),
  certifications: z.array(z.string()).default([]),
});

export type ResumeSections = z.infer<typeof resumeSectionsSchema>;
