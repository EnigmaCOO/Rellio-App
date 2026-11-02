/**
 * Scripture ingestion — run with `npx tsx scripts/ingest-scriptures.ts [tradition] [flags]`
 *
 * Embeds scripture verses into the `scripture_chunks` pgvector store. This phase
 * ships tradition 1 only: the Quran (Arabic source + an English translation).
 *
 * Usage:
 *   npx tsx scripts/ingest-scriptures.ts                 # ingest the Quran
 *   npx tsx scripts/ingest-scriptures.ts quran           # explicit tradition
 *   npx tsx scripts/ingest-scriptures.ts quran --force   # re-embed everything
 *   npx tsx scripts/ingest-scriptures.ts quran --max-surah 3   # partial run
 *
 * Idempotent: existing rows (keyed on ref_id + namespace) are skipped unless
 * --force is passed, in which case they are re-embedded and upserted.
 *
 * Run scripts/setup-pgvector.ts once before the first ingestion.
 *
 * Sources (alquran.cloud):
 *   - Arabic original:   edition "quran-uthmani"   (original_lang "ar")
 *   - English meaning:   edition "en.asad"         (translation_source "en.asad")
 * The namespace is "quran:en.asad". Canonical refId is "quran:{surah}:{ayah}".
 */

import { fileURLToPath } from "url";

const ARABIC_EDITION = "quran-uthmani";
const TRANSLATION_EDITION = "en.asad";
const NAMESPACE = `quran:${TRANSLATION_EDITION}`;
const TRADITION_ID = "islam"; // TraditionId for the Quran
const EMBED_BATCH_SIZE = 96;
const BATCH_DELAY_MS = 250;

interface AlQuranAyah {
  numberInSurah: number;
  text: string;
}

interface AlQuranSurah {
  number: number;
  ayahs: AlQuranAyah[];
}

