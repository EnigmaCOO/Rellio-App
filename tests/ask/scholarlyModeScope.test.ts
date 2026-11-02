import { describe, expect, it } from "vitest";
import { SUPPORTED_RELIGIONS } from "../../shared/scriptureSources";
import { chatRequestSchema } from "../../shared/schema";
import { resolveAskScope } from "../../server/services/scholarlyModeScope";
import { routeResponseMode } from "../../server/services/responseModeRouter";
import { sourceIsSelected } from "../../server/services/askGrounding";

describe("resolveAskScope", () => {
  it("treats the Bible source as covering the indexed testament corpora", () => {
    expect(sourceIsSelected("bible-nt", new Set(["bible"]))).toBe(true);
    expect(sourceIsSelected("bible-ot", new Set(["bible"]))).toBe(true);
    expect(sourceIsSelected("quran", new Set(["bible"]))).toBe(false);
  });

  it("keeps explicit Ask broad even when the question mentions comparison", () => {
    const scope = resolveAskScope({ mode: "ask" });
    expect(scope.ok).toBe(true);
    if (scope.ok) {
      expect(scope.chatMode).toBe("ask");
      expect(scope.responseMode).toBe("general");
      expect(routeResponseMode({
        message: "Compare the traditions' approaches.",
        selectedSources: scope.selectedSources,
        selectedTraditions: scope.selectedTraditions,
        explicitMode: scope.chatMode,
      })).toBe("general");
    }
  });

  it("requires an explicit tradition for Single tradition mode", () => {
    expect(resolveAskScope({ mode: "single" })).toEqual({
      ok: false,
      error: "Choose a source or tradition before asking in Single tradition mode.",
    });
  });

  it("preserves the explicit mode in the parsed chat request", () => {
    const parsed = chatRequestSchema.parse({
      message: "Compare approaches to mercy.",
      sessionId: "test-session",
      context: {
        religion: null,
        book: null,
        chapter: null,
        persona: null,
        mode: "compare",
        selectedTraditions: ["islam", "christianity"],
      },
    });

    expect(parsed.context?.mode).toBe("compare");
    expect(parsed.context?.selectedTraditions).toEqual(["islam", "christianity"]);
  });

  it("keeps a single-tradition source request inside its selected tradition", () => {
    const result = resolveAskScope({
      mode: "single",
      selectedSources: ["quran"],
      selectedTraditions: ["islam"],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.responseMode).toBe("strict_source_grounded");
      expect(result.selectedTraditions).toEqual(["islam"]);
      expect(result.selectedSources).toEqual(["quran"]);
    }
  });

  it("rejects mixed-tradition source selections in single mode", () => {
    const result = resolveAskScope({
      mode: "single",
      selectedSources: ["quran", "bible"],
      selectedTraditions: ["islam", "christianity"],
    });

    expect(result.ok).toBe(false);
  });

  it("defaults an unspecified Compare scope to supported traditions", () => {
    const result = resolveAskScope({ mode: "compare" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.responseMode).toBe("comparative");
      expect(result.selectedTraditions).toEqual([...SUPPORTED_RELIGIONS]);
    }
  });

  it("rejects Compare when the user explicitly selects fewer than two traditions", () => {
    const result = resolveAskScope({
      mode: "compare",
      selectedTraditions: ["islam"],
    });

    expect(result.ok).toBe(false);
  });
});
