import "server-only";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ResumeSections } from "@/lib/validations";

export interface ExportMeta {
  name: string;
  contact?: string; // e.g. "email · location"
}

// ---------------------------------------------------------------------------
// DOCX — clean single-column, standard headings (ATS-safe)
// ---------------------------------------------------------------------------

export async function buildDocx(
  sections: ResumeSections,
  meta: ExportMeta,
): Promise<Buffer> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: meta.name, bold: true, size: 32 })],
    }),
  );
  if (meta.contact) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: meta.contact, size: 20 })],
      }),
    );
  }

  const heading = (text: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 80 },
      children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 24 })],
    });

  if (sections.summary.trim()) {
    children.push(heading("Summary"));
    children.push(new Paragraph({ children: [new TextRun({ text: sections.summary, size: 22 })] }));
  }

  if (sections.experience.length) {
    children.push(heading("Experience"));
    for (const exp of sections.experience) {
      const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" – ");
      children.push(
        new Paragraph({
          spacing: { before: 120 },
          children: [
            new TextRun({ text: exp.title || "", bold: true, size: 22 }),
            new TextRun({
              text:
                (exp.company ? `  |  ${exp.company}` : "") +
                (exp.location ? `, ${exp.location}` : "") +
                (dates ? `  (${dates})` : ""),
              size: 22,
            }),
          ],
        }),
      );
      for (const b of exp.bullets.filter((x) => x.trim())) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun({ text: b, size: 22 })],
          }),
        );
      }
    }
  }

  if (sections.skills.length) {
    children.push(heading("Skills"));
    children.push(
      new Paragraph({ children: [new TextRun({ text: sections.skills.join(" · "), size: 22 })] }),
    );
  }

  if (sections.certifications.length) {
    children.push(heading("Certifications"));
    for (const c of sections.certifications) {
      children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: c, size: 22 })] }));
    }
  }

  if (sections.education.length) {
    children.push(heading("Education"));
    for (const e of sections.education) {
      const line = [e.degree, e.school, e.year].filter(Boolean).join(", ");
      children.push(new Paragraph({ children: [new TextRun({ text: line, size: 22 })] }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

// ---------------------------------------------------------------------------
// PDF — single-column text flow with wrapping + pagination (ATS-safe)
// ---------------------------------------------------------------------------

export async function buildPdf(
  sections: ResumeSections,
  meta: ExportMeta,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 54;
  const MAX_W = PAGE_W - MARGIN * 2;
  const black = rgb(0.1, 0.1, 0.1);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const wrap = (text: string, f: typeof font, size: number): string[] => {
    const lines: string[] = [];
    for (const rawLine of text.split("\n")) {
      const words = rawLine.split(/\s+/).filter(Boolean);
      let line = "";
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (f.widthOfTextAtSize(test, size) > MAX_W && line) {
          lines.push(line);
          line = w;
        } else line = test;
      }
      lines.push(line);
    }
    return lines;
  };

  const write = (
    text: string,
    opts: { size?: number; f?: typeof font; gap?: number; indent?: number } = {},
  ) => {
    const size = opts.size ?? 10.5;
    const f = opts.f ?? font;
    const indent = opts.indent ?? 0;
    for (const line of wrap(text, f, size)) {
      ensureSpace(size + 4);
      page.drawText(line, { x: MARGIN + indent, y, size, font: f, color: black });
      y -= size + 4;
    }
    if (opts.gap) y -= opts.gap;
  };

  const heading = (text: string) => {
    ensureSpace(24);
    y -= 8;
    page.drawText(text.toUpperCase(), { x: MARGIN, y, size: 12, font: bold, color: black });
    y -= 6;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 10;
  };

  // Header
  write(meta.name, { size: 18, f: bold, gap: 2 });
  if (meta.contact) write(meta.contact, { size: 10, gap: 4 });

  if (sections.summary.trim()) {
    heading("Summary");
    write(sections.summary, { gap: 4 });
  }

  if (sections.experience.length) {
    heading("Experience");
    for (const exp of sections.experience) {
      const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" – ");
      write(exp.title || "", { f: bold, size: 11 });
      const sub = [exp.company, exp.location].filter(Boolean).join(", ") + (dates ? `  (${dates})` : "");
      if (sub.trim()) write(sub, { size: 10 });
      for (const b of exp.bullets.filter((x) => x.trim())) {
        write(`•  ${b}`, { indent: 8 });
      }
      y -= 4;
    }
  }

  if (sections.skills.length) {
    heading("Skills");
    write(sections.skills.join(" · "), { gap: 4 });
  }

  if (sections.certifications.length) {
    heading("Certifications");
    for (const c of sections.certifications) write(`•  ${c}`, { indent: 8 });
    y -= 4;
  }

  if (sections.education.length) {
    heading("Education");
    for (const e of sections.education) {
      write([e.degree, e.school, e.year].filter(Boolean).join(", "));
    }
  }

  return pdf.save();
}
