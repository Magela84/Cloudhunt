/**
 * Extract contact info that the employer ALREADY published in the job posting.
 *
 * HARD GUARDRAIL: this only reads the posting text we already fetched from the
 * job source. It never guesses or pattern-generates emails, never scrapes
 * LinkedIn, and never calls enrichment services. If the posting doesn't contain
 * a contact, none is returned — full stop.
 */

export interface ExtractedContact {
  email: string;
  name: string | null;
  provenance: string; // always "from job posting" here
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

// Mailboxes that aren't a real person to contact.
const NON_CONTACT = /^(no-?reply|donotreply|do-not-reply|noreply|mailer|bounce|postmaster|abuse|privacy|unsubscribe)@/i;

/** Try to find a person's name immediately preceding the email (e.g. "Jane Doe <jane@co>"). */
function nameNear(text: string, email: string): string | null {
  const idx = text.indexOf(email);
  if (idx === -1) return null;
  const before = text.slice(Math.max(0, idx - 60), idx);
  // "Contact Jane Doe at " / "Jane Doe (" / "Jane Doe <"
  const m = before.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s*(?:[(<-]|at\s*)?\s*$/);
  if (m && !/contact|recruiter|email|reach|apply/i.test(m[1])) return m[1].trim();
  return null;
}

export function extractPublishedContacts(
  description: string,
): ExtractedContact[] {
  if (!description) return [];
  const seen = new Set<string>();
  const out: ExtractedContact[] = [];

  for (const raw of description.match(EMAIL_RE) ?? []) {
    const email = raw.toLowerCase();
    if (NON_CONTACT.test(email)) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    out.push({
      email,
      name: nameNear(description, raw),
      provenance: "from job posting",
    });
  }
  return out;
}

/** A safe link to the company's own site for the user to find contact info themselves. */
export function careersSearchUrl(company: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${company} careers official site`)}`;
}
