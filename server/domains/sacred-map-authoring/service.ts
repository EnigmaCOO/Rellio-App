// Sacred Map authoring — the drafting pipeline.
//
// Pipeline for one event:
//   1. Load the event (read-only) from the static events.json.
//   2. RETRIEVE candidate passages for its tradition via the EXISTING scripture
//      service (no new sources). Candidates come from the request body or, by
//      default, the event's own references.
//   3. Draft story.sections + references with GPT-4o under strict grounding
//      rules: every scriptural statement must cite a RETRIEVED passage; the model
//      never invents verses or quotes from memory. The final reference locators
//      come from OUR trusted retrieval, not the model's text.
//   4. VERIFY every drafted locator against its live source and drop/flag any
//      that don't resolve (Hadith numbering varies, so it's always re-checked).
//   5. Persist as review_status:"draft_unreviewed". Never published.

import { promises as fs } from "fs";
import * as path from "path";
import OpenAI from "openai";
import type { Religion } from "@shared/schema";
import {
  fetchScriptureContent,
  QURAN_SURAH_NAMES,
  type ExternalScripture,
} from "../../services/externalScripture";
import { saveDraft } from "./store";
import type {
  CandidatePassage,
  Draft,
  DraftReference,
  DraftSection,
  DraftVerification,
} from "./types";

const MODEL = "gpt-4o";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "",
});

// ── Event loading (read-only) ───────────────────────────────────────────────

interface EventLike {
  id: string;
  title: string;
  religion_id: string;
  description?: string;
  tradition_note?: string;
  references?: CandidatePassage[];
}

async function loadEvent(eventId: string): Promise<EventLike | null> {
  const eventsPath = path.resolve(process.cwd(), "client/public/data/events.json");
  const raw = await fs.readFile(eventsPath, "utf8");
  const parsed = JSON.parse(raw) as { events?: EventLike[] };
  const events = Array.isArray(parsed.events) ? parsed.events : [];
  return events.find((e) => e.id === eventId) ?? null;
}

// ── Locator → live fetch request ────────────────────────────────────────────

interface ResolvedRequest {
  religion: Religion;
  book: string;
  chapter: number;
  kind: "range" | "hadith";
  verseStart: number;
  verseEnd: number;
  // For hadith we look for a single hadith number rather than a verse range.
  verseTarget?: number;
}

