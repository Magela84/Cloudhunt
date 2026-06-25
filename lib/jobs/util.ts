import { createHash } from "crypto";

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

export function decodeEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&[a-z]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

/** Strip HTML tags and decode entities into readable plain text. */
export function stripHtml(html: string): string {
  if (!html) return "";
  const withoutTags = html
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, "")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(withoutTags)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function toDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    // Heuristic: seconds vs milliseconds.
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Lowercase, strip punctuation, collapse whitespace — for stable matching. */
export function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Stable hash of title+company used for dedupe and repost detection.
 * Two postings with the same normalized title and company share a rawHash.
 */
export function computeRawHash(title: string, company: string): string {
  const key = `${normalizeKey(title)}|${normalizeKey(company)}`;
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}

export function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}
