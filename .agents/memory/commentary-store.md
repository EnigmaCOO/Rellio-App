---
name: Commentary vector store conventions
description: How commentary_chunks is keyed/anchored and the rules the per-tradition commentary ingestion tasks must follow.
---

# Commentary vector store (Scholar Engine)

Mirrors the scripture store (`scripture_chunks`): 768-dim vector, HNSW cosine,
add-only, NOT wired into any runtime pipeline. Bootstrapped by raw SQL in
`scripts/setup-pgvector.ts` (drizzle-kit can't make the vector/HNSW index).

## onRef anchoring — corpus-prefixed scripture refId
Each excerpt's `onRef` is the **scripture refId of the verse it comments on**,
corpus-prefixed exactly like the scripture store: Quran is `quran:{surah}:{ayah}`,
Torah is `torah:{Book}:{chapter}:{verse}` (e.g. `torah:Genesis:1:1`).
**Why:** when scripture for a tradition is later ingested + the pipelines are
wired, commentary must join to scripture refIds without normalization. The corpus
prefix = the scholar's `primaryScriptureId` (mufti→`quran`, rabbi→`torah`).
**How to apply:** every downstream commentary tradition (Islam→`quran:..`,
Buddhism→`sutta-pitaka:..`, etc.) anchors onRef to its own corpus id the same way.

## Namespace + idempotency
- namespace = `commentary:{tradition}:{sourceId}` (e.g. `commentary:judaism:rashi`).
- Idempotency/unique key = (namespace, onRef, chunkIndex) — chunkIndex lets one
  source have MULTIPLE excerpts per verse without dupes on re-run. `--force`
  re-upserts in place (stale higher chunkIndex rows can linger if upstream shrinks;
  acceptable since sources are stable).
- `commentaryNamespace()` lives in `config/scholars.ts` (a neutral module both the
  ingestion script and read helpers already import) so the read helpers in
  `lib/retrieval/commentary.ts` stay UNREFERENCED — the add-only guarantee.

## Declared vs ingested availability
Don't greenfield a parallel source list. The DECLARED canon is
`commentaryCanon` in `config/scholars.ts` (with a static `availability` hint).
INGESTED truth is derived from DB counts: `getCommentaryAvailability(tradition)`
groups `commentary_chunks` by namespace and annotates each canon source with
`ingested`/`chunkCount`.

## Islam specifics (tafsīr)
- Source: spa5k `tafsir_api` per-surah bundles on jsDelivr
  (`…/tafsir/{slug}/{surah}.json`). Bundle shape DIFFERS per edition: Ibn Kathīr
  = bare array; Jalālayn = `{ ayahs: [...] }` — normalize, anchor by the body's
  `ayah` field. onRef = `quran:{surah}:{ayah}`.
- Only `ibn-kathir`→`en-tafisr-ibn-kathir` and `jalalayn`→`en-al-jalalayn` are
  ingested. EXCLUDED on purpose: Ṭabarī/Qurṭubī/Rāzī (Arabic-only editions),
  Mīzān (absent), and Wāḥidī — the `en-asbab-al-nuzul-by-al-wahidi` slug serves
  MISMATCHED Sufi text, so ingesting it would misattribute. **Why:** guardrail —
  never attribute commentary to a source whose real text wasn't ingested; verify
  edition content on-topic before mapping a canon id to an API slug.
- Long tafsīr entries are split (`splitIntoChunks`, ~4000 chars) into successive
  chunkIndex excerpts per verse to stay under the embedding token budget.

## Buddhism specifics (aṭṭhakathā)
- Source: SuttaCentral `bilara-data` GitHub repo, English translation of the
  classical Theravāda Aṭṭhakathā. Dir listing via GitHub contents API; files via
  their `download_url`. **Key gotcha:** the only commentary translation lives on
  the **`unpublished`** branch (an in-progress, CC0 work) — `published` is empty.
- Only the canon `atthakatha` source is ingested → the **Sumaṅgalavilāsinī** (the
  Dīgha Nikāya commentary, `dn-a`, author `comm-team`). Coverage is currently just
  `dn2` (Sāmaññaphala). File listing is dynamic so new suttas auto-ingest.
- `visuddhimagga` canon source: NOT on SuttaCentral → honestly not ingested
  (ingested:false). Also deliberately SKIP SuttaCentral's modern translator-notes
  (`comment`) layer — attributing it to the classical aṭṭhakathā would misattribute
  (same guardrail as the Islam Wāḥidī exclusion).
- onRef = `sutta-pitaka:{suttaUid}` (e.g. `sutta-pitaka:dn2`). Prose suttas are
  anchored at SUTTA granularity (not per-verse): all of a sutta's commentary
  segments are concatenated in document order, then `splitIntoChunks` into
  successive chunkIndex excerpts. Corpus prefix = bhikkhu `primaryScriptureId`
  (`sutta-pitaka`); sutta identified by its SuttaCentral uid.
- Scope-limit flag is `--sutta <uid>` (string, e.g. `--sutta dn2`), parallel to
  Islam's `--surah`.

## Christianity specifics (Bible commentary)
- Source: helloao **Free Use Bible API** (`bible.helloao.org`), a clean CDN-backed
  public-domain commentary API. Commentary chapter =
  `…/api/c/{commentaryId}/{USFM-book}/{chapter}.json`; `chapter.content` is an
  array of `type:"verse"` items whose `number` is the **starting verse** of the
  passage the block discusses (passage-level anchoring, not strictly per-verse).
- Only `matthew-henry` is ingested. From helloao's set
  (adam-clarke, jamieson-fausset-brown, john-gill, keil-delitzsch, matthew-henry,
  tyndale) ONLY Matthew Henry matches a priest-canon source id, so it's the only
  safe map. **Why:** the rest of the priest canon — Church Fathers
  (Chrysostom/Augustine/Jerome), Calvin, Catena Aurea (only Portuguese JSON
  found), Summa (systematic, not verse-anchored) — have no clean verse-anchored
  English JSON, so honestly left ingested:false rather than misattributing.
- onRef = `bible-{ot|nt}:{Book}:{chapter}:{verse}` — corpus prefix is the priest's
  per-testament `primaryScriptureId` (`bible-ot`/`bible-nt`), so OT vs NT books get
  different prefixes (unlike single-corpus traditions).
- **Gotcha:** helloao `books.json` chapter counts are UNRELIABLE (e.g. Matthew=18,
  Jonah=1, Isaiah=67) and Song of Solomon is absent for MH — so use a hardcoded
  canonical 66-book `BIBLE_BOOKS` table (name/USFM-id/testament/chapters), iterate
  1..canonicalChapters, and treat 404/empty as honest absence.
- Scope-limit flags reuse Judaism's `--book <Name>` + `--max-chapter <N>` (book
  match is strict canonical-name equality, case-insensitive; aliases like "Song of
  Songs" won't resolve).

## Hinduism specifics (Gītā bhāṣyas)
- Source: **gita/gita** GitHub JSON dataset (Unlicense = public domain):
  `data/commentary.json` (11186 entries) + `data/verse.json` (701 Gītā ślokas).
  Commentary entry fields: `author_id`, `verse_id`, `description`, `lang`. Anchor
  via `verse_id` → `verse.json` `{chapter_number, verse_number}`.
- Only the 4 guru-canon Gītā-bhāṣya authors are mapped (canon id → dataset
  author_id): shankara→14, ramanuja→7, madhva→5, sridhara→8.
- **Language gotcha:** these 4 canon authors exist in the dataset ONLY in original
  SANSKRIT (Devanagari), so they're embedded with `language:"sa"` (gemini embedding
  is multilingual) — the only tradition not embedded as `en`. The dataset's lone
  ENGLISH commentary (701 entries) is by a NON-canon author (Sivananda, id 16), so
  it is deliberately NOT mapped — attributing it to a canon bhāṣyakāra would
  misattribute (same guardrail as Islam Wāḥidī / Christianity Catena).