interface ChunkRecord {
  refId: string;
  tradition: string;
  book: string;
  chapter: number;
  verse: number;
  originalText: string;
  originalLang: string;
  translation: string;
  translationSource: string;
  namespace: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchEdition(edition: string): Promise<AlQuranSurah[]> {
  const url = `https://api.alquran.cloud/v1/quran/${edition}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`alquran.cloud error for edition "${edition}": ${res.status}`);
  }
  const json = (await res.json()) as { data?: { surahs?: AlQuranSurah[] } };
  const surahs = json.data?.surahs;
  if (!Array.isArray(surahs) || surahs.length === 0) {
    throw new Error(`alquran.cloud returned no surahs for edition "${edition}".`);
  }
  return surahs;
}

function buildRecords(
  arabic: AlQuranSurah[],
  english: AlQuranSurah[],
  surahNames: string[],
  maxSurah: number,
): ChunkRecord[] {
  const englishBySurah = new Map<number, Map<number, string>>();
  for (const surah of english) {
    const byAyah = new Map<number, string>();
    for (const ayah of surah.ayahs) byAyah.set(ayah.numberInSurah, ayah.text);
    englishBySurah.set(surah.number, byAyah);
  }

  const records: ChunkRecord[] = [];
  for (const surah of arabic) {
    if (surah.number > maxSurah) continue;
    const englishAyahs = englishBySurah.get(surah.number);
    if (!englishAyahs) {
      throw new Error(`Missing English edition for surah ${surah.number}.`);
    }
    const book = surahNames[surah.number - 1] ?? `Surah ${surah.number}`;
    for (const ayah of surah.ayahs) {
      const translation = englishAyahs.get(ayah.numberInSurah);
      if (!translation) {
        throw new Error(
          `Missing English ayah ${surah.number}:${ayah.numberInSurah}.`,
        );
      }
      records.push({
        refId: `quran:${surah.number}:${ayah.numberInSurah}`,
        tradition: TRADITION_ID,
        book,
        chapter: surah.number,
        verse: ayah.numberInSurah,
        originalText: ayah.text,
        originalLang: "ar",
        translation,
        translationSource: TRANSLATION_EDITION,
        namespace: NAMESPACE,
      });
    }
  }
  return records;
}

export async function ingestQuran(opts: { force: boolean; maxSurah: number }): Promise<void> {
  const { db } = await import("../server/db.js");
  const { scriptureChunks } = await import("../shared/schema.js");
  const { QURAN_SURAH_NAMES } = await import("../server/services/externalScripture.js");
  const { embedBatch } = await import("../server/services/embeddings.js");
  const { eq, sql } = await import("drizzle-orm");

  console.log(
    `📖 Ingesting Quran (namespace "${NAMESPACE}", up to surah ${opts.maxSurah})` +
      (opts.force ? " — FORCE re-embed" : ""),
  );

  console.log("⬇️  Fetching Arabic + English editions…");
  const [arabic, english] = await Promise.all([
    fetchEdition(ARABIC_EDITION),
    fetchEdition(TRANSLATION_EDITION),
  ]);

  let records = buildRecords(arabic, english, QURAN_SURAH_NAMES, opts.maxSurah);
  console.log(`   Built ${records.length} verse record(s).`);

  if (!opts.force) {
    const existingRows = await db
      .select({ refId: scriptureChunks.refId })
      .from(scriptureChunks)
      .where(eq(scriptureChunks.namespace, NAMESPACE));
    const existing = new Set(existingRows.map((r) => r.refId));
    const before = records.length;
    records = records.filter((r) => !existing.has(r.refId));
    console.log(
      `   ${existing.size} already embedded; ${before - records.length} skipped, ` +
        `${records.length} to embed.`,
    );
  }

  if (records.length === 0) {
    console.log("✅ Nothing to do — store already up to date.");
    return;
  }

  let upserted = 0;
  for (let i = 0; i < records.length; i += EMBED_BATCH_SIZE) {
    const batch = records.slice(i, i + EMBED_BATCH_SIZE);
    const vectors = await embedBatch(batch.map((r) => r.translation));

    const rows = batch.map((r, j) => ({ ...r, embedding: vectors[j] }));

    // On conflict (same ref_id + namespace), overwrite with the incoming
    // (excluded) values — including the freshly computed embedding. This makes
    // --force re-ingestion replace stale rows rather than keep old data.
    await db
      .insert(scriptureChunks)
      .values(rows)
      .onConflictDoUpdate({
        target: [scriptureChunks.refId, scriptureChunks.namespace],
        set: {
          tradition: sql`excluded.tradition`,
          book: sql`excluded.book`,
          chapter: sql`excluded.chapter`,
          verse: sql`excluded.verse`,
          originalText: sql`excluded.original_text`,
          originalLang: sql`excluded.original_lang`,
          translation: sql`excluded.translation`,
          translationSource: sql`excluded.translation_source`,
          embedding: sql`excluded.embedding`,
        },
      });

    upserted += rows.length;
    console.log(`   …upserted ${upserted}/${records.length}`);
    if (i + EMBED_BATCH_SIZE < records.length) await sleep(BATCH_DELAY_MS);
  }

  console.log(`✅ Ingestion complete — ${upserted} verse(s) embedded & upserted.`);
}

function parseArgs(argv: string[]): { tradition: string; force: boolean; maxSurah: number } {
  const force = argv.includes("--force");
  const maxIdx = argv.indexOf("--max-surah");
  const maxRaw = maxIdx >= 0 ? argv[maxIdx + 1] : undefined;

  // Indices consumed by flags (and their values) must not be read as positional,
  // so `--max-surah 3` on its own still defaults the tradition to "quran".
  const consumed = new Set<number>();
  if (maxIdx >= 0) {
    consumed.add(maxIdx);
    consumed.add(maxIdx + 1);
  }
  const positional = argv.filter((a, i) => !a.startsWith("--") && !consumed.has(i));
  const tradition = (positional[0] ?? "quran").toLowerCase();

  const parsedMax = maxRaw ? Math.max(1, Number.parseInt(maxRaw, 10)) : 114;
  const maxSurah = Number.isFinite(parsedMax) ? parsedMax : 114;
  return { tradition, force, maxSurah };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const { tradition, force, maxSurah } = parseArgs(process.argv.slice(2));
  if (tradition !== "quran") {
    console.error(
      `❌ Unsupported tradition "${tradition}". This phase ships the Quran only.`,
    );
    process.exit(1);
  }
  ingestQuran({ force, maxSurah })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Ingestion failed:", err);
      process.exit(1);
    });
}
