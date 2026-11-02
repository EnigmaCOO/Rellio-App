import { describe, expect, it, vi } from "vitest";
import { retrievePerTradition } from "../../server/services/askGrounding";
import type { TraditionId } from "../../types/scholars";

describe("retrievePerTradition", () => {
  it("runs an independent retrieval for each tradition and preserves partial failures", async () => {
    const requested: TraditionId[] = ["islam", "christianity", "judaism"];
    const search = vi.fn(async (tradition: TraditionId) => {
      if (tradition === "judaism") throw new Error("temporary retrieval failure");
      return [`evidence:${tradition}`];
    });

    const result = await retrievePerTradition(requested, search);

    expect(search).toHaveBeenCalledTimes(requested.length);
    expect(search.mock.calls.map(([tradition]) => tradition)).toEqual(requested);
    expect(result.hits).toEqual(["evidence:islam", "evidence:christianity"]);
    expect(result.failedTraditions).toEqual(["judaism"]);
  });
});
