import { describe, expect, it, vi } from "vitest";
import {
  resolveCanonicalReaderPassage,
} from "../../server/services/inBookGrounding";
import type { ScriptureSearchResult } from "../../lib/retrieval/search";

const verseText =
  "Allah, there is no deity except Him, the Ever-Living, the Sustainer of existence.";

function result(refId: string, chapter: number, verse: number): ScriptureSearchResult {
  return {
    refId,
    tradition: "islam",
    book: "Al-Baqarah",
    chapter,
    verse,
    reference: `Al-Baqarah ${chapter}:${verse}`,
    originalText: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ",
    originalLang: "Arabic",
    translation: verseText,
    translationSource: "Clear Quran",
    score: 0.99,
  } as ScriptureSearchResult;
}

describe("resolveCanonicalReaderPassage", () => {
  it("requires an explicit text selection", async () => {
    const search = vi.fn();
    await expect(
      resolveCanonicalReaderPassage("islam", "clear-quran", undefined, search),
    ).resolves.toEqual({ ok: false, reason: "selection_required" });
    expect(search).not.toHaveBeenCalled();
  });

  it("maps selected reader text to the exact indexed canonical passage", async () => {
    const hit = result("quran:2:255", 2, 255);
    const search = vi.fn(async () => [hit]);
    const resolved = await resolveCanonicalReaderPassage(
      "islam",
      "clear-quran",
      `“${verseText}”`,
      search,
    );

    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.passages.map((passage) => passage.refId)).toEqual(["quran:2:255"]);
      expect(resolved.edition).toBe("Clear Quran");
    }
    expect(search).toHaveBeenCalledWith(`“${verseText}”`, {
      traditions: ["islam"],
      k: 50,
    });
  });

  it("does not accept a semantic-only passage match", async () => {
    const search = vi.fn(async () => [result("quran:2:255", 2, 255)]);
    await expect(
      resolveCanonicalReaderPassage(
        "islam",
        "clear-quran",
        "This unrelated selection is long enough but does not match any source.",
        search,
      ),
    ).resolves.toEqual({ ok: false, reason: "no_exact_match" });
  });

  it("rejects ambiguous matches rather than choosing one", async () => {
    const search = vi.fn(async () => [
      result("quran:2:255", 2, 255),
      result("quran:3:2", 3, 2),
    ]);
    const resolved = await resolveCanonicalReaderPassage(
      "islam",
      "clear-quran",
      verseText,
      search,
    );

    expect(resolved).toEqual({ ok: false, reason: "ambiguous_match" });
  });

  it("does not resolve scripture from a book without a matching indexed corpus", async () => {
    const search = vi.fn();
    await expect(
      resolveCanonicalReaderPassage("islam", "sahih-al-bukhari", verseText, search),
    ).resolves.toEqual({ ok: false, reason: "book_not_indexed" });
    expect(search).not.toHaveBeenCalled();
  });
});
