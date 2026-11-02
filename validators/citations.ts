import type { GroundedContext } from "../types/retrieval";
import type { GroundedCitation } from "../types/answer";

/**
 * The kinds of grounding failure the validator can detect. Logged structurally
 * (see `logGroundingFailures`) so failures can be reviewed across pipelines.
 */
export type GroundingFailureType =
  | "hallucinated_citation"      // a [refId] not present in the retrieved context
  | "quote_mismatch"             // quotedText doesn't match the canonical text
  | "unknown_commentary_source"  // a commentary attribution whose sourceId isn't in context
  | "ungrounded_original_quote"  // an original-language quote not present in the context
  | "missing_citation"
  | "tradition_misattribution";

export interface GroundingFailure {
  type: GroundingFailureType;
  refId?: string;  // the offending refId / commentary sourceId / quoted snippet
  detail: string;  // human-readable description
}

export interface ValidationResult {
  ok: boolean;
  issues: string[];               // human-readable messages (one per failure)
  failures: GroundingFailure[];   // structured failures (type + refId)
  citations: GroundedCitation[];  // with `verified` set
}

function normalizeQuote(value: string): string {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/[.,;:!?'()"“”‘’()[\]{}<>…–—-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Exact phrase containment after normalizing case, Unicode composition,
 * diacritics, punctuation, and whitespace. This intentionally does not accept
 * approximate paraphrases as quotations.
 */
export function fuzzyContains(haystack: string, needle: string): boolean {
  const normalizedNeedle = normalizeQuote(needle);
  return normalizedNeedle.length > 0 && normalizeQuote(haystack).includes(normalizedNeedle);
}

// Unicode ranges for the original languages the scholars quote (Arabic, Hebrew,
// Devanagari/Sanskrit, Gurmukhi, and Japanese/Kanbun). Used to find verbatim
// original-language runs the model emitted so they can be checked against the
// retrieved context.
const ORIGINAL_SCRIPT_CLASS =
  "\u0590-\u05FF" + // Hebrew
  "\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF" + // Arabic (+ supplements/forms)
  "\u0900-\u097F" + // Devanagari
  "\u0A00-\u0A7F" + // Gurmukhi
  "\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF"; // Hiragana, Katakana, CJK

const ORIGINAL_RUN_RE = new RegExp(
  `[${ORIGINAL_SCRIPT_CLASS}]+(?:\\s+[${ORIGINAL_SCRIPT_CLASS}]+)*`,
  "g",
);

// A commentary attribution in the rendered context looks like
// `[<sourceId> on <onRef>]` (see prompts/assemble.ts). Capture the sourceId.
const COMMENTARY_ATTR_RE = /\[([^\[\]]+?)\s+on\s+[^\[\]]+\]/g;

function stripWhitespace(s: string): string {
  return s.replace(/\s+/g, "");
}

function answerBodyText(answerText: string): string {
  try {
    const parsed: unknown = JSON.parse(answerText);
    if (parsed && typeof parsed === "object") {
      const response = parsed as {
        summary?: unknown;
        sections?: Array<{ body?: unknown }>;
      };
      const sections = Array.isArray(response.sections) ? response.sections : [];
      return [
        typeof response.summary === "string" ? response.summary : "",
        ...sections.map((section) => typeof section.body === "string" ? section.body : ""),
      ].join("\n");
    }
  } catch {
    // The in-book Scholar is prose rather than structured JSON.
  }
  return answerText;
}

function extractQuotedPhrases(text: string): string[] {
  const phrases: string[] = [];
  const seen = new Set<string>();
  const quotePattern = /"([^"\n]{8,500})"|“([^”\n]{8,500})”|‘([^’\n]{8,500})’/g;
  let match: RegExpExecArray | null;
  while ((match = quotePattern.exec(text)) !== null) {
    const phrase = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    const normalized = normalizeQuote(phrase);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    phrases.push(phrase);
  }
  return phrases;
}

/** Parse `[<sourceId> on <onRef>]` commentary attributions out of model prose. */
export function parseCommentaryAttributions(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  COMMENTARY_ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = COMMENTARY_ATTR_RE.exec(text)) !== null) {
    const sourceId = m[1].trim();
    if (!sourceId || seen.has(sourceId)) continue;
    seen.add(sourceId);
    out.push(sourceId);
  }
  return out;
}

/** Extract verbatim original-language runs (>= 2 script chars) from model prose. */
export function parseOriginalLanguageQuotes(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  ORIGINAL_RUN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ORIGINAL_RUN_RE.exec(text)) !== null) {
    const run = m[0].trim();
    if (stripWhitespace(run).length < 2) continue; // skip stray single glyphs/diacritics
    if (seen.has(run)) continue;
    seen.add(run);
    out.push(run);
  }
  return out;
}

/**
 * Emit a structured log line per grounding failure (type, refId, mode) for
 * later review. `mode` is the retrieval scope (e.g. "in_book", "ask_comparative").
 */
export function logGroundingFailures(
  failures: GroundingFailure[],
  mode: string,
): void {
  for (const f of failures) {
    console.warn(
      `⚠️ grounding-failure ${JSON.stringify({
        type: f.type,
        refId: f.refId ?? null,
        mode,
        detail: f.detail,
      })}`,
    );
  }
}

