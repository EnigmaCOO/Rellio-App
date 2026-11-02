/**
 * Grounded Ask engine — the wiring that turns the Ask page (home chat) from a
 * memory-trusting answerer into a retrieval-grounded one.
 *
 * Pipeline (mirrors the in-book Scholar's grounding, with the structured Ask
 * head instead of persona prose):
 *   query + mode + selected sources/traditions
 *     -> scope a vector search by the selected traditions/sources
 *     -> assemble a GroundedContext of REAL retrieved passages (+ commentary)
 *     -> buildAskSystemPrompt(mode, ctx, renderContext)   [shared prompt core]
 *     -> generate JSON via ASK_MODEL (Gemini)
 *     -> parse inline [refId] citations + validateCitations (single regen retry)
 *     -> map to the existing StructuredChatResponse shape, with `references`
 *        rebuilt from the actually-retrieved passages so they always resolve to
 *        real text rather than model recall.
 *
 * Gated behind ASK_GROUNDED (default ON in dev). When the flag is off — or when
 * this path throws — the caller keeps the legacy Ask builders fully reachable.
 */

import type {
  ResponseMode,
  ResponseMeta,
  ResponseSection,
  ResponseSectionType,
  ResponseReference,
  StructuredChatResponse,
} from "@shared/schema";
import type {
  GroundedContext,
  ScriptureCitation,
  CommentaryExcerpt,
} from "../../types/retrieval";
import type { TraditionId } from "../../types/scholar";
import { renderContext } from "../../prompts/assemble";
import { buildAskSystemPrompt, type AskMode } from "../../prompts/askBuilder";
import { searchByVector } from "../../lib/retrieval/search";
import { searchCommentaryByVector } from "../../lib/retrieval/commentary";
import { embedText } from "./embeddings";
import {
  validateCitations,
  parseEmittedCitations,
  parseCommentaryAttributions,
  type ValidationResult,
} from "../../validators/citations";
import { generateAskJson } from "./askModel";
import {
  cacheCanRead,
  cacheCanWrite,
  contextCache,
  hashKey,
  normalizeQuestion,
} from "./engineCache";

/**
 * Feature flag for the grounded Ask pipeline.
 * Default ON in all environments; explicit false disables the grounded path.
 * Set ASK_GROUNDED to "true"/"1" or "false"/"0" to override.
 */
export function isAskGroundedEnabled(): boolean {
  const raw = process.env.ASK_GROUNDED;
  if (raw === undefined || raw === "") {
    return true;
  }
  return raw === "true" || raw === "1";
}

// The Ask page sends tradition ids drawn from source.religion (shared schema
// religionSchema), which uses "shintoism"; the retrieval store / TraditionId use
// "shinto". Everything else maps 1:1.
const RELIGION_TO_TRADITION: Record<string, TraditionId> = {
  islam: "islam",
  christianity: "christianity",
  judaism: "judaism",
  hinduism: "hinduism",
  buddhism: "buddhism",
  sikhism: "sikhism",
  shintoism: "shinto",
  shinto: "shinto",
};

const TRADITION_DISPLAY: Record<TraditionId, string> = {
  islam: "Islam",
  christianity: "Christianity",
  judaism: "Judaism",
  hinduism: "Hinduism",
  buddhism: "Buddhism",
  sikhism: "Sikhism",
  shinto: "Shinto",
};

const ALL_TRADITIONS: TraditionId[] = [
  "islam",
  "christianity",
  "judaism",
  "hinduism",
  "buddhism",
  "shinto",
  "sikhism",
];

// Map a stored scripture refId's corpus prefix (the segment before the first
// colon, e.g. "quran" in "quran:2:255") onto the bookshelf source id + a display
// label. Only the Quran is ingested today; the rest are declared so that, as
// corpora are added, references stay inside the user's selected sources.
const CORPUS_TO_SOURCE: Record<string, { id: string; label: string }> = {
  quran: { id: "quran", label: "Quran" },
  "bible-nt": { id: "new-testament", label: "New Testament" },
  "bible-ot": { id: "old-testament", label: "Old Testament" },
  bible: { id: "bible", label: "Bible" },
  torah: { id: "torah", label: "Torah" },
  tanakh: { id: "tanakh", label: "Tanakh" },
  "bhagavad-gita": { id: "bhagavad-gita", label: "Bhagavad Gita" },
};

