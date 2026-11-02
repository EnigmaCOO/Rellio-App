/**
 * Commentary ingestion — run with `npx tsx scripts/ingest-commentary.ts [tradition] [flags]`
 *
 * Embeds named commentary works into the `commentary_chunks` pgvector store,
 * anchoring each excerpt (via `onRef`) to the scripture verse it comments on.
 * Four traditions ship so far:
 *   - judaism      — Sefaria's verse-anchored Torah commentaries (Rashi, Ibn Ezra,
 *                    Ramban, Sforno). onRef "torah:{Book}:{chapter}:{verse}".
 *   - islam        — English tafsīr from the spa5k tafsir_api (Ibn Kathīr, Jalālayn).
 *                    onRef "quran:{surah}:{ayah}", matching the Quran scripture store.
 *   - buddhism     — The classical Theravāda Aṭṭhakathā from SuttaCentral
 *                    (English Sumaṅgalavilāsinī, the Dīgha Nikāya commentary).
 *                    onRef "sutta-pitaka:{suttaUid}" (e.g. "sutta-pitaka:dn2").
 *   - christianity — Matthew Henry's "Commentary on the Whole Bible" from the
 *                    helloao Free Use Bible API. onRef
 *                    "bible-{ot|nt}:{Book}:{chapter}:{verse}", matching the
 *                    priest's OT/NT corpora.
 *   - hinduism     — The classical Vedānta bhāṣyas on the Bhagavad Gītā
 *                    (Śaṅkara, Rāmānuja, Madhva, Śrīdhara) from the public-domain
 *                    gita/gita JSON dataset. The dataset carries these in the
 *                    original SANSKRIT (language "sa"); onRef
 *                    "bhagavad-gita:{chapter}:{verse}".
 *   - sikhism      — Honest absence: the granthi canon's only declared work, the
 *                    Faridkot Wala Teeka, has no clean verse-anchored public-domain
 *                    digital edition, so nothing is ingested (see notes below).
 *
 * Usage:
 *   npx tsx scripts/ingest-commentary.ts judaism            # ingest Judaism (default)
 *   npx tsx scripts/ingest-commentary.ts judaism --book Genesis --max-chapter 2
 *   npx tsx scripts/ingest-commentary.ts islam              # ingest Islam tafsīr
 *   npx tsx scripts/ingest-commentary.ts islam --surah 2    # one surah
 *   npx tsx scripts/ingest-commentary.ts islam --max-surah 3  # partial run
 *   npx tsx scripts/ingest-commentary.ts buddhism           # ingest Buddhism Aṭṭhakathā
 *   npx tsx scripts/ingest-commentary.ts buddhism --sutta dn2  # one sutta's commentary
 *   npx tsx scripts/ingest-commentary.ts christianity       # ingest Christianity (Matthew Henry)
 *   npx tsx scripts/ingest-commentary.ts christianity --book John --max-chapter 1
 *   npx tsx scripts/ingest-commentary.ts hinduism          # ingest Hinduism Gītā bhāṣyas
 *   npx tsx scripts/ingest-commentary.ts hinduism --max-chapter 2  # partial run
 *   npx tsx scripts/ingest-commentary.ts sikhism           # honest absence (ingests nothing)
 *   npx tsx scripts/ingest-commentary.ts <tradition> --force  # re-embed everything
 *   npx tsx scripts/ingest-commentary.ts <tradition> --dry-run  # fetch+parse only
 *
 * Idempotent: existing rows (keyed on namespace + on_ref + chunk_index) are
 * skipped unless --force is passed, in which case they are re-embedded & upserted.
 * The unique key allows multiple excerpts per (source, verse) without duplicates.
 *
 * Per-source availability is implicit: only sources that actually return text end
 * up in the store. getCommentaryAvailability() (lib/retrieval/commentary.ts)
 * reconciles this against the DECLARED canon so callers can tell "the canon names
 * Ibn Kathīr" from "Ibn Kathīr was actually ingested". Canon works with no usable
 * English, verse-anchored source (Tabarī/Qurṭubī/Rāzī are Arabic-only here; Mīzān
 * is absent) are deliberately not ingested → honestly reported as not-ingested.
 *
 * Run scripts/setup-pgvector.ts once before the first ingestion.
 *
 * Sources:
 *   - Sefaria texts API, e.g. https://www.sefaria.org/api/texts/Rashi_on_Genesis.1
 *   - spa5k tafsir_api (per-surah bundles), e.g.
 *     https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/en-tafisr-ibn-kathir/2.json
 *   - helloao Free Use Bible API (public-domain commentaries), e.g.
 *     https://bible.helloao.org/api/c/matthew-henry/JHN/1.json
 *   - gita/gita public-domain JSON dataset (Unlicense), e.g.
 *     https://raw.githubusercontent.com/gita/gita/main/data/commentary.json
 * The English layer is embedded (language "en") for the Abrahamic + Buddhist
 * sources; verses with no text are skipped (honest absence). The Hindu Gītā
 * bhāṣyas exist only in the original Sanskrit in this dataset, so they are
 * embedded with language "sa" (the gemini embedding model is multilingual) rather
 * than misattributing the dataset's lone English commentary — which is by a
 * non-canon author — to a canon bhāṣyakāra. Sikhism ingests nothing: its sole
 * canon teeka has no clean verse-anchored public-domain edition available.
 *
 * Note: --force re-upserts in place by (namespace, onRef, chunkIndex). If a
 * source's excerpt count for a verse ever shrinks upstream, stale higher-index
 * rows would remain; these sources are stable, so this is left as-is for now.
 */

import { fileURLToPath } from "url";

const EMBED_BATCH_SIZE = 96;
const BATCH_DELAY_MS = 250;
const FETCH_DELAY_MS = 200;
// Keep each embedded excerpt comfortably under the embedding model's input token
// budget. Long tafsīr entries (Ibn Kathīr in particular) are split into multiple
// chunkIndex excerpts per verse rather than truncated.
const MAX_CHUNK_CHARS = 4000;

// ─── Judaism (Sefaria) ───────────────────────────────────────────────────────
const JUDAISM_TRADITION_ID = "judaism";

// Canon source id → the name Sefaria uses in its index titles.
const SEFARIA_NAME_BY_SOURCE: Record<string, string> = {
  rashi: "Rashi",
  "ibn-ezra": "Ibn Ezra",
  ramban: "Ramban",
  sforno: "Sforno",
};

