import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resumeSectionsSchema } from "@/lib/validations";
import { buildDocx, buildPdf, type ExportMeta } from "@/lib/resume/export";

export const runtime = "nodejs";

function safeName(label: string): string {
  return label.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "resume";
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const format = new URL(request.url).searchParams.get("format") === "docx" ? "docx" : "pdf";

  const resume = await prisma.resume.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!resume) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  const sections = resumeSectionsSchema.parse(resume.sections ?? {});
  const meta: ExportMeta = {
    name: user.fullName || user.email,
    contact: [user.email, [user.locationCity, user.locationCountry].filter(Boolean).join(", ")]
      .filter(Boolean)
      .join("  ·  "),
  };

  const filename = `${safeName(resume.label)}.${format}`;

  if (format === "docx") {
    const buf = await buildDocx(sections, meta);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const bytes = await buildPdf(sections, meta);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
