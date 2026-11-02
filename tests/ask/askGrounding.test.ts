import { describe, it, expect } from "vitest";
import type { GroundedContext } from "../../types/retrieval";
import { renderContext } from "../../prompts/assemble";
import { buildAskSystemPrompt } from "../../prompts/askBuilder";
import {
  generateGroundedAskAnswer,
  mapToStructuredResponse,
} from "../../server/services/askGrounding";

function makeCtx(): GroundedContext {
  return {
    scope: "ask_source_grounded",
    tradition: "islam",
    traditionsInScope: ["islam"],
    focusPassage: [],
    retrievedPassages: [
      {
        refId: "quran:2:255",
        tradition: "islam",
        book: "Al-Baqarah",
        chapter: 2,
        verse: 255,
        reference: "Al-Baqarah 2:255",
        translation: "Allah - there is no deity except Him, the Ever-Living...",
        translationSource: "Asad",
      },
      {
        refId: "quran:112:1",
        tradition: "islam",
        book: "Al-Ikhlas",
        chapter: 112,
        verse: 1,
        reference: "Al-Ikhlas 112:1",
        translation: "Say, He is Allah, [who is] One.",
        translationSource: "Asad",
      },
    ],
    commentary: [],
    commentaryAvailable: false,
  };
}

describe("buildAskSystemPrompt", () => {
  it("embeds the mode instruction, the JSON contract, and the rendered context", () => {
    const ctx = makeCtx();
    const prompt = buildAskSystemPrompt("strict_source_grounded", ctx, renderContext);
    expect(prompt).toContain("MODE: strict_source_grounded");
    expect(prompt).toContain("Answer ONLY from the selected tradition");
    expect(prompt).toContain('"mode": "strict_source_grounded"');
    // Retrieved passage refId must appear in the prompt (real grounding context).
    expect(prompt).toContain("[quran:2:255]");
  });

  it("uses the comparative instruction for comparative mode", () => {
    const prompt = buildAskSystemPrompt("comparative", makeCtx(), renderContext);
    expect(prompt).toContain("MODE: comparative");
    expect(prompt).toContain("tradition_view");
  });
});

describe("generateGroundedAskAnswer", () => {
  it("passes on the first try when every cited refId is in context", async () => {
    const ctx = makeCtx();
    const json = JSON.stringify({
      mode: "strict_source_grounded",
      summary: "God is one [quran:112:1].",
      sections: [{ type: "direct_answer", heading: "Answer", body: "See [quran:2:255]." }],
    });
    const result = await generateGroundedAskAnswer(ctx, "sys", "q", async () => json);
    expect(result.validation.ok).toBe(true);
    expect(result.regenerated).toBe(false);
  });

  it("regenerates once when a hallucinated refId is cited", async () => {
    const ctx = makeCtx();
    const bad = JSON.stringify({
      summary: "From [bible:John:3:16].",
      sections: [{ type: "direct_answer", heading: "Answer", body: "[bible:John:3:16]" }],
    });
    const good = JSON.stringify({
      summary: "From [quran:2:255].",
      sections: [{ type: "direct_answer", heading: "Answer", body: "[quran:2:255]" }],
    });
    let calls = 0;
    const result = await generateGroundedAskAnswer(ctx, "sys", "q", async () => {
      calls += 1;
      return calls === 1 ? bad : good;
    });
    expect(calls).toBe(2);
    expect(result.regenerated).toBe(true);
    expect(result.validation.ok).toBe(true);
  });
});

describe("mapToStructuredResponse", () => {
  it("rebuilds references from real retrieved passages, not the model output", () => {
    const ctx = makeCtx();
    const modelJson = JSON.stringify({
      mode: "strict_source_grounded",
      summary: "Answer.",
      sections: [{ type: "direct_answer", heading: "Answer", body: "Body [quran:2:255]." }],
      // A hallucinated reference the model tried to sneak in — must be ignored.
      references: [{ tradition: "Christianity", source: "Bible", citation: "John 3:16", text: "fake" }],
      followups: ["Ask more"],
    });
    const out = mapToStructuredResponse(
      modelJson,
      "strict_source_grounded",
      ["quran"],
      ctx,
      ["quran:2:255"],
    );
    // References resolve to the verified retrieved passage only.
    expect(out.references).toHaveLength(1);
    expect(out.references[0].source).toBe("Quran");
    expect(out.references[0].citation).toBe("Al-Baqarah 2:255");
    expect(out.references.some((r) => r.source === "Bible")).toBe(false);
    expect(out.meta.grounded).toBe(true);
  });

  it("falls back to all retrieved passages when nothing was verifiably cited", () => {
    const ctx = makeCtx();
    const modelJson = JSON.stringify({
      summary: "Answer with no inline citations.",
      sections: [{ type: "direct_answer", heading: "Answer", body: "No citations here." }],
    });
    const out = mapToStructuredResponse("" + modelJson, "general", [], ctx, []);
    expect(out.references).toHaveLength(2);
    expect(out.meta.grounded).toBe(false);
  });
});
