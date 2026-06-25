// Server-only resume text extraction. pdf-parse and mammoth are CommonJS and
// listed in next.config serverComponentsExternalPackages so they aren't bundled.
import "server-only";

export type ResumeFileKind = "pdf" | "docx";

export function detectKind(fileName: string, mimeType: string): ResumeFileKind | null {
  const lower = fileName.toLowerCase();
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  )
    return "docx";
  return null;
}

/** Collapse excessive whitespace while keeping line structure. */
function normalize(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractText(
  buffer: Buffer,
  kind: ResumeFileKind,
): Promise<string> {
  if (kind === "pdf") {
    // Import the lib entry directly to avoid pdf-parse's index.js debug code,
    // which tries to read a bundled test PDF and throws at import time.
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const result = await pdfParse(buffer);
    return normalize(result.text);
  }
  // docx
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return normalize(result.value);
}