// The Torah (Chumash) — the verse-anchored base text these commentaries cover.
const TORAH_BOOKS: { name: string; chapters: number }[] = [
  { name: "Genesis", chapters: 50 },
  { name: "Exodus", chapters: 40 },
  { name: "Leviticus", chapters: 27 },
  { name: "Numbers", chapters: 36 },
  { name: "Deuteronomy", chapters: 34 },
];

// ─── Islam (spa5k tafsir_api) ─────────────────────────────────────────────────
const ISLAM_TRADITION_ID = "islam";
const QURAN_SURAH_COUNT = 114;

// Canon source id → spa5k tafsir_api English edition slug. Only verse-anchored
// English tafsīr with verified, on-topic content are listed. The other mufti
// canon members are intentionally absent: Ṭabarī/Qurṭubī/Rāzī have only Arabic
// editions here, Mīzān has none, and the "Asbāb al-Nuzūl by al-Wāḥidī" English
// slug serves mismatched (Sufi) text — ingesting it would misattribute. Those
// stay honestly un-ingested (getCommentaryAvailability reports ingested:false).
const TAFSIR_SLUG_BY_SOURCE: Record<string, string> = {
  "ibn-kathir": "en-tafisr-ibn-kathir",
  jalalayn: "en-al-jalalayn",
};

const BUDDHISM_TRADITION_ID = "buddhism";

// Canon source id "atthakatha" → SuttaCentral's English translation of the
// classical Theravāda Aṭṭhakathā. The only genuine, verse/sutta-anchored
// commentary SuttaCentral serves for the bhikkhu canon is the Sumaṅgalavilāsinī
// (the Dīgha Nikāya commentary, attributed to Buddhaghosa), authored by the
// "comm-team" and licensed CC0. It lives on bilara-data's `unpublished` branch
// (still an in-progress translation), so we read from there.
//
// The "visuddhimagga" canon source is intentionally absent — SuttaCentral has no
// Visuddhimagga edition — so it stays honestly un-ingested
// (getCommentaryAvailability reports ingested:false). We also deliberately skip
// SuttaCentral's modern translator-notes ("comment") layer: attributing those to
// the classical Aṭṭhakathā would misattribute (cf. the al-Wāḥidī exclusion above).
const SC_REPO = "suttacentral/bilara-data";
const SC_BRANCH = "unpublished";
const ATTHAKATHA_SOURCE_ID = "atthakatha";
// The aṭṭhakathā work directory (Sumaṅgalavilāsinī = the Dīgha Nikāya commentary).
// Per-sutta files inside are named "{suttaUid}-a_translation-en-comm-team.json".
const ATTHAKATHA_DIR = "translation/en/comm-team/sutta/atthakatha/dn-a";

// ─── Christianity (helloao Free Use Bible API) ───────────────────────────────
const CHRISTIANITY_TRADITION_ID = "christianity";
const HELLOAO_BASE = "https://bible.helloao.org/api/c";

// Canon source id → helloao commentary id. Only the priest-canon work that
// helloao actually serves as a public-domain, verse-anchored English commentary
// is mapped: Matthew Henry's "Commentary on the Whole Bible" (Public Domain
// Mark 1.0). The rest of the priest canon stays honestly un-ingested
// (getCommentaryAvailability reports ingested:false): the Church Fathers
// (Chrysostom/Augustine/Jerome) and Calvin have no clean, verse-anchored English
// JSON edition here; the Catena Aurea (aquinas-catena) is only available
// elsewhere in Portuguese; and the Summa Theologiae (aquinas-st) is systematic
// theology, not verse-anchored — so none can be mapped without misattributing.
const HELLOAO_COMMENTARY_BY_SOURCE: Record<string, string> = {
  "matthew-henry": "matthew-henry",
};

