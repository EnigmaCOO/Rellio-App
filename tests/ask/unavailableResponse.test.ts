import { describe, expect, it } from "vitest";
import { buildUnavailableAskResponse } from "../../server/services/askGrounding";

describe("buildUnavailableAskResponse", () => {
  it("returns an explicit failure without fabricating references", () => {
    const response = buildUnavailableAskResponse(
      "general",
      [],
      [],
      "Evidence service unavailable.",
    );

    expect(response.summary).toContain("Evidence service unavailable.");
    expect(response.references).toEqual([]);
    expect(response.limitations).toContain("Evidence service unavailable.");
  });
});