- Honest absence per verse: skip empty + `did not comment` placeholder entries
  (Śaṅkara ~56, Madhva ~288 placeholders). The guru canon's Upaniṣad/Veda bhāṣyas
  have no clean verse-anchored public-domain JSON → left ingested:false.
- onRef = `bhagavad-gita:{chapter}:{verse}` (corpus prefix = guru primaryScriptureId).
  Scope flag reuses `--max-chapter <N>` (Gītā chapters 1..18). Dry-run excerpt
  counts: shankara 656, ramanuja 702, madhva 413, sridhara 700.
- **Devanagari chunking caveat:** `splitIntoChunks` sentence regex is `[.!?]`, which
  Sanskrit danda (`।`/`॥`) never matches → long entries fall back to hard char
  slices (correct, just lower-quality boundaries). Left as-is.

## Sikhism specifics (honest absence — no source)
- The granthi canon declares ONE work: the **Faridkot Wala Teeka** (`faridkot-teeka`).
  No clean, verse-anchored, public-domain digital edition exists. The Sikh APIs
  (BaniDB `api.banidb.com`, GurbaniNow `api.gurbaninow.com`) serve only Prof. Sahib
  Singh's "Sri Guru Granth Darpan" (a DIFFERENT 20th-c. work) as Punjabi exegesis —
  mapping faridkot-teeka to it would misattribute. **So Sikhism ingests ZERO rows.**
- The `sikhism` branch is an explicit no-op: logs the absence + calls
  `persistRecords([], "sikhism", ...)` (idempotent). `getCommentaryAvailability`
  generically reports the canon source as ingested:false. If a real verse-anchored
  teeka appears, anchor onRef to `guru-granth-sahib:{...}`.

## Judaism specifics (first tradition)
- Source: Sefaria texts API `…/api/texts/{Source}_on_{Book}.{chapter}` — `text`
  is a verse-indexed array of HTML comment strings (strip tags).
- Only the VERSE-ANCHORED Torah commentaries are ingested: Rashi, Ibn Ezra,
  Ramban, Sforno. Talmud / Midrash / Mishneh Torah are declared but not cleanly
  verse-anchored → intentionally not ingested → availability shows ingested:false.
- English translation layer embedded (language `en`); verses with no English
  translation are skipped (honest absence).