// The Protestant 66-book canon — the verse-anchored base text the commentary
// comments on. `id` is helloao's USFM book code; `testament` selects the corpus
// prefix for onRef (the priest's primaryScriptureIds are "bible-ot"/"bible-nt").
// Canonical chapter counts are used directly (helloao's books.json counts are
// unreliable for some books); chapters a source lacks are skipped (honest
// absence) rather than assumed present.
const BIBLE_BOOKS: {
  name: string;
  id: string;
  testament: "ot" | "nt";
  chapters: number;
}[] = [
  { name: "Genesis", id: "GEN", testament: "ot", chapters: 50 },
  { name: "Exodus", id: "EXO", testament: "ot", chapters: 40 },
  { name: "Leviticus", id: "LEV", testament: "ot", chapters: 27 },
  { name: "Numbers", id: "NUM", testament: "ot", chapters: 36 },
  { name: "Deuteronomy", id: "DEU", testament: "ot", chapters: 34 },
  { name: "Joshua", id: "JOS", testament: "ot", chapters: 24 },
  { name: "Judges", id: "JDG", testament: "ot", chapters: 21 },
  { name: "Ruth", id: "RUT", testament: "ot", chapters: 4 },
  { name: "1 Samuel", id: "1SA", testament: "ot", chapters: 31 },
  { name: "2 Samuel", id: "2SA", testament: "ot", chapters: 24 },
  { name: "1 Kings", id: "1KI", testament: "ot", chapters: 22 },
  { name: "2 Kings", id: "2KI", testament: "ot", chapters: 25 },
  { name: "1 Chronicles", id: "1CH", testament: "ot", chapters: 29 },
  { name: "2 Chronicles", id: "2CH", testament: "ot", chapters: 36 },
  { name: "Ezra", id: "EZR", testament: "ot", chapters: 10 },
  { name: "Nehemiah", id: "NEH", testament: "ot", chapters: 13 },
  { name: "Esther", id: "EST", testament: "ot", chapters: 10 },
  { name: "Job", id: "JOB", testament: "ot", chapters: 42 },
  { name: "Psalms", id: "PSA", testament: "ot", chapters: 150 },
  { name: "Proverbs", id: "PRO", testament: "ot", chapters: 31 },
  { name: "Ecclesiastes", id: "ECC", testament: "ot", chapters: 12 },
  { name: "Song of Solomon", id: "SNG", testament: "ot", chapters: 8 },
  { name: "Isaiah", id: "ISA", testament: "ot", chapters: 66 },
  { name: "Jeremiah", id: "JER", testament: "ot", chapters: 52 },
  { name: "Lamentations", id: "LAM", testament: "ot", chapters: 5 },
  { name: "Ezekiel", id: "EZK", testament: "ot", chapters: 48 },
  { name: "Daniel", id: "DAN", testament: "ot", chapters: 12 },
  { name: "Hosea", id: "HOS", testament: "ot", chapters: 14 },
  { name: "Joel", id: "JOL", testament: "ot", chapters: 3 },
  { name: "Amos", id: "AMO", testament: "ot", chapters: 9 },
  { name: "Obadiah", id: "OBA", testament: "ot", chapters: 1 },
  { name: "Jonah", id: "JON", testament: "ot", chapters: 4 },
  { name: "Micah", id: "MIC", testament: "ot", chapters: 7 },
  { name: "Nahum", id: "NAM", testament: "ot", chapters: 3 },
  { name: "Habakkuk", id: "HAB", testament: "ot", chapters: 3 },
  { name: "Zephaniah", id: "ZEP", testament: "ot", chapters: 3 },
  { name: "Haggai", id: "HAG", testament: "ot", chapters: 2 },
  { name: "Zechariah", id: "ZEC", testament: "ot", chapters: 14 },
  { name: "Malachi", id: "MAL", testament: "ot", chapters: 4 },
  { name: "Matthew", id: "MAT", testament: "nt", chapters: 28 },
  { name: "Mark", id: "MRK", testament: "nt", chapters: 16 },
  { name: "Luke", id: "LUK", testament: "nt", chapters: 24 },
  { name: "John", id: "JHN", testament: "nt", chapters: 21 },
  { name: "Acts", id: "ACT", testament: "nt", chapters: 28 },
  { name: "Romans", id: "ROM", testament: "nt", chapters: 16 },
  { name: "1 Corinthians", id: "1CO", testament: "nt", chapters: 16 },
  { name: "2 Corinthians", id: "2CO", testament: "nt", chapters: 13 },
  { name: "Galatians", id: "GAL", testament: "nt", chapters: 6 },
  { name: "Ephesians", id: "EPH", testament: "nt", chapters: 6 },
  { name: "Philippians", id: "PHP", testament: "nt", chapters: 4 },
  { name: "Colossians", id: "COL", testament: "nt", chapters: 4 },
  { name: "1 Thessalonians", id: "1TH", testament: "nt", chapters: 5 },
  { name: "2 Thessalonians", id: "2TH", testament: "nt", chapters: 3 },
  { name: "1 Timothy", id: "1TI", testament: "nt", chapters: 6 },
  { name: "2 Timothy", id: "2TI", testament: "nt", chapters: 4 },
  { name: "Titus", id: "TIT", testament: "nt", chapters: 3 },
  { name: "Philemon", id: "PHM", testament: "nt", chapters: 1 },
  { name: "Hebrews", id: "HEB", testament: "nt", chapters: 13 },
  { name: "James", id: "JAS", testament: "nt", chapters: 5 },
  { name: "1 Peter", id: "1PE", testament: "nt", chapters: 5 },
  { name: "2 Peter", id: "2PE", testament: "nt", chapters: 3 },
  { name: "1 John", id: "1JN", testament: "nt", chapters: 5 },
  { name: "2 John", id: "2JN", testament: "nt", chapters: 1 },
  { name: "3 John", id: "3JN", testament: "nt", chapters: 1 },
  { name: "Jude", id: "JUD", testament: "nt", chapters: 1 },
  { name: "Revelation", id: "REV", testament: "nt", chapters: 22 },
];

// ─── Hinduism (gita/gita public-domain JSON dataset) ─────────────────────────
const HINDUISM_TRADITION_ID = "hinduism";
const GITA_COMMENTARY_URL =
  "https://raw.githubusercontent.com/gita/gita/main/data/commentary.json";
const GITA_VERSE_URL =
  "https://raw.githubusercontent.com/gita/gita/main/data/verse.json";
// Corpus prefix = the guru's primaryScriptureId for the Bhagavad Gītā, matching
// the scripture-store / reader convention for "bhagavad-gita:{chapter}:{verse}".
const GITA_CORPUS = "bhagavad-gita";

// Canon source id → gita/gita author_id. Only the Vedānta Gītā-bhāṣya authors in
// the guru canon that the dataset actually carries are mapped: Śaṅkara,
// Rāmānuja, Madhva, Śrīdhara. The dataset serves their commentaries in the
// original SANSKRIT (Devanagari), public domain (Unlicense), verse-anchored — so
// they are embedded with language "sa". The dataset's lone English commentary is
// by a non-canon author, so it is deliberately NOT mapped to any canon id
// (mapping it to a canon source would misattribute). The guru canon's
// Upaniṣad/Veda bhāṣyas have no clean verse-anchored public-domain JSON source
// here, so they stay honestly un-ingested (getCommentaryAvailability reports
// ingested:false).
const GITA_AUTHOR_ID_BY_SOURCE: Record<string, number> = {
  shankara: 14,
  ramanuja: 7,
  madhva: 5,
  sridhara: 8,
};

// ─── Sikhism (no digitally available canon teeka) ────────────────────────────
const SIKHISM_TRADITION_ID = "sikhism";
// The granthi canon declares a single work — the Faridkot Wala Teeka — which has
// no clean, verse-anchored, public-domain digital edition available at ingest
// time. The Sikh scripture APIs (BaniDB, GurbaniNow) expose only Prof. Sahib
// Singh's "Sri Guru Granth Darpan" (a different, 20th-century work) as their
// Punjabi exegesis; attributing it to the Faridkot Teeka would misattribute
// (cf. the al-Wāḥidī / Catena Aurea exclusions). So no Sikh source is ingested:
// getCommentaryAvailability reports ingested:false and the read helpers return
// honest empty results for "sikhism". When a genuine verse-anchored teeka
// becomes available it would anchor to "guru-granth-sahib:{...}" (the granthi
// primaryScriptureId corpus prefix).

