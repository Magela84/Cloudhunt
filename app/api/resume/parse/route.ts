import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { detectKind, extractText } from "@/lib/resume/parse";
import { extractSections } from "@/lib/resume/extract";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 5 MB)" },
      { status: 413 },
    );
  }

  const kind = detectKind(file.name, file.type);
  if (!kind) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload a PDF or DOCX." },
      { status: 415 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await extractText(buffer, kind);
    if (!rawText || rawText.length < 30) {
      return NextResponse.json(
        {
          error:
            "Couldn't read meaningful text from this file. If it's a scanned PDF, try a text-based export.",
        },
        { status: 422 },
      );
    }
    const { sections, aiUsed } = await extractSections(rawText);
    return NextResponse.json({ rawText, sections, aiUsed, fileName: file.name });
  } catch (err) {
    console.error("resume parse failed", err);
    return NextResponse.json(
      { error: "Failed to parse the resume. Please try a different file." },
      { status: 500 },
    );
  }
}
