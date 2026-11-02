import { describe, expect, it } from "vitest";
import { routeResponseMode } from "../../server/services/responseModeRouter";

describe("routeResponseMode", () => {
  it("keeps a single-tradition question single even when the wording says compare", () => {
    expect(
      routeResponseMode({
        message: "Compare Islam and Christianity",
        selectedSources: ["quran"],
        selectedTraditions: ["islam"],
        explicitMode: "single",
      }),
    ).toBe("strict_source_grounded");
  });

  it("honors explicit Compare mode without relying on prompt wording", () => {
    expect(
      routeResponseMode({
        message: "How does mercy work?",
        selectedSources: [],
        selectedTraditions: ["islam", "christianity"],
        explicitMode: "compare",
      }),
    ).toBe("comparative");
  });

  it("uses general mode when no source scope is selected", () => {
    expect(
      routeResponseMode({
        message: "What do religions teach about mercy?",
        selectedSources: [],
        selectedTraditions: [],
      }),
    ).toBe("general");
  });
});
