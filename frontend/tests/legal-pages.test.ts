import { describe, expect, it } from "vitest";
import { LEGAL_INFO, PRIVACY_POLICY, TERMS_AND_CONDITIONS, legalContactLines } from "@shared/legal";

describe("privacy policy and terms", () => {
  it("both documents have sections with unique links", () => {
    for (const doc of [PRIVACY_POLICY, TERMS_AND_CONDITIONS]) {
      expect(doc.sections.length).toBeGreaterThan(5);
      const ids = doc.sections.map(section => section.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const section of doc.sections) expect((section.paragraphs?.length || 0) + (section.bullets?.length || 0) + (section.notes?.length || 0)).toBeGreaterThan(0);
    }
  });

  it("never shows bracket placeholders like [Your email] to customers", () => {
    const text = JSON.stringify([PRIVACY_POLICY, TERMS_AND_CONDITIONS, legalContactLines()]);
    expect(text).not.toMatch(/\[[A-Z][^\]]*\]/);
  });

  it("covers what Play Store and Indian privacy law ask for", () => {
    const ids = PRIVACY_POLICY.sections.map(section => section.id);
    for (const id of ["collect", "use", "share", "security", "retention", "rights", "children", "grievance"]) expect(ids).toContain(id);
    expect(JSON.stringify(PRIVACY_POLICY)).toMatch(/Data Protection Board/);
  });

  it("hides contact lines that the owner has not filled in", () => {
    const labels = legalContactLines().map(line => line.label);
    if (!LEGAL_INFO.supportEmail) expect(labels).not.toContain("Email");
    expect(labels).toContain("Website");
  });
});