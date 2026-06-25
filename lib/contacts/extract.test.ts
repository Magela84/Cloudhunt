import { describe, it, expect } from "vitest";
import { extractPublishedContacts, careersSearchUrl } from "@/lib/contacts/extract";

describe("extractPublishedContacts", () => {
  it("extracts only emails actually present in the posting", () => {
    const desc = "To apply, email our recruiter at jane.smith@acme.io for details.";
    const r = extractPublishedContacts(desc);
    expect(r.map((c) => c.email)).toEqual(["jane.smith@acme.io"]);
    expect(r[0].provenance).toBe("from job posting");
  });

  it("skips no-reply / automated mailboxes", () => {
    const r = extractPublishedContacts("Questions? noreply@acme.io or do-not-reply@acme.io");
    expect(r).toHaveLength(0);
  });

  it("dedupes repeated addresses", () => {
    const r = extractPublishedContacts("hr@x.com ... contact hr@x.com again");
    expect(r).toHaveLength(1);
  });

  it("returns nothing when the posting has no contact (never guesses)", () => {
    expect(extractPublishedContacts("Great role on our platform team.")).toEqual([]);
    expect(extractPublishedContacts("")).toEqual([]);
  });
});

describe("careersSearchUrl", () => {
  it("builds a plain search link to the company site", () => {
    const url = careersSearchUrl("Acme Corp");
    expect(url).toContain("google.com/search");
    expect(url).toContain(encodeURIComponent("Acme Corp"));
  });
});
