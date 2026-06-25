import type { ResumeSections } from "@/lib/validations";

/** Render structured sections to plain text (for raw storage / previews). */
export function sectionsToText(s: ResumeSections): string {
  const parts: string[] = [];
  if (s.summary.trim()) parts.push("SUMMARY\n" + s.summary.trim());

  if (s.experience.length) {
    const exp = s.experience
      .map((e) => {
        const dates = [e.startDate, e.endDate].filter(Boolean).join(" – ");
        const head = [e.title, e.company, e.location].filter(Boolean).join(" | ") +
          (dates ? `  (${dates})` : "");
        const bullets = e.bullets.filter((b) => b.trim()).map((b) => `  • ${b}`);
        return [head, ...bullets].join("\n");
      })
      .join("\n\n");
    parts.push("EXPERIENCE\n" + exp);
  }

  if (s.skills.length) parts.push("SKILLS\n" + s.skills.join(" · "));
  if (s.certifications.length)
    parts.push("CERTIFICATIONS\n" + s.certifications.map((c) => `• ${c}`).join("\n"));
  if (s.education.length)
    parts.push(
      "EDUCATION\n" +
        s.education
          .map((e) => [e.degree, e.school, e.year].filter(Boolean).join(", "))
          .join("\n"),
    );

  return parts.join("\n\n");
}