function asNumber(value: unknown, fallback: number): number {
  const n = typeof value === "string" ? parseInt(value, 10) : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Translate a reference's locator into a concrete fetch, or null when its
// source_system has no live resolver (e.g. suttacentral) — those stay as
// citation-only and are flagged "unverifiable_source".
function buildRequest(
  locator: Record<string, string | number>,
  sourceSystem: string,
): ResolvedRequest | null {
  const loc = locator ?? {};
  switch (sourceSystem) {
    case "alquran.cloud": {
      const surah = asNumber(loc.surah, 0);
      const name = QURAN_SURAH_NAMES[surah - 1];
      if (!name) return null;
      const start = asNumber(loc.ayah_start, 1);
      return {
        religion: "islam" as Religion,
        book: name,
        chapter: 1,
        kind: "range",
        verseStart: start,
        verseEnd: asNumber(loc.ayah_end, start),
      };
    }
    case "bible-api":
    case "sefaria":
    case "sefaria.org": {
      const book = typeof loc.book === "string" ? loc.book : "";
      const chapter = asNumber(loc.chapter, 0);
      if (!book || chapter < 1) return null;
      const start = asNumber(loc.verse_start, 1);
      const chapterEnd = loc.chapter_end != null ? asNumber(loc.chapter_end, chapter) : chapter;
      const continues = chapterEnd !== chapter;
      return {
        religion: (sourceSystem === "bible-api" ? "christianity" : "judaism") as Religion,
        book,
        chapter,
        kind: "range",
        verseStart: start,
        verseEnd: continues ? Number.POSITIVE_INFINITY : asNumber(loc.verse_end, start),
      };
    }
    case "hadith-api": {
      const book = typeof loc.collection === "string"
        ? loc.collection
        : typeof loc.book === "string"
          ? loc.book
          : "";
      if (!book) return null;
      const chapter = asNumber(loc.book_number ?? loc.section ?? loc.chapter, 1);
      const target = asNumber(loc.hadith ?? loc.number ?? loc.hadith_number, 0);
      if (target < 1) return null;
      return {
        religion: "islam" as Religion,
        book,
        chapter,
        kind: "hadith",
        verseStart: target,
        verseEnd: target,
        verseTarget: target,
      };
    }
    default:
      return null;
  }
}

function selectVerses(req: ResolvedRequest, verses: ExternalScripture[]): ExternalScripture[] {
  if (req.kind === "hadith") {
    return verses.filter((v) => v.verse === req.verseTarget);
  }
  return verses.filter((v) => v.verse >= req.verseStart && v.verse <= req.verseEnd);
}

// ── Retrieval ───────────────────────────────────────────────────────────────

interface RetrievedPassage {
  pid: string;
  candidate: CandidatePassage;
  request: ResolvedRequest | null;
  found: boolean;
  text: string; // transient — used for the prompt only, never persisted
}

async function retrieve(candidates: CandidatePassage[]): Promise<RetrievedPassage[]> {
  const out: RetrievedPassage[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const pid = `p${i + 1}`;
    const request = buildRequest(candidate.locator, candidate.source_system);
    if (!request) {
      out.push({ pid, candidate, request: null, found: false, text: "" });
      continue;
    }
    try {
      const all = await fetchScriptureContent(request.religion, request.book, request.chapter);
      const picked = selectVerses(request, all);
      const text = picked.map((v) => `${v.verse}. ${v.text}`).join("\n");
      out.push({ pid, candidate, request, found: picked.length > 0, text });
    } catch {
      out.push({ pid, candidate, request, found: false, text: "" });
    }
  }
  return out;
}

// ── GPT-4o drafting ─────────────────────────────────────────────────────────

interface ModelSection {
  type?: string;
  heading?: string;
  body?: string;
  passage_ids?: string[];
}
interface ModelReference {
  passage_id?: string;
  role?: string;
  note?: string;
}
interface ModelOutput {
  sections?: ModelSection[];
  references?: ModelReference[];
}

const SYSTEM_RULES = [
  "You are a careful scriptural research assistant drafting study content for SCHOLAR REVIEW.",
  "You will be given an event and a numbered list of RETRIEVED PASSAGES. Each passage has an id (e.g. p1), a citation, a source, and its exact text.",
  "STRICT RULES:",
  "1. Every scriptural statement you write MUST be grounded in one of the retrieved passages, cited by its passage id.",
  "2. NEVER invent or quote verses, and NEVER cite a passage that is not in the retrieved list. Do not quote scripture from memory.",
  "3. If no retrieved passage supports a claim, omit the claim entirely.",
  "4. Non-scriptural narrative/context (history, geography, significance) is allowed without a passage id, but must not assert what a scripture says.",
  "5. Be neutral and descriptive; attribute beliefs to the tradition ('Christians hold that...'), do not assert them as fact.",
  "Return ONLY JSON matching this shape:",
  '{ "sections": [ { "type": "overview|scripture|context|significance", "heading": string, "body": string, "passage_ids": [string] } ], "references": [ { "passage_id": string, "role": "primary|supporting|parallel-tradition", "note": string } ] }',
  "Only use passage_ids that appear in the retrieved list. Order sections from overview to significance.",
].join("\n");

function buildUserPrompt(event: EventLike, retrieved: RetrievedPassage[]): string {
  const groundable = retrieved.filter((r) => r.found);
  const passageBlock = groundable
    .map(
      (r) =>
        `[${r.pid}] ${r.candidate.citation} (${r.candidate.source_system}; tradition: ${r.candidate.tradition})\n${r.text}`,
    )
    .join("\n\n");

  return [
    `EVENT: ${event.title}`,
    `TRADITION: ${event.religion_id}`,
    event.description ? `SUMMARY: ${event.description}` : "",
    "",
    "RETRIEVED PASSAGES (the ONLY scripture you may cite):",
    passageBlock || "(none retrieved)",
    "",
    "Draft the story sections and references now, following the strict rules.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function draftWithModel(
  event: EventLike,
  retrieved: RetrievedPassage[],
): Promise<ModelOutput> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_RULES },
      { role: "user", content: buildUserPrompt(event, retrieved) },
    ],
  });
  const content = completion.choices[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content) as ModelOutput;
  } catch {
    return {};
  }
}

// ── Verification ────────────────────────────────────────────────────────────