interface CommentaryRecord {
  sourceId: string;
  sourceTitle: string;
  author: string;
  onRef: string;
  chunkIndex: number;
  text: string;
  language: string;
  tradition: string;
  namespace: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Strip HTML tags and collapse whitespace (sources embed <i>, <sup> etc.). */
function cleanText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Split a long excerpt into <= maxChars segments on sentence boundaries (falling
 * back to a hard split for a single oversized sentence). Short text returns as a
 * single chunk. Used so very long tafsīr entries stay within the embedding budget
 * while remaining anchored to the same verse via successive chunkIndex values.
 */
function splitIntoChunks(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if (s.length > maxChars) {
      if (cur) {
        chunks.push(cur.trim());
        cur = "";
      }
      for (let i = 0; i < s.length; i += maxChars) {
        chunks.push(s.slice(i, i + maxChars).trim());
      }
      continue;
    }
    if (cur && cur.length + 1 + s.length > maxChars) {
      chunks.push(cur.trim());
      cur = "";
    }
    cur = cur ? `${cur} ${s}` : s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.filter((c) => c.length > 0);
}

/**
 * Fetch one chapter of a commentary from Sefaria. Returns an array indexed by
 * verse (0-based), each entry being that verse's list of comment strings.
 * Returns [] for chapters Sefaria does not have (404).
 */
async function fetchCommentaryChapter(
  sefariaName: string,
  book: string,
  chapter: number,
): Promise<string[][]> {
  const indexTitle = `${sefariaName} on ${book}`.replace(/ /g, "_");
  const url = `https://www.sefaria.org/api/texts/${indexTitle}.${chapter}?context=0&commentary=0&pad=0`;
  const res = await fetch(url);
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`Sefaria error for ${indexTitle}.${chapter}: ${res.status}`);
  }
  const json = (await res.json()) as { text?: unknown };
  const text = json.text;
  if (!Array.isArray(text)) return [];
  // Each verse entry is either a string or an array of comment strings.
  return text.map((entry) => {
    if (Array.isArray(entry)) return entry.map((s) => String(s ?? ""));
    if (entry) return [String(entry)];
    return [];
  });
}

/**
 * Fetch one surah's tafsīr from the spa5k tafsir_api per-surah bundle. Bundles
 * come in two shapes (a bare array, or `{ ayahs: [...] }`); both carry an `ayah`
 * field per entry, which we trust to anchor onRef. Returns a verse→text map.
 * Returns an empty map for surahs the edition does not cover (404).
 */
async function fetchTafsirSurah(
  slug: string,
  surah: number,
): Promise<Map<number, string>> {
  const url = `https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/${slug}/${surah}.json`;
  const res = await fetch(url);
  if (res.status === 404) return new Map();
  if (!res.ok) {
    throw new Error(`tafsir_api error for ${slug}/${surah}: ${res.status}`);
  }
  const json = (await res.json()) as unknown;
  const arr: unknown[] = Array.isArray(json)
    ? json
    : Array.isArray((json as { ayahs?: unknown }).ayahs)
      ? ((json as { ayahs: unknown[] }).ayahs)
      : [];

  const byAyah = new Map<number, string>();
  for (const item of arr) {
    const ayah = Number((item as { ayah?: unknown })?.ayah);
    const text = cleanText(String((item as { text?: unknown })?.text ?? ""));
    if (!Number.isFinite(ayah) || ayah < 1 || !text) continue; // honest absence
    byAyah.set(ayah, text);
  }
  return byAyah;
}

/**
 * List the per-sutta aṭṭhakathā files SuttaCentral actually ships, deriving the
 * commented sutta uid from each filename ("dn2-a_translation-…json" → "dn2").
 * Discovered dynamically so any newly-translated sutta is picked up without code
 * changes; only suttas with a real file are returned (honest availability).
 */
async function fetchAtthakathaFiles(): Promise<
  { suttaUid: string; downloadUrl: string }[]
