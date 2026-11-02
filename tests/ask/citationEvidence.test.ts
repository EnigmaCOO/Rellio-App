import { describe, expect, it } from "vitest";
import type { GroundedContext, ScriptureCitation } from "../../types/retrieval";
import { validateCitations } from "../../validators/citations";

const passage: ScriptureCitation = {
  refId: "quran:2:255",
  tradition: "islam",
  book: "Al-Baqarah",
  chapter: 2,
  verse: 255,
  reference: "Al-Baqarah 2:255",
  originalText: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ",
  originalLang: "Arabic",
  translation: "Allah, there is no deity except Him, the Ever-Living, the Sustainer of existence.",
  translationSource: "Clear Quran",
};

const context: GroundedContext = {
  scope: "strict_source_grounded",
  tradition: "islam",
  traditionsInScope: ["islam"],
  focusPassage: [passage],
  retrievedPassages: [],
  commentary: [],
  commentaryAvailable: false,
};

describe("evidence validation", () => {
  it("accepts an exact quote from retrieved text", () => {
    const validation = validateCitations(
      [],
      context,
      `The passage states “${passage.translation}”.`,
    );

    expect(validation.ok).toBe(true);
  });

  it("rejects an unsupported exact quote", () => {
    const validation = validateCitations(
      [],
      context,
      "The passage states “This quotation does not appear in the selected source.”",
    );

    expect(validation.ok).toBe(false);
    expect(validation.issues.join(" ").toLowerCase()).toContain("quoted text");
  });

  it("requires at least one evidence citation when requested", () => {
    const validation = validateCitations(
      [],
      context,
      "The text teaches an important principle.",
      { requireCitation: true },
    );

    expect(validation.ok).toBe(false);
    expect(validation.issues.join(" ")).toContain("citation");
  });
});