const VALID_SECTION_TYPES: ReadonlySet<ResponseSectionType> = new Set<ResponseSectionType>([
  "direct_answer",
  "source_explanation",
  "tradition_view",
  "comparison_overlap",
  "comparison_difference",
  "synthesis",
  "limitations",
  "next_steps",
]);

// Retrieval budget (env-overridable). Kept small so the grounded prompt stays
// within a sane token budget.
const DEFAULT_ASK_SCRIPTURE_K = 6;
const DEFAULT_ASK_COMMENTARY_K = 3;
const DEFAULT_ASK_CHAR_BUDGET = 6000;
const MAX_COMMENTARY_EXCERPT_CHARS = 1500;

function envPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function stripXmlTags(text: string): string {
  return text.replace(/<\/?[a-zA-Z][^>]*>/g, "");
}

function corpusOf(refId: string): string {
  const idx = refId.indexOf(":");
  return idx === -1 ? refId : refId.slice(0, idx);
}

export function sourceIsSelected(corpus: string, selectedSources: Set<string>): boolean {
  const source = CORPUS_TO_SOURCE[corpus];
  if (!source) return false;
  if (selectedSources.has(source.id)) return true;
  return (source.id === "old-testament" || source.id === "new-testament") &&
    selectedSources.has("bible");
}

/** Map a selected source id list onto the TraditionId values for retrieval. */
function traditionsFromSelection(selectedTraditions: string[]): TraditionId[] {
  const out = new Set<TraditionId>();
  for (const t of selectedTraditions) {
    const mapped = RELIGION_TO_TRADITION[t.trim().toLowerCase()];
    if (mapped) out.add(mapped);
  }
  return Array.from(out);
}

function scopeForMode(mode: ResponseMode): GroundedContext["scope"] {
  if (mode === "comparative") return "ask_comparative";
  if (mode === "general") return "ask_general";
  return "ask_source_grounded";
}

export interface AskGrounding {
  systemPrompt: string;
  ctx: GroundedContext;
}

export async function retrievePerTradition<T>(
  traditions: TraditionId[],
  search: (tradition: TraditionId) => Promise<T[]>,
): Promise<{ hits: T[]; failedTraditions: TraditionId[] }> {
  const results = await Promise.all(
    traditions.map(async (tradition) => {
      try {
        return { tradition, hits: await search(tradition), failed: false };
      } catch (error) {
        console.error(`Ask retrieval failed for tradition ${tradition}:`, error);
        return { tradition, hits: [] as T[], failed: true };
      }
    }),
  );

  return {
    hits: results.flatMap((result) => result.hits),
    failedTraditions: results.filter((result) => result.failed).map((result) => result.tradition),
  };
}

/**
 * Retrieve real passages (+ commentary) scoped to the selection and assemble the
 * GroundedContext + the Ask system prompt. Retrieval failures (e.g. embedding
 * provider down) are recorded as missing coverage; the caller must not answer
 * from model memory when no usable evidence remains.
 */