> {
  const url = `https://api.github.com/repos/${SC_REPO}/contents/${ATTHAKATHA_DIR}?ref=${SC_BRANCH}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "rellio-commentary-ingest",
    },
  });
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`SuttaCentral listing error for ${ATTHAKATHA_DIR}: ${res.status}`);
  }
  const items = (await res.json()) as Array<{
    name: string;
    type: string;
    download_url: string | null;
  }>;
  const out: { suttaUid: string; downloadUrl: string }[] = [];
  for (const it of items) {
    if (it.type !== "file" || !it.download_url) continue;
    const m = it.name.match(/^(.+)-a_translation-en-comm-team\.json$/);
    if (!m) continue;
    out.push({ suttaUid: m[1], downloadUrl: it.download_url });
  }
  // Deterministic order → stable logs and reproducible runs.
  out.sort((a, b) => a.suttaUid.localeCompare(b.suttaUid));
  return out;
}

/**
 * Fetch one sutta's aṭṭhakathā file and assemble its segments (kept in document
 * order, the order bilara-data stores them) into a single cleaned string. The
 * commentary is prose anchored to the whole sutta, so the caller chunks the
 * result and anchors every chunk to that sutta's onRef.
 */
async function fetchAtthakathaText(downloadUrl: string): Promise<string> {
  const res = await fetch(downloadUrl);
  if (res.status === 404) return ""; // honest absence
  if (!res.ok) {
    throw new Error(`SuttaCentral file error for ${downloadUrl}: ${res.status}`);
  }
  const json = (await res.json()) as Record<string, unknown>;
  const parts: string[] = [];
  for (const val of Object.values(json)) {
    // Strip markdown bold markers (the segments use **…**) on top of cleanText.
    const text = cleanText(String(val ?? "").replace(/\*\*/g, ""));
    if (text) parts.push(text);
  }
  return parts.join(" ");
}

interface PersistOptions {
  force: boolean;
  dryRun: boolean;
}

/**
 * Shared persistence tail for every tradition: dedup against the store (unless
 * --force), honour --dry-run, then embed in batches and upsert idempotently on
 * (namespace, on_ref, chunk_index). Records must already be built and scoped to
 * `tradition`.
 */
async function persistRecords(
  records: CommentaryRecord[],
  tradition: string,
  opts: PersistOptions,
): Promise<void> {
  const { db } = await import("../server/db.js");
  const { commentaryChunks } = await import("../shared/schema.js");
  const { embedBatch } = await import("../server/services/embeddings.js");
  const { eq, sql } = await import("drizzle-orm");

  let pending = records;
  if (!opts.force) {
    const existingRows = await db
      .select({
        namespace: commentaryChunks.namespace,
        onRef: commentaryChunks.onRef,
        chunkIndex: commentaryChunks.chunkIndex,
      })
      .from(commentaryChunks)
      .where(eq(commentaryChunks.tradition, tradition));
    const existing = new Set(
      existingRows.map((r) => `${r.namespace}|${r.onRef}|${r.chunkIndex}`),
    );
    const before = pending.length;
    pending = pending.filter(
      (r) => !existing.has(`${r.namespace}|${r.onRef}|${r.chunkIndex}`),
    );
    console.log(
      `   ${existing.size} already embedded; ${before - pending.length} skipped, ` +
        `${pending.length} to embed.`,
    );
  }

  if (opts.dryRun) {
    console.log(`🧪 Dry run — would embed & upsert ${pending.length} excerpt(s). No writes.`);
    return;
  }

  if (pending.length === 0) {
    console.log("✅ Nothing to do — store already up to date.");
    return;
  }

  let upserted = 0;
  for (let i = 0; i < pending.length; i += EMBED_BATCH_SIZE) {
    const batch = pending.slice(i, i + EMBED_BATCH_SIZE);
    const vectors = await embedBatch(batch.map((r) => r.text));
    const rows = batch.map((r, j) => ({ ...r, embedding: vectors[j] }));

    // On conflict (same namespace + on_ref + chunk_index), overwrite with the
    // incoming (excluded) values — including the freshly computed embedding — so
    // --force re-ingestion replaces stale rows rather than keeping old data.
    await db
      .insert(commentaryChunks)
      .values(rows)
      .onConflictDoUpdate({
        target: [
          commentaryChunks.namespace,
          commentaryChunks.onRef,
          commentaryChunks.chunkIndex,
        ],
        set: {
          sourceId: sql`excluded.source_id`,
          sourceTitle: sql`excluded.source_title`,
          author: sql`excluded.author`,
          text: sql`excluded.text`,
          language: sql`excluded.language`,
          tradition: sql`excluded.tradition`,
          embedding: sql`excluded.embedding`,
        },
      });

    upserted += rows.length;
    console.log(`   …upserted ${upserted}/${pending.length}`);
    if (i + EMBED_BATCH_SIZE < pending.length) await sleep(BATCH_DELAY_MS);
  }

  console.log(`✅ Ingestion complete — ${upserted} excerpt(s) embedded & upserted.`);
}

interface JudaismBuildOptions {
  force: boolean;
  book?: string;
  maxChapter: number;
  dryRun: boolean;
}

export async function ingestJudaismCommentary(
  opts: JudaismBuildOptions,
): Promise<void> {
  const { getCommentaryCanon, commentaryNamespace } = await import(
    "../config/scholars.js"
  );

  const canon = getCommentaryCanon(JUDAISM_TRADITION_ID);
  const ingestable = Object.keys(SEFARIA_NAME_BY_SOURCE)
    .map((id) => ({ id, source: canon.find((c) => c.id === id) }))
    .filter((x): x is { id: string; source: NonNullable<typeof x.source> } =>
      Boolean(x.source),
    );

  const books = opts.book
    ? TORAH_BOOKS.filter(
        (b) => b.name.toLowerCase() === opts.book!.toLowerCase(),
      )
    : TORAH_BOOKS;
  if (books.length === 0) {
    throw new Error(`Unknown Torah book "${opts.book}".`);
  }

  console.log(
    `📜 Ingesting Judaism commentary (${ingestable.map((x) => x.id).join(", ")}) ` +
      `over ${books.map((b) => b.name).join(", ")}` +
      (opts.maxChapter < Infinity ? ` (≤ ch.${opts.maxChapter})` : "") +
      (opts.force ? " — FORCE re-embed" : "") +
      (opts.dryRun ? " — DRY RUN" : ""),
  );

  const records: CommentaryRecord[] = [];
  for (const { id, source } of ingestable) {
    const sefariaName = SEFARIA_NAME_BY_SOURCE[id];
    const namespace = commentaryNamespace(JUDAISM_TRADITION_ID, id);
    let sourceCount = 0;

    for (const book of books) {
      const lastChapter = Math.min(book.chapters, opts.maxChapter);
      for (let chapter = 1; chapter <= lastChapter; chapter++) {
        const verses = await fetchCommentaryChapter(sefariaName, book.name, chapter);
        verses.forEach((comments, vi) => {
          const verse = vi + 1;
          // Corpus-prefixed refId matching the scripture store convention
          // ("quran:{surah}:{ayah}"). "torah" is the Five-Books corpus id (see
          // the rabbi scholar's primaryScriptureIds).
          const onRef = `torah:${book.name}:${chapter}:${verse}`;
          comments.forEach((raw, j) => {
            const text = cleanText(raw);
            if (!text) return; // untranslated / empty → honest absence
            records.push({
              sourceId: id,
              sourceTitle: source.title,
              author: source.author,
              onRef,
              chunkIndex: j,
              text,
              language: "en",
              tradition: JUDAISM_TRADITION_ID,
              namespace,
            });
            sourceCount++;
          });
        });
        await sleep(FETCH_DELAY_MS);
      }
    }
    console.log(`   ${id}: built ${sourceCount} excerpt(s).`);
  }

  console.log(`   Built ${records.length} commentary excerpt(s) total.`);
  await persistRecords(records, JUDAISM_TRADITION_ID, opts);
}

interface IslamBuildOptions {
  force: boolean;
  surah?: number;
  maxSurah: number;
  dryRun: boolean;
}

export async function ingestIslamCommentary(
  opts: IslamBuildOptions,
): Promise<void> {
  const { getCommentaryCanon, commentaryNamespace } = await import(
    "../config/scholars.js"
  );

  const canon = getCommentaryCanon(ISLAM_TRADITION_ID);
  const ingestable = Object.keys(TAFSIR_SLUG_BY_SOURCE)
    .map((id) => ({ id, source: canon.find((c) => c.id === id) }))
    .filter((x): x is { id: string; source: NonNullable<typeof x.source> } =>
      Boolean(x.source),
    );

  const firstSurah = opts.surah ?? 1;
  const lastSurah = opts.surah ?? Math.min(QURAN_SURAH_COUNT, opts.maxSurah);
  if (firstSurah < 1 || firstSurah > QURAN_SURAH_COUNT) {
    throw new Error(`Surah ${firstSurah} is out of range (1–${QURAN_SURAH_COUNT}).`);
  }

  console.log(
    `📖 Ingesting Islam tafsīr (${ingestable.map((x) => x.id).join(", ")}) ` +
      `over surah ${firstSurah}` +
      (lastSurah !== firstSurah ? `–${lastSurah}` : "") +
      (opts.force ? " — FORCE re-embed" : "") +
      (opts.dryRun ? " — DRY RUN" : ""),
  );

  const records: CommentaryRecord[] = [];
  for (const { id, source } of ingestable) {
    const slug = TAFSIR_SLUG_BY_SOURCE[id];
    const namespace = commentaryNamespace(ISLAM_TRADITION_ID, id);
    let sourceCount = 0;

    for (let surah = firstSurah; surah <= lastSurah; surah++) {
      const byAyah = await fetchTafsirSurah(slug, surah);
      const ayahs = Array.from(byAyah.entries()).sort((a, b) => a[0] - b[0]);
      for (const [ayah, full] of ayahs) {
        // Matches the Quran scripture store + reader convention exactly.
        const onRef = `quran:${surah}:${ayah}`;
        const chunks = splitIntoChunks(full, MAX_CHUNK_CHARS);
        chunks.forEach((text, j) => {
          records.push({
            sourceId: id,
            sourceTitle: source.title,
            author: source.author,
            onRef,
            chunkIndex: j,
            text,
            language: "en",
            tradition: ISLAM_TRADITION_ID,
            namespace,
          });
          sourceCount++;
        });
      }
      await sleep(FETCH_DELAY_MS);
    }
    console.log(`   ${id}: built ${sourceCount} excerpt(s).`);
  }

  console.log(`   Built ${records.length} commentary excerpt(s) total.`);
  await persistRecords(records, ISLAM_TRADITION_ID, opts);
}

interface BuddhismBuildOptions {
  force: boolean;
  sutta?: string;
  dryRun: boolean;
}

export async function ingestBuddhismCommentary(
  opts: BuddhismBuildOptions,
): Promise<void> {
  const { getCommentaryCanon, commentaryNamespace } = await import(
    "../config/scholars.js"
  );

  const canon = getCommentaryCanon(BUDDHISM_TRADITION_ID);
  const source = canon.find((c) => c.id === ATTHAKATHA_SOURCE_ID);
  if (!source) {
    throw new Error(
      `Buddhism canon is missing the "${ATTHAKATHA_SOURCE_ID}" source.`,
    );
  }
  const namespace = commentaryNamespace(BUDDHISM_TRADITION_ID, ATTHAKATHA_SOURCE_ID);

  let files = await fetchAtthakathaFiles();
  if (opts.sutta) {
    const want = opts.sutta.toLowerCase();
    const all = files.map((f) => f.suttaUid).join(", ") || "(none)";
    files = files.filter((f) => f.suttaUid.toLowerCase() === want);
    if (files.length === 0) {
      throw new Error(
        `No aṭṭhakathā available for sutta "${opts.sutta}". Available: ${all}.`,
      );
    }
  }

  console.log(
    `☸️  Ingesting Buddhism commentary (atthakatha — Sumaṅgalavilāsinī) over ` +
      `${files.map((f) => f.suttaUid).join(", ") || "(none available)"}` +
      (opts.force ? " — FORCE re-embed" : "") +
      (opts.dryRun ? " — DRY RUN" : ""),
  );

  const records: CommentaryRecord[] = [];
  let sourceCount = 0;
  for (const f of files) {
    const full = await fetchAtthakathaText(f.downloadUrl);
    if (!full) continue; // honest absence
    // Corpus prefix = bhikkhu's primaryScriptureId; the sutta is identified by
    // its SuttaCentral uid (e.g. "sutta-pitaka:dn2"). Prose suttas are anchored
    // at sutta granularity, with successive chunkIndex values for long commentary.
    const onRef = `sutta-pitaka:${f.suttaUid}`;
    const chunks = splitIntoChunks(full, MAX_CHUNK_CHARS);
    chunks.forEach((text, j) => {
      records.push({
        sourceId: ATTHAKATHA_SOURCE_ID,
        sourceTitle: source.title,
        author: source.author,
        onRef,
        chunkIndex: j,
        text,
        language: "en",
        tradition: BUDDHISM_TRADITION_ID,
        namespace,
      });
      sourceCount++;
    });
    await sleep(FETCH_DELAY_MS);
  }
  console.log(`   ${ATTHAKATHA_SOURCE_ID}: built ${sourceCount} excerpt(s).`);

  console.log(`   Built ${records.length} commentary excerpt(s) total.`);
  await persistRecords(records, BUDDHISM_TRADITION_ID, opts);
}

// Fetch one chapter of a helloao commentary and group it by the Bible verse it
// anchors to. helloao represents each commentary block as a `type:"verse"` item
// whose `number` is the starting verse of the passage the block discusses, so we
// key by that verse. A book/chapter the source does not cover returns 404 →
// empty map (honest absence) rather than an error.
async function fetchHelloaoChapter(
  commentaryId: string,
  bookId: string,
  chapter: number,
): Promise<Map<number, string>> {
  const url = `${HELLOAO_BASE}/${commentaryId}/${bookId}/${chapter}.json`;
  const res = await fetch(url);
  if (res.status === 404) return new Map();
  if (!res.ok) {
    throw new Error(`helloao fetch failed (${res.status}) for ${url}`);
  }
  const json: any = await res.json();
  const content = json?.chapter?.content;
  const byVerse = new Map<number, string>();
  if (!Array.isArray(content)) return byVerse;
  for (const item of content) {
    if (!item || item.type !== "verse") continue;
    const num = Number(item.number);
    if (!Number.isFinite(num) || num < 1) continue;
    const parts = Array.isArray(item.content) ? item.content : [];
    const text = cleanText(
      parts
        .map((p: unknown) =>
          typeof p === "string"
            ? p
            : p && typeof p === "object" && "text" in (p as any)
              ? String((p as any).text)
              : "",
        )
        .join(" "),
    );
    if (!text) continue;
    byVerse.set(num, byVerse.has(num) ? `${byVerse.get(num)} ${text}` : text);
  }
  return byVerse;
}

interface ChristianityBuildOptions {
  force: boolean;
  book?: string;
  maxChapter: number;
  dryRun: boolean;
}

export async function ingestChristianityCommentary(
  opts: ChristianityBuildOptions,
): Promise<void> {
  const { getCommentaryCanon, commentaryNamespace } = await import(
    "../config/scholars.js"
  );

  const canon = getCommentaryCanon(CHRISTIANITY_TRADITION_ID);
  // Only canon works that helloao serves can be ingested; the rest stay
  // honestly un-ingested.
  const ingestable = Object.keys(HELLOAO_COMMENTARY_BY_SOURCE)
    .map((id) => ({ id, source: canon.find((c) => c.id === id) }))
    .filter(
      (x): x is { id: string; source: NonNullable<typeof x.source> } =>
        Boolean(x.source),
    );
  if (ingestable.length === 0) {
    throw new Error(
      `Christianity canon has no source matching helloao ids: ${Object.keys(HELLOAO_COMMENTARY_BY_SOURCE).join(", ")}.`,
    );
  }

  const books = opts.book
    ? BIBLE_BOOKS.filter(
        (b) => b.name.toLowerCase() === opts.book!.toLowerCase(),
      )
    : BIBLE_BOOKS;
  if (books.length === 0) {
    throw new Error(
      `Unknown Bible book "${opts.book}". Expected a canonical name like "John".`,
    );
  }

  console.log(
    `✝️  Ingesting Christianity commentary (${ingestable.map((x) => x.id).join(", ")}) over ` +
      `${opts.book ? opts.book : `${books.length} book(s)`}` +
      (opts.force ? " — FORCE re-embed" : "") +
      (opts.dryRun ? " — DRY RUN" : ""),
  );

  const records: CommentaryRecord[] = [];
  for (const { id, source } of ingestable) {
    const commentaryId = HELLOAO_COMMENTARY_BY_SOURCE[id];
    const namespace = commentaryNamespace(CHRISTIANITY_TRADITION_ID, id);
    let sourceCount = 0;
    for (const book of books) {
      const lastChapter = Math.min(book.chapters, opts.maxChapter);
      for (let chapter = 1; chapter <= lastChapter; chapter++) {
        const byVerse = await fetchHelloaoChapter(commentaryId, book.id, chapter);
        const verses = Array.from(byVerse.entries()).sort((a, b) => a[0] - b[0]);
        for (const [verse, full] of verses) {
          // Corpus prefix = the priest's primaryScriptureId for the testament
          // ("bible-ot"/"bible-nt"); anchored at the passage's starting verse.
          const onRef = `bible-${book.testament}:${book.name}:${chapter}:${verse}`;
          const chunks = splitIntoChunks(full, MAX_CHUNK_CHARS);
          chunks.forEach((text, j) => {
            records.push({
              sourceId: id,
              sourceTitle: source.title,
              author: source.author,
              onRef,
              chunkIndex: j,
              text,
              language: "en",
              tradition: CHRISTIANITY_TRADITION_ID,
              namespace,
            });
            sourceCount++;
          });
        }
        await sleep(FETCH_DELAY_MS);
      }
    }
    console.log(`   ${id}: built ${sourceCount} excerpt(s).`);
  }

  console.log(`   Built ${records.length} commentary excerpt(s) total.`);
  await persistRecords(records, CHRISTIANITY_TRADITION_ID, opts);
}

// ─── Hinduism ────────────────────────────────────────────────────────────────

interface GitaCommentaryRow {
  author_id: number;
  verse_id: number;
  description: string;
}

// Fetches the gita/gita dataset once and returns: a verse_id → {chapter,verse}
// map (from verse.json) and the commentary rows grouped by author_id (from
// commentary.json). The dataset is a large but stable one-time download.
async function fetchGitaData(): Promise<{
  vmap: Map<number, { chapter: number; verse: number }>;
  byAuthor: Map<number, GitaCommentaryRow[]>;
}> {
  const [verseRes, commRes] = await Promise.all([
    fetch(GITA_VERSE_URL),
    fetch(GITA_COMMENTARY_URL),
  ]);
  if (!verseRes.ok) {
    throw new Error(`gita verse.json fetch failed: HTTP ${verseRes.status}`);
  }
  if (!commRes.ok) {
    throw new Error(
      `gita commentary.json fetch failed: HTTP ${commRes.status}`,
    );
  }
  const verses = (await verseRes.json()) as Array<Record<string, unknown>>;
  const comments = (await commRes.json()) as Array<Record<string, unknown>>;

  const vmap = new Map<number, { chapter: number; verse: number }>();
  for (const v of verses) {
    const id = Number(v.id);
    const chapter = Number(v.chapter_number);
    const verse = Number(v.verse_number);
    if (
      Number.isFinite(id) &&
      Number.isFinite(chapter) &&
      Number.isFinite(verse)
    ) {
      vmap.set(id, { chapter, verse });
    }
  }

  const byAuthor = new Map<number, GitaCommentaryRow[]>();
  for (const c of comments) {
    const author_id = Number(c.author_id);
    const verse_id = Number(c.verse_id);
    if (!Number.isFinite(author_id) || !Number.isFinite(verse_id)) continue;
    const arr = byAuthor.get(author_id) ?? [];
    arr.push({
      author_id,
      verse_id,
      description: String(c.description ?? ""),
    });
    byAuthor.set(author_id, arr);
  }
  return { vmap, byAuthor };
}

// Some dataset entries are placeholders noting the author did not comment on a
// given śloka (e.g. "Sri Sankaracharya did not comment on this sloka."). These
// are not real commentary and are skipped (honest absence per verse).
function isGitaPlaceholder(text: string): boolean {
  return /did not comment/i.test(text);
}

interface HinduismBuildOptions {
  force: boolean;
  maxChapter: number;
  dryRun: boolean;
}

export async function ingestHinduismCommentary(
  opts: HinduismBuildOptions,
): Promise<void> {
  const { getCommentaryCanon, commentaryNamespace } = await import(
    "../config/scholars.js"
  );

  const canon = getCommentaryCanon(HINDUISM_TRADITION_ID);
  // Only canon works the gita/gita dataset carries can be ingested; the rest of
  // the guru canon stays honestly un-ingested.
  const ingestable = Object.keys(GITA_AUTHOR_ID_BY_SOURCE)
    .map((id) => ({ id, source: canon.find((c) => c.id === id) }))
    .filter(
      (x): x is { id: string; source: NonNullable<typeof x.source> } =>
        Boolean(x.source),
    );
  if (ingestable.length === 0) {
    throw new Error(
      `Hinduism canon has no source matching gita author ids: ${Object.keys(GITA_AUTHOR_ID_BY_SOURCE).join(", ")}.`,
    );
  }

  console.log(
    `🕉️  Ingesting Hinduism commentary (${ingestable.map((x) => x.id).join(", ")}) over the Bhagavad Gītā` +
      (Number.isFinite(opts.maxChapter) ? ` (≤ ch.${opts.maxChapter})` : "") +
      (opts.force ? " — FORCE re-embed" : "") +
      (opts.dryRun ? " — DRY RUN" : ""),
  );

  const { vmap, byAuthor } = await fetchGitaData();

  const records: CommentaryRecord[] = [];
  for (const { id, source } of ingestable) {
    const authorId = GITA_AUTHOR_ID_BY_SOURCE[id];
    const namespace = commentaryNamespace(HINDUISM_TRADITION_ID, id);
    const rows = (byAuthor.get(authorId) ?? [])
      .slice()
      .sort((a, b) => a.verse_id - b.verse_id);
    let sourceCount = 0;
    for (const row of rows) {
      const loc = vmap.get(row.verse_id);
      if (!loc) continue; // unknown verse mapping → skip
      if (loc.chapter > opts.maxChapter) continue;
      const text = cleanText(row.description);
      if (!text || isGitaPlaceholder(text)) continue; // honest absence per verse
      const onRef = `${GITA_CORPUS}:${loc.chapter}:${loc.verse}`;
      const chunks = splitIntoChunks(text, MAX_CHUNK_CHARS);
      chunks.forEach((t, j) => {
        records.push({
          sourceId: id,
          sourceTitle: source.title,
          author: source.author,
          onRef,
          chunkIndex: j,
          text: t,
          // Original-language Sanskrit (Devanagari); the embedding model is
          // multilingual, so these remain semantically retrievable.
          language: "sa",
          tradition: HINDUISM_TRADITION_ID,
          namespace,
        });
        sourceCount++;
      });
    }
    console.log(`   ${id}: built ${sourceCount} excerpt(s).`);
  }

  console.log(`   Built ${records.length} commentary excerpt(s) total.`);
  await persistRecords(records, HINDUISM_TRADITION_ID, opts);
}

// ─── Sikhism ─────────────────────────────────────────────────────────────────

interface SikhismBuildOptions {
  force: boolean;
  dryRun: boolean;
}

export async function ingestSikhismCommentary(
  opts: SikhismBuildOptions,
): Promise<void> {
  // Honest absence: the granthi canon's sole declared work, the Faridkot Wala
  // Teeka, has no clean, verse-anchored, public-domain digital edition. The
  // available Sikh exegesis APIs serve a different work, so attributing it to the
  // Faridkot Teeka would misattribute. Nothing is ingested; persistRecords([])
  // is a no-op that keeps the run idempotent and the source honestly
  // un-ingested (getCommentaryAvailability reports ingested:false).
  console.log(
    `☬  Ingesting Sikhism commentary — no digitally available teeka source ` +
      `(the Faridkot Wala Teeka has no clean verse-anchored public-domain ` +
      `edition); nothing to ingest (honest absence)` +
      (opts.dryRun ? " — DRY RUN" : ""),
  );
  await persistRecords([], SIKHISM_TRADITION_ID, opts);
}

function parseArgs(argv: string[]): {
  tradition: string;
  force: boolean;
  dryRun: boolean;
  book?: string;
  maxChapter: number;
  surah?: number;
  maxSurah: number;
  sutta?: string;
} {
  const force = argv.includes("--force");
  const dryRun = argv.includes("--dry-run");

  const valueOf = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  // Parse a positive-integer flag value. A present-but-non-numeric value is a
  // user error → fail fast rather than silently falling back to a default.
  const positiveIntFlag = (
    flag: string,
    fallback: number,
  ): number => {
    const raw = valueOf(flag);
    if (raw === undefined) return fallback;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) {
      throw new Error(`${flag} expects a positive integer, got "${raw}".`);
    }
    return n;
  };
  const book = valueOf("--book");

  // Flag values must not be read as the positional tradition argument.
  const consumed = new Set<number>();
  for (const flag of [
    "--book",
    "--surah",
    "--max-chapter",
    "--max-surah",
    "--sutta",
  ]) {
    const idx = argv.indexOf(flag);
    if (idx >= 0) {
      consumed.add(idx);
      consumed.add(idx + 1);
    }
  }
  const positional = argv.filter((a, i) => !a.startsWith("--") && !consumed.has(i));
  const tradition = (positional[0] ?? "judaism").toLowerCase();

  const maxChapter = positiveIntFlag("--max-chapter", Infinity);
  const maxSurah = positiveIntFlag("--max-surah", QURAN_SURAH_COUNT);
  const surah =
    valueOf("--surah") === undefined ? undefined : positiveIntFlag("--surah", 1);
  const sutta = valueOf("--sutta");

  return { tradition, force, dryRun, book, maxChapter, surah, maxSurah, sutta };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  let args: ReturnType<typeof parseArgs>;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`❌ ${(err as Error).message}`);
    process.exit(1);
  }

  const run =
    args.tradition === "judaism"
      ? ingestJudaismCommentary({
          force: args.force,
          book: args.book,
          maxChapter: args.maxChapter,
          dryRun: args.dryRun,
        })
      : args.tradition === "islam"
        ? ingestIslamCommentary({
            force: args.force,
            surah: args.surah,
            maxSurah: args.maxSurah,
            dryRun: args.dryRun,
          })
        : args.tradition === "buddhism"
          ? ingestBuddhismCommentary({
              force: args.force,
              sutta: args.sutta,
              dryRun: args.dryRun,
            })
          : args.tradition === "christianity"
            ? ingestChristianityCommentary({
                force: args.force,
                book: args.book,
                maxChapter: args.maxChapter,
                dryRun: args.dryRun,
              })
            : args.tradition === "hinduism"
              ? ingestHinduismCommentary({
                  force: args.force,
                  maxChapter: args.maxChapter,
                  dryRun: args.dryRun,
                })
              : args.tradition === "sikhism"
                ? ingestSikhismCommentary({
                    force: args.force,
                    dryRun: args.dryRun,
                  })
                : null;

  if (run === null) {
    console.error(
      `❌ Unsupported tradition "${args.tradition}". Supported: judaism, islam, buddhism, christianity, hinduism, sikhism.`,
    );
    process.exit(1);
  }

  run
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Ingestion failed:", err);
      process.exit(1);
    });
}
