import type { Religion } from "@shared/schema";
import { SCHOLARS } from "../../config/scholars";
import type { ScholarConfig } from "../../types/scholar";
import type {
  GroundedContext,
  ScriptureCitation,
  CommentaryExcerpt,
} from "../../types/retrieval";
import { buildScholarSystemPrompt } from "../../prompts/assemble";
import { getCommentaryForRefs, searchCommentary } from "../../lib/retrieval/commentary";
import { searchScripture, type ScriptureSearchResult } from "../../lib/retrieval/search";
import {
  validateCitations,
  parseEmittedCitations,
  type ValidationResult,
} from "../../validators/citations";
import {
  cacheCanRead,
  cacheCanWrite,
  contextCache,
  hashKey,
  normalizeQuestion,
} from "./engineCache";

export interface InBookGrounding {
  systemPrompt: string;
  ctx: GroundedContext;
}

// Map the app's religion ids (shared/schema religionSchema) onto the scholar
// configs in config/scholars.ts (keyed by ScholarId). Kept explicit because the
// schema uses "shintoism" while the scholar config's TraditionId uses "shinto".
const RELIGION_TO_SCHOLAR_ID: Record<Religion, string> = {
  christianity: "priest",
  islam: "mufti",
  judaism: "rabbi",
  hinduism: "guru",
  buddhism: "bhikkhu",
  sikhism: "granthi",
  shintoism: "kannushi",
};

// Retrieval defaults (env-overridable). Scripture/commentary `k` are kept small
// so the enriched prompt stays within the token budget; the char budget caps the
// combined commentary text fed into the prompt.
const DEFAULT_RETRIEVAL_SCRIPTURE_K = 4;
const DEFAULT_RETRIEVAL_COMMENTARY_K = 6;
const DEFAULT_RETRIEVAL_CHAR_BUDGET = 6000;
const MAX_COMMENTARY_EXCERPT_CHARS = 1500;

/**
 * Feature flag for in-book passage injection.
 * Default ON in all environments unless explicitly disabled.
 * Set IN_BOOK_PASSAGE_INJECTION to "true"/"1" or "false"/"0" to override.
 */
export function isInBookPassageInjectionEnabled(): boolean {
  const raw = process.env.IN_BOOK_PASSAGE_INJECTION;
  if (raw === undefined || raw === "") {
    return true;
  }
  return raw === "true" || raw === "1";
}

/**
 * Feature flag for in-book commentary + semantic retrieval.
 * Default ON in all environments unless explicitly disabled.
 * Set IN_BOOK_RETRIEVAL to "true"/"1" or "false"/"0" to override. When off,
 * buildInBookGrounding produces exactly the Phase-2 context (focusPassage only,
 * commentaryAvailable: false).
 */
export function isInBookRetrievalEnabled(): boolean {
  const raw = process.env.IN_BOOK_RETRIEVAL;
  if (raw === undefined || raw === "") {
    return true;
  }
  return raw === "true" || raw === "1";
}

function envPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const READER_BOOK_SOURCES: Record<string, string[]> = {
  "clear-quran": ["quran"],
  "sahih-al-bukhari": ["hadith"],
  "sahih-muslim": ["hadith"],
  "bhagavad-gita-as-it-is": ["bhagavad-gita"],
  "the-four-vedas": ["vedas"],
  "upanishads-roebuck": ["upanishads"],
  "dhammapada-carter": ["dhammapada"],
  "kjv-illustrated": ["bible", "old-testament", "new-testament"],
  "scofield-reference-bible": ["bible", "old-testament", "new-testament"],
  "psalms-vangemeren": ["bible", "old-testament"],
  tanakh: ["tanakh", "old-testament"],
  "torah-abram": ["torah"],
  talmud: ["talmud"],
  kojiki: ["kojiki"],
  "guru-granth-sahib": ["guru-granth-sahib"],
};

