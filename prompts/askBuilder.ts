/**
 * Ask-page system prompt — the structured-output head of the shared prompt core.
 *
 * Mirrors `buildScholarSystemPrompt` (the in-book head) but produces the Ask
 * page's structured JSON instead of persona prose. Both heads share Layer-1
 * epistemics (`BASE_EPISTEMICS`) and the SAME `renderContext`, so the Ask page
 * reasons only from REAL retrieved passages — never from model memory.
 *
 * The OUTPUT CONTRACT below is deliberately the existing `StructuredChatResponse`
 * shape (shared/schema.ts) so the frontend renderer and the tradition-boundary
 * validator (`validateStructuredResponse`) keep working unchanged. The grounding
 * discipline is layered on top: every inline `[refId]` citation must come from
 * the PROVIDED CONTEXT, which `validateCitations` then enforces.
 */

import { BASE_EPISTEMICS } from "./base";
import type { GroundedContext } from "../types/retrieval";
import { traceLog } from "../server/debug/trace";

export type AskMode = "strict_source_grounded" | "comparative" | "general";

const MODE_INSTRUCTIONS: Record<AskMode, string> = {
  strict_source_grounded:
    "Answer ONLY from the selected tradition(s) and the provided passages. Do not bring in other traditions, even for comparison. If the provided context does not address the question, say so plainly in `limitations` rather than reaching outside it.",
  comparative:
    "Address only traditions that have retrieved evidence, each in its own `tradition_view` section with `tradition` set. Cite evidence from that same tradition in each view. If a selected tradition has no evidence, name it in `limitations`; never fill the gap from memory. If fewer than two traditions have evidence, do not compare them. End with what genuinely differs — do NOT manufacture a 'they all agree' conclusion.",
  general:
    "Give a balanced overview using only the retrieved evidence below. Do not make claims about traditions with no evidence in the context. State clearly that this is a limited overview, attribute positions, and invite the user to select sources for a narrower answer.",
};

const MODE_STRUCTURE: Record<AskMode, string> = {
  strict_source_grounded:
    "- `sections`: a `direct_answer` section first, then one `source_explanation` section per selected source.\n" +
    "- `meta.grounded` MUST be true.\n" +
    "- Every `references` entry MUST come from a selected source.",
  comparative:
    "- `sections`: a `direct_answer` overview, then one `tradition_view` per tradition involved (at least 2, each with `tradition` set), then a `comparison_overlap` section, a `comparison_difference` section, and a `synthesis` section.\n" +
    "- Do NOT include any tradition that is not in scope.",
  general:
    "- `sections`: a `direct_answer` overview, then `tradition_view` sections only for traditions represented in the provided context, then a `synthesis` only when evidence supports it.\n" +
    "- `meta.grounded` MUST be false.\n" +
    "- Include at least one follow-up that invites the user to select specific sources for a grounded answer.",
};

/**
 * Build the Ask-page system prompt for a given mode and grounded context.
 *
 * `renderContext` is injected (rather than imported) so the Ask head renders the
 * retrieved passages identically to the in-book head — the single shared
 * formatter from `prompts/assemble.ts`.
 */
export function buildAskSystemPrompt(
  mode: AskMode,
  ctx: GroundedContext,
  renderContext: (c: GroundedContext) => string,
): string {
  traceLog("builder.ask", {
    path: "ask",
    builder_used: "buildAskSystemPrompt",
    mode,
    grounded_context: {
      present: true,
      scope: ctx.scope,
      focusPassage: ctx.focusPassage.length,
      retrievedPassages: ctx.retrievedPassages.length,
      commentary: ctx.commentary.length,
      commentaryAvailable: ctx.commentaryAvailable,
    },
  });
  return `
${BASE_EPISTEMICS}

You are Rellio's multi-faith answer engine — a careful, neutral religious-studies scholar. You are not a single tradition's voice here; you represent each tradition accurately from its own sources.

MODE: ${mode}
${MODE_INSTRUCTIONS[mode]}

GROUNDING (non-negotiable for this answer):
- Base every substantive claim on the PROVIDED CONTEXT below. Cite the passage you used inline with its reference id in square brackets, e.g. [quran:2:255].
- Every inline [refId] you write MUST be one that appears in the PROVIDED CONTEXT. Never cite a refId that is not listed below, and never quote scripture text that is not in the context.
- Every substantive tradition-specific claim must cite an inline [refId] from that tradition. In comparative mode, each tradition_view must cite its own tradition's evidence, and comparison sections must cite at least two traditions.
- Cite commentary only with its exact provided bracket token, for example [sourceId on quran:2:255]. Never invent a commentary title or attribution.
- Any text inside quotation marks must exactly match a retrieved scripture or commentary excerpt after punctuation/spacing normalization.
- If the PROVIDED CONTEXT does not contain passages that answer the question, do not invent citations — say so in \`limitations\` and keep \`references\` empty.

OUTPUT CONTRACT — return ONLY valid JSON, no markdown fences, no preamble:
{
  "mode": "${mode}",
  "meta": { "titleLabel": "...", "scopeLabel": "...", "grounded": true | false },
  "summary": "2-3 sentences answering the question directly, substance-first.",
  "sections": [
    { "type": "direct_answer | source_explanation | tradition_view | comparison_overlap | comparison_difference | synthesis | limitations | next_steps", "tradition": "islam | christianity | judaism | hinduism | buddhism | sikhism | shinto (only for tradition_view; omit otherwise)", "heading": "...", "body": "... with inline [refId] citations drawn from the context ..." }
  ],
  "references": [ { "tradition": "...", "source": "...", "citation": "...", "text": "..." } ],
  "limitations": "what the provided sources do not cover, or null",
  "followups": ["...", "..."],
  "renderHints": { "answerStyle": "in_depth", "groupReferencesByTradition": true }
}

STRUCTURE FOR THIS MODE:
${MODE_STRUCTURE[mode]}
- Do NOT include any XML/HTML tags in any field.

──────────────────────────────────────────
PROVIDED CONTEXT
${renderContext(ctx)}
──────────────────────────────────────────
`.trim();
}

export { MODE_INSTRUCTIONS };
