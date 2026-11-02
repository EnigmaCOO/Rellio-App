import { ScholarConfig } from "../types/scholar";
import { GroundedContext } from "../types/retrieval";
import { BASE_EPISTEMICS } from "./base";
import { traceLog } from "../server/debug/trace";

function renderCommentaryCanon(cfg: ScholarConfig): string {
  if (cfg.commentaryCanon.length === 0) return "(no formal commentary canon for this tradition)";
  return cfg.commentaryCanon
    .map(c => `- ${c.title} — ${c.author} (${c.era})${c.school ? `, ${c.school}` : ""}${c.focus ? `: ${c.focus}` : ""}`)
    .join("\n");
}

export function renderContext(ctx: GroundedContext): string {
  const focus = ctx.focusPassage.length
    ? `PASSAGE THE USER IS READING:\n` +
      ctx.focusPassage.map(p =>
        `[${p.refId}] ${p.reference}\n` +
        (p.originalText ? `  ${p.originalLang}: ${p.originalText}\n` : "") +
        `  ${p.translation} (${p.translationSource})`
      ).join("\n\n")
    : "";

  const passages = ctx.retrievedPassages.length
    ? `RELEVANT PASSAGES:\n` +
      ctx.retrievedPassages.map(p =>
        `[${p.refId}] ${p.reference}\n` +
        (p.originalText ? `  ${p.originalLang}: ${p.originalText}\n` : "") +
        `  ${p.translation} (${p.translationSource})`
      ).join("\n\n")
    : "";

  const commentary = ctx.commentary.length
    ? `COMMENTARY (cite with the exact bracket token shown):\n` +
      ctx.commentary.map(c =>
        `[${c.sourceId} on ${c.onRef}] ${c.sourceTitle} (${c.author}):\n  ${c.text}`
      ).join("\n\n")
    : `COMMENTARY: none retrieved for this passage. Reason from the scripture text itself and note this limitation explicitly.`;

  const coverage = ctx.traditionCoverage?.length
    ? `EVIDENCE COVERAGE:\n` +
      ctx.traditionCoverage.map((item) =>
        `- ${item.tradition}: ${item.scriptureCount} scripture passage(s), ${item.commentaryCount} commentary excerpt(s)` +
        (item.scriptureFailed || item.commentaryFailed ? " (retrieval failed)" : "")
      ).join("\n")
    : "";

  return [focus, passages, commentary, coverage].filter(Boolean).join("\n\n");
}

export function buildScholarSystemPrompt(cfg: ScholarConfig, ctx: GroundedContext): string {
  traceLog("builder.in_book", {
    path: "in_book",
    builder_used: "buildScholarSystemPrompt",
    scholar: cfg.displayName,
    grounded_context: {
      present: true,
      scope: ctx.scope,
      focusPassage: ctx.focusPassage.length,
      retrievedPassages: ctx.retrievedPassages.length,
      commentary: ctx.commentary.length,
      commentaryAvailable: ctx.commentaryAvailable,
      hasConversationSummary: !!ctx.conversationSummary,
    },
  });
  return `
${BASE_EPISTEMICS}

──────────────────────────────────────────
WHO YOU ARE
You are ${cfg.displayName}, ${cfg.title}.
Voice: ${cfg.voice}

THE WORKS YOU REASON FROM (cite these by name when you draw on them):
Primary scripture: ${cfg.primaryScriptureIds.join(", ")}
Commentary canon:
${renderCommentaryCanon(cfg)}
Original language(s): ${cfg.originalLanguages.map(l => l.name).join(", ")}

HOW YOU REASON
${cfg.hermeneuticMethod}
${cfg.interpretiveLevels ? `Interpretive levels: ${cfg.interpretiveLevels}` : ""}

HANDLING INTERNAL DIVERGENCE
${cfg.sectarianNote}

YOUR BOUNDARIES
${cfg.boundaries.map(b => `- ${b}`).join("\n")}

${ctx.conversationSummary ? `CONVERSATION SO FAR (for continuity):\n${ctx.conversationSummary}\n` : ""}
──────────────────────────────────────────
PROVIDED CONTEXT
${renderContext(ctx)}
──────────────────────────────────────────

Answer the user's question as ${cfg.displayName}. Open on the substance — the verse, the term, the heart of the question. Work from the passage and the named commentary above, cite as you go, quote original language only from the context, and where the tradition disagrees with itself, show that. Do not use a chapter default or infer a passage that is not listed in the provided context. ${ctx.commentaryAvailable ? "" : "Note honestly that classical commentary was not available to you for this passage."}
`.trim();
}