const CORPUS_TO_SOURCE: Record<string, string> = {
  quran: "quran",
  "bible-nt": "new-testament",
  "bible-ot": "old-testament",
  bible: "bible",
  torah: "torah",
  tanakh: "tanakh",
  "bhagavad-gita": "bhagavad-gita",
};

function normalizePassageText(value: string): string {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, "")
    .replace(/[.,;:!?'’`"“”‘’()[\]{}<>…–—-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export type PassageResolution =
  | { ok: true; passages: ScriptureCitation[]; edition: string }
  | {
      ok: false;
      reason: "selection_required" | "book_not_indexed" | "no_exact_match" | "ambiguous_match";
    };

export async function resolveCanonicalReaderPassage(
  religion: Religion,
  bookId: string,
  selectedText: string | undefined,
  search: (
    query: string,
    options: { traditions: [ScholarConfig["tradition"]]; k: number },
  ) => Promise<ScriptureSearchResult[]> = searchScripture,
): Promise<PassageResolution> {
  const selection = selectedText?.trim() ?? "";
  if (!selection) return { ok: false, reason: "selection_required" };

  const scholar = getScholarForReligion(religion);
  const allowedSources = READER_BOOK_SOURCES[bookId] ?? [];
  const allowedCorpora = Object.entries(CORPUS_TO_SOURCE)
    .filter(([, sourceId]) => allowedSources.includes(sourceId))
    .map(([corpus]) => corpus);
  if (!scholar || allowedCorpora.length === 0) {
    return { ok: false, reason: "book_not_indexed" };
  }

  const hits = await search(selection, {
    traditions: [scholar.tradition],
    k: 50,
  });
  const selectedNormalized = normalizePassageText(selection);
  if (selectedNormalized.length < 28) {
    return { ok: false, reason: "no_exact_match" };
  }

  const candidates = hits.filter((hit) => {
    const corpus = hit.refId.split(":")[0];
    if (!allowedCorpora.includes(corpus)) return false;
    const sourceTexts = [hit.translation, hit.originalText ?? ""]
      .map(normalizePassageText)
      .filter((text) => text.length >= 28);
    return sourceTexts.some((sourceText) =>
      selectedNormalized.includes(sourceText) || sourceText.includes(selectedNormalized),
    );
  });
  const unique = Array.from(new Map(candidates.map((hit) => [hit.refId, hit])).values());

  let resolved: ScriptureSearchResult[] = [];
  if (unique.length === 1) {
    resolved = unique;
  } else if (unique.length > 1) {
    const fullVerseMatches = unique.filter((hit) =>
      [hit.translation, hit.originalText ?? ""]
        .map(normalizePassageText)
        .some((sourceText) => sourceText.length >= 28 && selectedNormalized.includes(sourceText)),
    );
    const ordered = [...fullVerseMatches].sort((a, b) =>
      Number(a.verse) - Number(b.verse),
    );
    const samePassage = ordered.length === unique.length &&
      ordered.every((hit) =>
        hit.book === ordered[0].book &&
        String(hit.chapter) === String(ordered[0].chapter) &&
        hit.tradition === ordered[0].tradition,
      ) &&
      ordered.every((hit, index) =>
        index === 0 || Number(hit.verse) === Number(ordered[index - 1].verse) + 1,
      );
    if (samePassage) resolved = ordered;
  }

  if (resolved.length === 0) {
    return {
      ok: false,
      reason: unique.length > 1 ? "ambiguous_match" : "no_exact_match",
    };
  }

  const passages: ScriptureCitation[] = resolved.map((hit) => ({
    refId: hit.refId,
    tradition: hit.tradition,
    book: hit.book,
    chapter: hit.chapter,
    verse: hit.verse,
    reference: hit.reference,
    originalText: hit.originalText,
    originalLang: hit.originalLang,
    translation: hit.translation,
    translationSource: hit.translationSource,
  }));

  return {
    ok: true,
    passages,
    edition: Array.from(new Set(passages.map((passage) => passage.translationSource))).join(", "),
  };
}

export function getScholarForReligion(religion: Religion): ScholarConfig | undefined {
  const id = RELIGION_TO_SCHOLAR_ID[religion];
  return id ? SCHOLARS[id] : undefined;
}

/** The scholar id (e.g. "mufti") for a religion, used as the answer cache key. */
export function getScholarIdForReligion(religion: Religion): string | undefined {
  return RELIGION_TO_SCHOLAR_ID[religion];
}

/** Build Scholar grounding from a passage already resolved to canonical verses. */
export async function buildInBookGrounding(
  religion: Religion,
  focusPassage: ScriptureCitation[],
  conversationSummary?: string,
  message?: string,
): Promise<InBookGrounding | null> {
  const scholar = getScholarForReligion(religion);
  if (!scholar || focusPassage.length === 0) return null;

  // Layer 2 cache (ENGINE_CACHE): the retrieval-derived GroundedContext is a pure
  // function of (religion, canonical passage range, question) — it does NOT depend on the
  // conversation summary, which is folded back in fresh below. Keyed by passage +
  // normalized question so a repeated question on the same passage skips the
  // vector search.
  const focusRefIds = focusPassage.map((passage) => passage.refId);
  const ctxCacheKey = hashKey(
    "ctx:inbook",
    religion,
    focusRefIds.join(","),
    focusPassage.map((passage) => passage.translationSource).join(","),
    normalizeQuestion(message ?? ""),
  );

  let baseCtx = cacheCanRead()
    ? (contextCache.get(ctxCacheKey) as GroundedContext | undefined)
    : undefined;

  if (baseCtx) {
    console.log("🧠 in-book context cache HIT");
    const ctx: GroundedContext = { ...baseCtx, conversationSummary };
    return { systemPrompt: buildScholarSystemPrompt(scholar, ctx), ctx };
  }

  const tradition = scholar.tradition;
  let retrievedPassages: ScriptureCitation[] = [];
  let commentary: CommentaryExcerpt[] = [];
  let commentaryAvailable = false;
  let scriptureFailed = false;
  let commentaryFailed = false;

  if (isInBookRetrievalEnabled() && message?.trim()) {
    const [scriptureResult, exactCommentaryResult, semanticCommentaryResult] =
      await Promise.allSettled([
        searchScripture(message, {
          traditions: [tradition],
          k: envPositiveInt("IN_BOOK_RETRIEVAL_SCRIPTURE_K", DEFAULT_RETRIEVAL_SCRIPTURE_K),
        }),
        getCommentaryForRefs(focusRefIds, tradition),
        searchCommentary(message, {
          tradition,
          k: envPositiveInt("IN_BOOK_RETRIEVAL_COMMENTARY_K", DEFAULT_RETRIEVAL_COMMENTARY_K),
        }),
      ]);

    scriptureFailed = scriptureResult.status === "rejected";
    commentaryFailed =
      exactCommentaryResult.status === "rejected" ||
      semanticCommentaryResult.status === "rejected";

    const focusRefSet = new Set(focusRefIds);
    if (scriptureResult.status === "fulfilled") {
      retrievedPassages = scriptureResult.value
        .filter((passage) => !focusRefSet.has(passage.refId))
        .map((passage) => ({
          refId: passage.refId,
          tradition: passage.tradition,
          book: passage.book,
          chapter: passage.chapter,
          verse: passage.verse,
          reference: passage.reference,
          originalText: passage.originalText,
          originalLang: passage.originalLang,
          translation: passage.translation,
          translationSource: passage.translationSource,
        }));
    }

    const exactCommentary = exactCommentaryResult.status === "fulfilled"
      ? exactCommentaryResult.value
      : [];
    const semanticCommentary = semanticCommentaryResult.status === "fulfilled"
      ? semanticCommentaryResult.value
      : [];
    const merged: CommentaryExcerpt[] = [];
    const seen = new Set<string>();
    let budget = envPositiveInt("IN_BOOK_RETRIEVAL_CHAR_BUDGET", DEFAULT_RETRIEVAL_CHAR_BUDGET);
    for (const excerpt of [...exactCommentary, ...semanticCommentary]) {
      const text = excerpt.text.length > MAX_COMMENTARY_EXCERPT_CHARS
        ? excerpt.text.slice(0, MAX_COMMENTARY_EXCERPT_CHARS)
        : excerpt.text;
      const key = `${excerpt.sourceId}|${excerpt.onRef}|${text.slice(0, 80)}`;
      if (seen.has(key)) continue;
      if (text.length > budget) break;
      seen.add(key);
      budget -= text.length;
      merged.push({ ...excerpt, text, tradition });
    }
    commentary = merged;
    commentaryAvailable = merged.length > 0;
  }

  // The summary-free base context is what gets cached (Layer 2). The current
  // conversation summary is layered on afterwards so cache entries are shared
  // across conversations on the same passage/question.
  baseCtx = {
    scope: "in_book",
    tradition,
    traditionsInScope: [tradition],
    focusPassage,
    retrievedPassages,
    commentary,
    commentaryAvailable,
    traditionCoverage: [{
      tradition,
      scriptureCount: focusPassage.length + retrievedPassages.length,
      commentaryCount: commentary.length,
      scriptureFailed,
      commentaryFailed,
    }],
  };
  if (cacheCanWrite() && !scriptureFailed && !commentaryFailed) {
    contextCache.set(ctxCacheKey, baseCtx);
  }

  const ctx: GroundedContext = { ...baseCtx, conversationSummary };

  return { systemPrompt: buildScholarSystemPrompt(scholar, ctx), ctx };
}

export interface GroundedInBookResult {
  answer: string;
  validation: ValidationResult;
  regenerated: boolean;
}

/**
 * Generate a grounded in-book answer with citation validation and a single
 * regeneration retry.
 *
 * 1. Generate with the grounded system prompt.
 * 2. Parse emitted [refId] citations and validate against the GroundedContext.
 * 3. If validation fails, regenerate EXACTLY ONCE with the issues appended to
 *    the prompt ("The following citations were not in the provided context;
 *    remove or correct them: ...").
 * 4. If it still fails, return the (regenerated) answer with unverified
 *    citations flagged in the returned ValidationResult.
 *
 * `generate` is injected so the caller wires it to the real provider factory,
 * and so the retry behavior is unit-testable with a mock generator.
 */
export async function generateGroundedInBookAnswer(
  ctx: GroundedContext,
  systemPrompt: string,
  generate: (systemPrompt: string) => Promise<string>,
): Promise<GroundedInBookResult> {
  const first = await generate(systemPrompt);
  const firstValidation = validateCitations(parseEmittedCitations(first), ctx, first, {
    requireCitation: true,
  });

  if (firstValidation.ok) {
    console.log("📖 citation grounding PASSED (first pass)");
    return { answer: first, validation: firstValidation, regenerated: false };
  }

  console.warn(
    "📖 citation grounding FAILED (first pass) — regenerating once:",
    firstValidation.issues,
  );

  const retryPrompt =
    `${systemPrompt}\n\n` +
    `──────────────────────────────────────────\n` +
    `CITATION CORRECTION REQUIRED\n` +
    `The following citations were not in the provided context; remove or correct them:\n` +
    firstValidation.issues.map((i) => `- ${i}`).join("\n");

  const second = await generate(retryPrompt);
  const secondValidation = validateCitations(parseEmittedCitations(second), ctx, second, {
    requireCitation: true,
  });

  if (secondValidation.ok) {
    console.log("📖 citation grounding PASSED after one regeneration");
  } else {
    console.warn(
      "📖 citation grounding STILL FAILED after one regeneration — returning answer with unverified citations flagged:",
      secondValidation.issues,
    );
  }

  return { answer: second, validation: secondValidation, regenerated: true };
}