export async function buildAskGrounding(
  message: string,
  mode: ResponseMode,
  selectedSources: string[],
  selectedTraditions: string[],
): Promise<AskGrounding> {
  const selectedTraditionScope = traditionsFromSelection(selectedTraditions);
  const traditionsInScope =
    mode === "general" || (mode === "comparative" && selectedTraditionScope.length === 0)
      ? ALL_TRADITIONS
      : selectedTraditionScope;
  const selectedSourceSet = new Set(selectedSources.map((s) => s.trim().toLowerCase()));

  // Layer 2 cache (ENGINE_CACHE): the GroundedContext is a pure function of
  // (mode, selected sources, selected traditions, question). The system prompt is
  // rebuilt fresh from the cached context. Keys use the normalized, sorted
  // selection so order-only differences share an entry.
  const ctxCacheKey = hashKey(
    "ctx:ask",
    mode,
    Array.from(selectedSourceSet).sort().join(","),
    [...traditionsInScope].sort().join(","),
    normalizeQuestion(message),
  );

  const cachedCtx = cacheCanRead()
    ? (contextCache.get(ctxCacheKey) as GroundedContext | undefined)
    : undefined;
  if (cachedCtx) {
    console.log("🧠 Ask context cache HIT");
    return {
      systemPrompt: buildAskSystemPrompt(mode as AskMode, cachedCtx, renderContext),
      ctx: cachedCtx,
    };
  }

  let retrievedPassages: ScriptureCitation[] = [];
  let commentary: CommentaryExcerpt[] = [];
  let commentaryAvailable = false;
  let scriptureFailedTraditions: TraditionId[] = [];
  let commentaryFailedTraditions: TraditionId[] = [];

  if (message.trim()) {
    const queryVector = await embedText(message);
    const scriptureResult = await retrievePerTradition(
      traditionsInScope,
      (tradition) =>
        searchByVector(queryVector, {
          traditions: [tradition],
          k: envPositiveInt("ASK_RETRIEVAL_SCRIPTURE_K", DEFAULT_ASK_SCRIPTURE_K),
        }),
    );
    scriptureFailedTraditions = scriptureResult.failedTraditions;

    // In source-scoped mode, tradition filtering is not sufficient: a user who
    // selected Hadith must not receive a Quran passage from the same tradition.
    const filteredScripture = selectedSourceSet.size > 0
      ? scriptureResult.hits.filter((passage) =>
          sourceIsSelected(corpusOf(passage.refId), selectedSourceSet),
        )
      : scriptureResult.hits;
    retrievedPassages = filteredScripture.map((passage) => ({
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

    const commentaryResults = await Promise.all(
      traditionsInScope.map(async (tradition) => {
        try {
          return {
            tradition,
            excerpts: await searchCommentaryByVector(queryVector, {
              tradition,
              k: envPositiveInt("ASK_RETRIEVAL_COMMENTARY_K", DEFAULT_ASK_COMMENTARY_K),
            }),
            failed: false,
          };
        } catch (error) {
          console.error(`Ask commentary retrieval failed for ${tradition}:`, error);
          return { tradition, excerpts: [], failed: true };
        }
      }),
    );
    commentaryFailedTraditions = commentaryResults
      .filter((result) => result.failed)
      .map((result) => result.tradition);

    const retrievedCommentary = commentaryResults
      .flatMap((result) => result.excerpts)
      .filter((excerpt) => {
        if (selectedSourceSet.size === 0) return true;
        return sourceIsSelected(corpusOf(excerpt.onRef), selectedSourceSet);
      });

    const merged: CommentaryExcerpt[] = [];
    const seen = new Set<string>();
    let budget = envPositiveInt("ASK_RETRIEVAL_CHAR_BUDGET", DEFAULT_ASK_CHAR_BUDGET);
    for (const excerpt of retrievedCommentary) {
      const text = excerpt.text.length > MAX_COMMENTARY_EXCERPT_CHARS
        ? excerpt.text.slice(0, MAX_COMMENTARY_EXCERPT_CHARS)
        : excerpt.text;
      const key = `${excerpt.tradition}|${excerpt.sourceId}|${excerpt.onRef}|${text.slice(0, 80)}`;
      if (seen.has(key)) continue;
      if (text.length > budget) break;
      seen.add(key);
      budget -= text.length;
      merged.push({ ...excerpt, text });
    }
    commentary = merged;
    commentaryAvailable = merged.length > 0;
  }

  const traditionCoverage = traditionsInScope.map((tradition) => ({
    tradition,
    scriptureCount: retrievedPassages.filter((passage) => passage.tradition === tradition).length,
    commentaryCount: commentary.filter((excerpt) => excerpt.tradition === tradition).length,
    scriptureFailed: scriptureFailedTraditions.includes(tradition),
    commentaryFailed: commentaryFailedTraditions.includes(tradition),
  }));

  const ctx: GroundedContext = {
    scope: scopeForMode(mode),
    tradition: traditionsInScope.length === 1 ? traditionsInScope[0] : undefined,
    traditionsInScope,
    focusPassage: [],
    retrievedPassages,
    commentary,
    commentaryAvailable,
    traditionCoverage,
  };

  const hasEvidence = retrievedPassages.length > 0 || commentary.length > 0;
  const hasFailures = scriptureFailedTraditions.length > 0 || commentaryFailedTraditions.length > 0;
  if (cacheCanWrite() && hasEvidence && !hasFailures) contextCache.set(ctxCacheKey, ctx);

  return { systemPrompt: buildAskSystemPrompt(mode as AskMode, ctx, renderContext), ctx };
}

export interface GroundedAskAnswer {
  answer: string;
  validation: ValidationResult;
  regenerated: boolean;
}

function normalizeTradition(value: string): string {
  const normalized = value.trim().toLowerCase();
  return normalized === "shintoism" ? "shinto" : normalized;
}

function comparativeAttributionFailures(
  answerText: string,
  ctx: GroundedContext,
): ValidationResult["failures"] {
  let parsed: Partial<StructuredChatResponse>;
  try {
    parsed = JSON.parse(answerText) as Partial<StructuredChatResponse>;
  } catch {
    return [];
  }

  const passages = [...ctx.focusPassage, ...ctx.retrievedPassages];
  const traditionByRef = new Map(passages.map((passage) => [passage.refId, passage.tradition]));
  const failures: ValidationResult["failures"] = [];
  const sections = Array.isArray(parsed.sections) ? parsed.sections : [];

  for (const section of sections) {
    if (typeof section.body !== "string") continue;
    const citedTraditions = new Set<string>();
    for (const citation of parseEmittedCitations(section.body)) {
      const tradition = traditionByRef.get(citation.refId);
      if (tradition) citedTraditions.add(normalizeTradition(tradition));
    }

    if (section.type === "tradition_view") {
      const sectionTradition = typeof section.tradition === "string"
        ? normalizeTradition(section.tradition)
        : "";
      if (!sectionTradition || !citedTraditions.has(sectionTradition)) {
        failures.push({
          type: "tradition_misattribution",
          refId: sectionTradition || section.heading,
          detail: `The ${section.tradition || "unlabeled"} tradition section must cite evidence from that same tradition.`,
        });
      }
    }

    if (
      section.type === "comparison_overlap" ||
      section.type === "comparison_difference" ||
      section.type === "synthesis"
    ) {
      if (citedTraditions.size < 2) {
        failures.push({
          type: "tradition_misattribution",
          refId: section.type,
          detail: `The ${section.type} section must cite evidence from at least two traditions.`,
        });
      }
    }
  }

  return failures;
}

function validateAskAnswer(
  answerText: string,
  ctx: GroundedContext,
  mode: ResponseMode,
): ValidationResult {
  const validation = validateCitations(
    parseEmittedCitations(answerText),
    ctx,
    answerText,
    { requireCitation: true },
  );
  const extraFailures = mode === "comparative"
    ? comparativeAttributionFailures(answerText, ctx)
    : [];
  if (extraFailures.length === 0) return validation;

  const failures = [...validation.failures, ...extraFailures];
  return {
    ...validation,
    ok: false,
    failures,
    issues: failures.map((failure) => failure.detail),
  };
}

/**
 * Generate the structured JSON answer with citation validation and a single
 * regeneration retry — the same trust loop as the in-book Scholar, but over the
 * Ask JSON string (parseEmittedCitations finds inline [refId] tokens anywhere in
 * the text, including inside the JSON `body` fields).
 *
 * `generate` is injected so the retry behavior is unit-testable with a mock.
 */
export async function generateGroundedAskAnswer(
  ctx: GroundedContext,
  systemPrompt: string,
  message: string,
  generate: (systemPrompt: string, userMessage: string) => Promise<string>,
  mode: ResponseMode = "strict_source_grounded",
): Promise<GroundedAskAnswer> {
  const first = await generate(systemPrompt, message);
  const firstValidation = validateAskAnswer(first, ctx, mode);
  if (firstValidation.ok) {
    return { answer: first, validation: firstValidation, regenerated: false };
  }

  console.warn(
    "🔎 Ask citation grounding FAILED (first pass) — regenerating once:",
    firstValidation.issues,
  );
  const retryPrompt =
    `${systemPrompt}\n\n` +
    `──────────────────────────────────────────\n` +
    `CITATION CORRECTION REQUIRED\n` +
    `The following citations were not in the provided context; remove or correct them:\n` +
    firstValidation.issues.map((i) => `- ${i}`).join("\n");

  const second = await generate(retryPrompt, message);
  const secondValidation = validateAskAnswer(second, ctx, mode);
  if (!secondValidation.ok) {
    console.warn(
      "🔎 Ask citation grounding STILL FAILED after one regeneration — references will be rebuilt from retrieved passages only:",
      secondValidation.issues,
    );
  }
  return { answer: second, validation: secondValidation, regenerated: true };
}

function deriveMeta(
  mode: ResponseMode,
  selectedSources: string[],
  ctx: GroundedContext,
): ResponseMeta {
  if (mode === "general") {
    return {
      titleLabel: "General overview",
      scopeLabel: "Not limited to selected sources",
      answeringFromLabel: "General multi-faith view",
      grounded: false,
    };
  }
  if (mode === "comparative") {
    const grounded = selectedSources.length > 0 || ctx.traditionsInScope.length > 0;
    return {
      titleLabel: "Comparative answer",
      scopeLabel: grounded ? "Selected traditions only" : "Cross-tradition overview",
      grounded,
    };
  }
  return {
    titleLabel: "Grounded answer",
    scopeLabel: "Only selected sources",
    grounded: true,
  };
}

/** Build references that provably resolve to real retrieved passages. */
function passagesToReferences(passages: ScriptureCitation[]): ResponseReference[] {
  return passages.map((p) => {
    const src = CORPUS_TO_SOURCE[corpusOf(p.refId)];
    return {
      tradition: TRADITION_DISPLAY[p.tradition] ?? p.tradition,
      source: src?.label ?? corpusOf(p.refId),
      citation: p.reference,
      text: p.translation,
      edition: p.translationSource,
      refId: p.refId,
      kind: "scripture",
    };
  });
}

function commentaryToReferences(
  excerpts: CommentaryExcerpt[],
  sourceIds?: Set<string>,
): ResponseReference[] {
  return excerpts
    .filter((excerpt) => !sourceIds || sourceIds.has(excerpt.sourceId))
    .map((excerpt) => ({
      tradition: excerpt.tradition
        ? TRADITION_DISPLAY[excerpt.tradition] ?? excerpt.tradition
        : "Other",
      source: `${excerpt.sourceTitle} — ${excerpt.author}`,
      citation: excerpt.onRef,
      text: excerpt.text,
      edition: excerpt.language,
      refId: excerpt.onRef,
      kind: "commentary",
    }));
}

function coverageForContext(ctx: GroundedContext): NonNullable<StructuredChatResponse["coverage"]> {
  const coverage = ctx.traditionCoverage ?? ctx.traditionsInScope.map((tradition) => ({
    tradition,
    scriptureCount: ctx.retrievedPassages.filter((passage) => passage.tradition === tradition).length,
    commentaryCount: ctx.commentary.filter((excerpt) => excerpt.tradition === tradition).length,
    scriptureFailed: false,
    commentaryFailed: false,
  }));
  const evidenced = coverage.filter((item) => item.scriptureCount > 0 || item.commentaryCount > 0);
  return {
    requestedTraditions: coverage.map((item) => TRADITION_DISPLAY[item.tradition] ?? item.tradition),
    evidencedTraditions: evidenced.map((item) => TRADITION_DISPLAY[item.tradition] ?? item.tradition),
    missingTraditions: coverage
      .filter((item) => item.scriptureCount === 0 && item.commentaryCount === 0)
      .map((item) => TRADITION_DISPLAY[item.tradition] ?? item.tradition),
    failedTraditions: coverage
      .filter((item) => item.scriptureFailed || item.commentaryFailed)
      .map((item) => TRADITION_DISPLAY[item.tradition] ?? item.tradition),
  };
}

function coverageLimitations(ctx: GroundedContext): string | undefined {
  const coverage = coverageForContext(ctx);
  const notes: string[] = [];
  if (coverage.missingTraditions.length > 0) {
    notes.push(
      `No matching passages were retrieved for: ${coverage.missingTraditions.join(", ")}.`,
    );
  }
  if (coverage.failedTraditions?.length) {
    notes.push(
      `Evidence retrieval was unavailable for: ${coverage.failedTraditions.join(", ")}.`,
    );
  }
  return notes.length ? notes.join(" ") : undefined;
}

function evidenceReferences(ctx: GroundedContext): ResponseReference[] {
  return [
    ...passagesToReferences([...ctx.focusPassage, ...ctx.retrievedPassages]),
    ...commentaryToReferences(ctx.commentary),
  ];
}

export function buildInsufficientEvidenceResponse(
  mode: ResponseMode,
  selectedSources: string[],
  ctx: GroundedContext,
  reason?: string,
): StructuredChatResponse {
  const coverageNote = coverageLimitations(ctx);
  const limitation = [reason, coverageNote].filter(Boolean).join(" ");
  const body = reason ??
    (mode === "comparative"
      ? "There is not enough independently retrieved evidence to make a fair comparison."
      : "I could not retrieve enough source evidence to answer this reliably.");

  return {
    mode,
    meta: deriveMeta(mode, selectedSources, ctx),
    summary: body,
    sections: [{ type: "direct_answer", heading: "Evidence status", body }],
    references: evidenceReferences(ctx),
    limitations: limitation || "No relevant evidence was retrieved.",
    coverage: coverageForContext(ctx),
    followups: mode === "comparative"
      ? ["Choose at least two traditions with available sources", "Try a more specific question"]
      : ["Try a more specific question", "Select a tradition or text to narrow the search"],
    renderHints: { answerStyle: "in_depth", groupReferencesByTradition: true },
  };
}

export function buildUnavailableAskResponse(
  mode: ResponseMode,
  selectedSources: string[],
  selectedTraditions: string[],
  reason: string,
): StructuredChatResponse {
  const traditions = traditionsFromSelection(selectedTraditions);
  const ctx: GroundedContext = {
    scope: scopeForMode(mode),
    tradition: traditions.length === 1 ? traditions[0] : undefined,
    traditionsInScope: traditions,
    focusPassage: [],
    retrievedPassages: [],
    commentary: [],
    commentaryAvailable: false,
    traditionCoverage: traditions.map((tradition) => ({
      tradition,
      scriptureCount: 0,
      commentaryCount: 0,
      scriptureFailed: true,
      commentaryFailed: true,
    })),
  };
  return buildInsufficientEvidenceResponse(mode, selectedSources, ctx, reason);
}

export function mapToStructuredResponse(
  rawJson: string,
  mode: ResponseMode,
  selectedSources: string[],
  ctx: GroundedContext,
  citedRefIds: string[],
  citedCommentarySourceIds: string[] = [],
): StructuredChatResponse {
  const parsed = JSON.parse(rawJson) as Partial<StructuredChatResponse>;

  const sections: ResponseSection[] = (parsed.sections ?? [])
    .map((s) => ({
      type: VALID_SECTION_TYPES.has(s.type as ResponseSectionType)
        ? (s.type as ResponseSectionType)
        : ("direct_answer" as ResponseSectionType),
      tradition: s.tradition ? stripXmlTags(s.tradition) : undefined,
      heading: stripXmlTags(s.heading ?? ""),
      body: stripXmlTags(s.body ?? ""),
    }))
    .filter((s) => s.heading || s.body);

  if (sections.length === 0) {
    sections.push({
      type: "direct_answer",
      heading: "Answer",
      body: stripXmlTags(parsed.summary ?? ""),
    });
  }

  // References are NOT trusted from the model — they are rebuilt from the
  // passages we actually retrieved. Prefer the ones the model verifiably cited;
  // otherwise surface the retrieved set so the citations panel shows real text.
  const cited = new Set(citedRefIds);
  const refPassages = ctx.retrievedPassages.filter((p) => cited.has(p.refId));
  const references = [
    ...passagesToReferences(refPassages.length > 0 ? refPassages : ctx.retrievedPassages),
    ...commentaryToReferences(ctx.commentary, new Set(citedCommentarySourceIds)),
  ];
  const modelLimitations = parsed.limitations ? stripXmlTags(parsed.limitations) : undefined;
  const coverageNote = coverageLimitations(ctx);

  return {
    mode,
    meta: deriveMeta(mode, selectedSources, ctx),
    summary: stripXmlTags(parsed.summary ?? ""),
    sections,
    references,
    limitations: [modelLimitations, coverageNote].filter(Boolean).join(" ") || undefined,
    coverage: coverageForContext(ctx),
    followups:
      Array.isArray(parsed.followups) && parsed.followups.length > 0
        ? parsed.followups.map((f) => stripXmlTags(String(f)))
        : undefined,
    renderHints: { answerStyle: "in_depth", groupReferencesByTradition: true },
  };
}

/**
 * End-to-end grounded Ask answer. Throws on unrecoverable failure (Gemini error,
 * unparseable JSON) so the route can degrade to the legacy Ask builders.
 *
 * `generate` is injected for testability; defaults to the Gemini ASK_MODEL.
 */
export async function buildGroundedAskResponse(
  message: string,
  mode: ResponseMode,
  selectedSources: string[],
  selectedTraditions: string[],
  generate: (
    systemPrompt: string,
    userMessage: string,
  ) => Promise<string> = generateAskJson,
): Promise<StructuredChatResponse> {
  const { systemPrompt, ctx } = await buildAskGrounding(
    message,
    mode,
    selectedSources,
    selectedTraditions,
  );

  const evidenceTraditions = new Set([
    ...ctx.retrievedPassages.map((passage) => passage.tradition),
    ...ctx.commentary.map((excerpt) => excerpt.tradition).filter((value): value is TraditionId => Boolean(value)),
  ]);
  const hasEvidence = ctx.retrievedPassages.length > 0 || ctx.commentary.length > 0;
  if (!hasEvidence) {
    return buildInsufficientEvidenceResponse(
      mode,
      selectedSources,
      ctx,
      "No matching scripture or commentary was retrieved for this question.",
    );
  }
  if (mode === "comparative" && evidenceTraditions.size < 2) {
    return buildInsufficientEvidenceResponse(
      mode,
      selectedSources,
      ctx,
      "Only one tradition currently has matching retrieved evidence, so a balanced comparison is not available.",
    );
  }

  const { answer, validation } = await generateGroundedAskAnswer(
    ctx,
    systemPrompt,
    message,
    generate,
    mode,
  );

  if (!validation.ok) {
    return buildInsufficientEvidenceResponse(
      mode,
      selectedSources,
      ctx,
      "I could not verify every citation and quotation after a correction attempt, so I’m not presenting the unverified answer.",
    );
  }

  const citedRefIds = validation.citations
    .filter((c) => c.verified)
    .map((c) => c.refId);
  const citedCommentarySourceIds = parseCommentaryAttributions(answer);

  return mapToStructuredResponse(
    answer,
    mode,
    selectedSources,
    ctx,
    citedRefIds,
    citedCommentarySourceIds,
  );
}
