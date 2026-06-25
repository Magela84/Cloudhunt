"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resumeSectionsSchema, type ResumeSections } from "@/lib/validations";

export type SaveResumeInput = {
  id?: string;
  label: string;
  rawText: string;
  sections: ResumeSections;
  isBase: boolean;
};

export type ResumeResult = { ok: true; id: string } | { error: string };

export async function saveResume(
  input: SaveResumeInput,
): Promise<ResumeResult> {
  const user = await requireUser();

  const parsedSections = resumeSectionsSchema.safeParse(input.sections);
  if (!parsedSections.success) {
    return { error: "Resume sections are malformed." };
  }
  const label = input.label.trim() || "My resume";
  const sections = parsedSections.data;

  // If marking this resume as the base, clear the flag on the others first.
  const id = await prisma.$transaction(async (tx) => {
    if (input.isBase) {
      await tx.resume.updateMany({
        where: { userId: user.id, isBase: true, NOT: { id: input.id ?? "" } },
        data: { isBase: false },
      });
    }

    if (input.id) {
      const existing = await tx.resume.findFirst({
        where: { id: input.id, userId: user.id },
      });
      if (!existing) throw new Error("Resume not found");
      const updated = await tx.resume.update({
        where: { id: input.id },
        data: {
          label,
          rawText: input.rawText,
          sections,
          isBase: input.isBase,
        },
      });
      return updated.id;
    }

    const created = await tx.resume.create({
      data: {
        userId: user.id,
        label,
        rawText: input.rawText,
        sections,
        isBase: input.isBase,
      },
    });
    return created.id;
  });

  revalidatePath("/resume");
  return { ok: true, id };
}

export async function deleteResume(id: string): Promise<ResumeResult> {
  const user = await requireUser();
  const existing = await prisma.resume.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return { error: "Resume not found." };
  await prisma.resume.delete({ where: { id } });
  revalidatePath("/resume");
  return { ok: true, id };
}

export async function setBaseResume(id: string): Promise<ResumeResult> {
  const user = await requireUser();
  const existing = await prisma.resume.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return { error: "Resume not found." };
  await prisma.$transaction([
    prisma.resume.updateMany({
      where: { userId: user.id, isBase: true },
      data: { isBase: false },
    }),
    prisma.resume.update({ where: { id }, data: { isBase: true } }),
  ]);
  revalidatePath("/resume");
  return { ok: true, id };
}