async function verifyLocator(ref: {
  locator: Record<string, string | number>;
  source_system: string;
}): Promise<DraftVerification> {
  const now = new Date().toISOString();
  const request = buildRequest(ref.locator, ref.source_system);
  if (!request) {
    return {
      status: "unverifiable_source",
      checked_at: now,
      detail: `No live resolver for source "${ref.source_system}"; left as a citation for manual review.`,
    };
  }
  try {
    const all = await fetchScriptureContent(request.religion, request.book, request.chapter);
    const picked = selectVerses(request, all);
    if (picked.length > 0) {
      return { status: "verified", checked_at: now, detail: `Resolved ${picked.length} passage(s) live.` };
    }
    return {
      status: "unresolved",
      checked_at: now,
      detail:
        request.kind === "hadith"
          ? `Hadith #${request.verseTarget} not found in "${request.book}" section ${request.chapter} (numbering varies between collections).`
          : `Cited verse(s) not found in ${request.book} ${request.chapter}.`,
    };
  } catch (err) {
    return {
      status: "unresolved",
      checked_at: now,
      detail: `Live fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ── Orchestration ───────────────────────────────────────────────────────────

export type GenerateResult =
  | { ok: true; draft: Draft }
  | { ok: false; code: "not_found" | "no_candidates" | "no_api_key" | "model_error"; message: string };

export async function generateDraft(
  eventId: string,
  candidatesInput?: CandidatePassage[],
): Promise<GenerateResult> {
  if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY_ENV_VAR) {
    return { ok: false, code: "no_api_key", message: "OPENAI_API_KEY is not configured." };
  }

  const event = await loadEvent(eventId);
  if (!event) return { ok: false, code: "not_found", message: `Event "${eventId}" not found.` };

  const candidates =
    candidatesInput && candidatesInput.length > 0 ? candidatesInput : event.references ?? [];
  if (candidates.length === 0) {
    return {
      ok: false,
      code: "no_candidates",
      message:
        "No candidate passages to ground on. Provide `candidates` or add references to the event first.",
    };
  }

  const flags: string[] = [];
  const retrieved = await retrieve(candidates);
  const byPid = new Map(retrieved.map((r) => [r.pid, r]));

  for (const r of retrieved) {
    if (!r.found) {
      flags.push(
        `Candidate "${r.candidate.citation}" (${r.candidate.source_system}) could not be retrieved live and was not offered to the model.`,
      );
    }
  }

  const groundable = retrieved.filter((r) => r.found);
  if (groundable.length === 0) {
    return {
      ok: false,
      code: "no_candidates",
      message: "None of the candidate passages could be retrieved from their live sources.",
    };
  }

  let model: ModelOutput;
  try {
    model = await draftWithModel(event, retrieved);
  } catch (err) {
    return { ok: false, code: "model_error", message: err instanceof Error ? err.message : String(err) };
  }

  // Build final references ONLY from retrieved passages the model selected. The
  // locator/citation/source come from OUR trusted retrieval, never the model's
  // free text — so the model cannot smuggle in an invented verse.
  const refByPid = new Map<string, DraftReference>();
  const usedPids: string[] = [];
  for (const mref of model.references ?? []) {
    const pid = mref.passage_id ?? "";
    const passage = byPid.get(pid);
    if (!passage || !passage.found) {
      if (pid) flags.push(`Model cited unknown/ungrounded passage id "${pid}" — dropped.`);
      continue;
    }
    if (refByPid.has(pid)) continue;
    const c = passage.candidate;
    const verification = await verifyLocator({ locator: c.locator, source_system: c.source_system });
    if (verification.status === "unresolved") {
      flags.push(`Reference "${c.citation}" failed live verification and was dropped: ${verification.detail}`);
      continue;
    }
    refByPid.set(pid, {
      id: `ref_${pid}`,
      tradition: c.tradition,
      work: c.work ?? c.citation,
      citation: c.citation,
      locator: c.locator,
      source_system: c.source_system,
      role: mref.role ?? c.role ?? "supporting",
      note: mref.note ?? c.note,
      verification,
    });
    usedPids.push(pid);
  }

  const references = usedPids.map((pid) => refByPid.get(pid)!).filter(Boolean);

  // Build sections, remapping passage_ids → kept reference ids and dropping any
  // that referenced a dropped/unknown passage.
  const sections: DraftSection[] = (model.sections ?? []).map((s, i) => {
    const refIds = (s.passage_ids ?? [])
      .filter((pid) => refByPid.has(pid))
      .map((pid) => refByPid.get(pid)!.id);
    const droppedHere = (s.passage_ids ?? []).filter((pid) => !refByPid.has(pid));
    if (droppedHere.length > 0) {
      flags.push(
        `Section "${s.heading ?? `#${i + 1}`}" referenced unavailable passage(s): ${droppedHere.join(", ")}.`,
      );
    }
    const type = s.type ?? "context";
    // Grounding guard: a section that claims to present scripture MUST cite at
    // least one verified reference. If it doesn't, surface it loudly for the
    // human reviewer rather than letting an ungrounded scriptural claim pass.
    if (type === "scripture" && refIds.length === 0) {
      flags.push(
        `UNGROUNDED: scripture section "${s.heading ?? `#${i + 1}`}" has no verified citation — review before any use.`,
      );
    }
    return {
      id: `s_${i + 1}`,
      type,
      heading: s.heading ?? `Section ${i + 1}`,
      body: s.body ?? "",
      ref_ids: refIds,
    };
  });

  if (references.length === 0) {
    flags.push("UNGROUNDED: draft has no verified references — do not use without sourcing.");
  }

  const draft: Draft = {
    id: `draft_${eventId}_${Date.now()}`,
    event_id: eventId,
    event_title: event.title,
    religion_id: event.religion_id,
    review_status: "draft_unreviewed",
    model: MODEL,
    generated_at: new Date().toISOString(),
    story: { sections },
    references,
    flags,
    retrieval: { candidate_count: candidates.length, retrieved_count: groundable.length },
  };

  await saveDraft(draft);
  return { ok: true, draft };
}