export function validateCitations(
  emitted: GroundedCitation[],
  ctx: GroundedContext,
  answerText?: string,
  options: { requireCitation?: boolean } = {},
): ValidationResult {
  const known = new Set([
    ...ctx.focusPassage.map((p) => p.refId),
    ...ctx.retrievedPassages.map((p) => p.refId),
  ]);
  const knownSources = new Set(ctx.commentary.map((c) => c.sourceId));
  const answerTextForValidation = answerText ? answerBodyText(answerText) : "";
  const failures: GroundingFailure[] = [];

  const citations = emitted.map((c) => {
    const exists = known.has(c.refId);
    if (!exists)
      failures.push({
        type: "hallucinated_citation",
        refId: c.refId,
        detail: `Hallucinated citation: ${c.refId} is not in the retrieved context.`,
      });

    // Verify any explicitly supplied quote against the exact retrieved source text.
    let textOk = true;
    if (exists && c.quotedText) {
      const src = [...ctx.focusPassage, ...ctx.retrievedPassages].find(
        (p) => p.refId === c.refId,
      );
      const hay = `${src?.translation ?? ""} ${src?.originalText ?? ""}`.toLowerCase();
      textOk = fuzzyContains(hay, c.quotedText.toLowerCase());
      if (!textOk)
        failures.push({
          type: "quote_mismatch",
          refId: c.refId,
          detail: `Quote for ${c.refId} does not match canonical text (possible paraphrase-from-memory).`,
        });
    }
    return { ...c, verified: exists && textOk };
  });

  const hasVerifiedAttribution =
    emitted.some((citation) => known.has(citation.refId)) ||
    parseCommentaryAttributions(answerTextForValidation).some((sourceId) => knownSources.has(sourceId));
  if (options.requireCitation && (known.size > 0 || knownSources.size > 0) && !hasVerifiedAttribution) {
    failures.push({
      type: "missing_citation",
      detail: "The answer did not include a citation to the provided evidence.",
    });
  }

  // (a) Commentary attributions: every cited sourceId must be in the context.
  if (answerText) {
    const quoteHaystack = [
      ...ctx.focusPassage.map((p) => p.translation),
      ...ctx.focusPassage.map((p) => p.originalText ?? ""),
      ...ctx.retrievedPassages.map((p) => p.translation),
      ...ctx.retrievedPassages.map((p) => p.originalText ?? ""),
      ...ctx.commentary.map((c) => c.text),
    ].join(" ");
    for (const quote of extractQuotedPhrases(answerTextForValidation)) {
      if (!fuzzyContains(quoteHaystack, quote)) {
        failures.push({
          type: "quote_mismatch",
          refId: quote,
          detail: `Quoted text "${quote}" does not exactly match any retrieved source.`,
        });
      }
    }

    for (const sourceId of parseCommentaryAttributions(answerTextForValidation)) {
      if (!knownSources.has(sourceId)) {
        failures.push({
          type: "unknown_commentary_source",
          refId: sourceId,
          detail: `Commentary attribution "${sourceId}" is not in the retrieved context.`,
        });
      }
    }

    // (b) Original-language quotes: every verbatim run must be present in context.
    const originalHaystack = stripWhitespace(
      [
        ...ctx.focusPassage.map((p) => p.originalText ?? ""),
        ...ctx.retrievedPassages.map((p) => p.originalText ?? ""),
        ...ctx.commentary.map((c) => c.text),
      ].join(" "),
    );
    for (const quote of parseOriginalLanguageQuotes(answerTextForValidation)) {
      if (!originalHaystack.includes(stripWhitespace(quote))) {
        failures.push({
          type: "ungrounded_original_quote",
          refId: quote,
          detail: `Original-language quote "${quote}" is not present in the retrieved context.`,
        });
      }
    }
  }

  if (failures.length > 0) logGroundingFailures(failures, ctx.scope);

  return {
    ok: failures.length === 0,
    issues: failures.map((f) => f.detail),
    failures,
    citations,
  };
}

/**
 * Feature flag for the citation grounding + single-regeneration-retry loop.
 * Default ON in development; OFF in production unless explicitly enabled.
 * Set CITATION_VALIDATION to "true"/"1" or "false"/"0" to override.
 */
export function isCitationValidationEnabled(): boolean {
  const raw = process.env.CITATION_VALIDATION;
  if (raw === undefined || raw === "") {
    return true;
  }
  return raw === "true" || raw === "1";
}

const CITATION_REF_RE = /\[([^\[\]]+)\]/g;

/**
 * Extract the inline `[refId]` citations the model emitted in its prose.
 * Only bracketed tokens that contain a colon are treated as refIds (matching
 * the citation format the prompt instructs, e.g. `[bible:John:3:16]`).
 * Commentary attributions (`[sourceId on onRef]`) are skipped here — they are
 * handled separately by `parseCommentaryAttributions`.
 */
export function parseEmittedCitations(text: string): GroundedCitation[] {
  const seen = new Set<string>();
  const out: GroundedCitation[] = [];
  CITATION_REF_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CITATION_REF_RE.exec(text)) !== null) {
    const refId = m[1].trim();
    if (!refId.includes(":")) continue;
    if (/\s+on\s+/.test(refId)) continue; // commentary attribution, not a scripture refId
    if (seen.has(refId)) continue;
    seen.add(refId);
    out.push({ refId, reference: refId, verified: false });
  }
  return out;
}
