/**
 * Scripture seed script — run with `npm run db:seed`
 *
 * Populates the `scriptures` table with the exact minimum-viable local bundle:
 *   - Christianity: Genesis 1:1-10 (KJV) — 10 verses
 *   - Islam:        Al-Fatihah 1:1-7 — 7 verses
 *   - Judaism:      Bereshit (Genesis) 1:1-10 (JPS) — 10 verses
 *   - Hinduism:     Bhagavad Gita Chapter 1 (from server/data/bhagavad_gita.json)
 *   - Buddhism:     Dhammapada Chapter 1 vv.1-10 — 10 verses
 *
 * Idempotent: skips any verse that already exists (religion+book+chapter+verse).
 *
 * IMPORTANT: Book names are kept in sync with server/services/scripture.ts so that
 * the DB-first lookup in externalScripture.ts correctly serves offline content.
 */

import { fileURLToPath } from 'url';
import * as fs from 'fs';
import * as path from 'path';

// ─── Seed types ───────────────────────────────────────────────────────────────

interface SeedVerse {
  religion: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
}

// ─── Christianity — Genesis 1:1-10 (KJV) ─────────────────────────────────────

const CHRISTIANITY_SEED: SeedVerse[] = [
  { religion: 'christianity', book: 'Genesis', chapter: 1, verse: 1, text: 'In the beginning God created the heaven and the earth.', translation: 'KJV' },
  { religion: 'christianity', book: 'Genesis', chapter: 1, verse: 2, text: 'And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.', translation: 'KJV' },
  { religion: 'christianity', book: 'Genesis', chapter: 1, verse: 3, text: 'And God said, Let there be light: and there was light.', translation: 'KJV' },
  { religion: 'christianity', book: 'Genesis', chapter: 1, verse: 4, text: 'And God saw the light, that it was good: and God divided the light from the darkness.', translation: 'KJV' },
  { religion: 'christianity', book: 'Genesis', chapter: 1, verse: 5, text: 'And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day.', translation: 'KJV' },
  { religion: 'christianity', book: 'Genesis', chapter: 1, verse: 6, text: 'And God said, Let there be a firmament in the midst of the waters, and let it divide the waters from the waters.', translation: 'KJV' },
  { religion: 'christianity', book: 'Genesis', chapter: 1, verse: 7, text: 'And God made the firmament, and divided the waters which were under the firmament from the waters which were above the firmament: and it was so.', translation: 'KJV' },
  { religion: 'christianity', book: 'Genesis', chapter: 1, verse: 8, text: 'And God called the firmament Heaven. And the evening and the morning were the second day.', translation: 'KJV' },
  { religion: 'christianity', book: 'Genesis', chapter: 1, verse: 9, text: 'And God said, Let the waters under the heaven be gathered together unto one place, and let the dry land appear: and it was so.', translation: 'KJV' },
  { religion: 'christianity', book: 'Genesis', chapter: 1, verse: 10, text: 'And God called the dry land Earth; and the gathering together of the waters called he Seas: and God saw that it was good.', translation: 'KJV' },
];

// ─── Islam — Al-Fatihah 1:1-7 ────────────────────────────────────────────────
// Book name matches exactly the catalog in server/services/scripture.ts

const ISLAM_SEED: SeedVerse[] = [
  { religion: 'islam', book: 'Al-Fatihah (The Opening)', chapter: 1, verse: 1, text: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.', translation: 'Sahih International' },
  { religion: 'islam', book: 'Al-Fatihah (The Opening)', chapter: 1, verse: 2, text: 'All praise is due to Allah, Lord of the worlds.', translation: 'Sahih International' },
  { religion: 'islam', book: 'Al-Fatihah (The Opening)', chapter: 1, verse: 3, text: 'The Entirely Merciful, the Especially Merciful.', translation: 'Sahih International' },
  { religion: 'islam', book: 'Al-Fatihah (The Opening)', chapter: 1, verse: 4, text: 'Sovereign of the Day of Recompense.', translation: 'Sahih International' },
  { religion: 'islam', book: 'Al-Fatihah (The Opening)', chapter: 1, verse: 5, text: 'It is You we worship and You we ask for help.', translation: 'Sahih International' },
  { religion: 'islam', book: 'Al-Fatihah (The Opening)', chapter: 1, verse: 6, text: 'Guide us to the straight path.', translation: 'Sahih International' },
  { religion: 'islam', book: 'Al-Fatihah (The Opening)', chapter: 1, verse: 7, text: 'The path of those upon whom You have bestowed favor, not of those who have evoked Your anger or of those who are astray.', translation: 'Sahih International' },
];

// ─── Judaism — Bereshit 1:1-10 (JPS) ─────────────────────────────────────────
// Book name matches server/services/scripture.ts: "Bereshit"

const JUDAISM_SEED: SeedVerse[] = [
  { religion: 'judaism', book: 'Bereshit', chapter: 1, verse: 1, text: 'In the beginning God created the heaven and the earth.', translation: 'JPS' },
  { religion: 'judaism', book: 'Bereshit', chapter: 1, verse: 2, text: 'Now the earth was unformed and void, and darkness was upon the face of the deep; and the spirit of God hovered over the face of the waters.', translation: 'JPS' },
  { religion: 'judaism', book: 'Bereshit', chapter: 1, verse: 3, text: 'And God said: "Let there be light." And there was light.', translation: 'JPS' },
  { religion: 'judaism', book: 'Bereshit', chapter: 1, verse: 4, text: 'And God saw the light, that it was good; and God divided the light from the darkness.', translation: 'JPS' },
  { religion: 'judaism', book: 'Bereshit', chapter: 1, verse: 5, text: 'And God called the light Day, and the darkness He called Night. And there was evening and there was morning, one day.', translation: 'JPS' },
  { religion: 'judaism', book: 'Bereshit', chapter: 1, verse: 6, text: 'And God said: "Let there be a firmament in the midst of the waters, and let it divide the waters from the waters."', translation: 'JPS' },
  { religion: 'judaism', book: 'Bereshit', chapter: 1, verse: 7, text: 'And God made the firmament, and divided the waters which were under the firmament from the waters which were above the firmament; and it was so.', translation: 'JPS' },
  { religion: 'judaism', book: 'Bereshit', chapter: 1, verse: 8, text: 'And God called the firmament Heaven. And there was evening and there was morning, a second day.', translation: 'JPS' },
  { religion: 'judaism', book: 'Bereshit', chapter: 1, verse: 9, text: 'And God said: "Let the waters under the heaven be gathered together unto one place, and let the dry land appear." And it was so.', translation: 'JPS' },
  { religion: 'judaism', book: 'Bereshit', chapter: 1, verse: 10, text: 'And God called the dry land Earth, and the gathering together of the waters He called Seas; and God saw that it was good.', translation: 'JPS' },
];

// ─── Buddhism — Dhammapada Chapter 1 vv.1-10 ─────────────────────────────────
// Book name matches getTripitakaContent: "Dhammapada"

const BUDDHISM_SEED: SeedVerse[] = [
  { religion: 'buddhism', book: 'Dhammapada', chapter: 1, verse: 1, text: 'All that we are is the result of what we have thought: it is founded on our thoughts, it is made up of our thoughts. If a man speaks or acts with an evil thought, pain follows him, as the wheel follows the foot of the ox that draws the carriage.', translation: 'English' },
  { religion: 'buddhism', book: 'Dhammapada', chapter: 1, verse: 2, text: 'All that we are is the result of what we have thought: it is founded on our thoughts, it is made up of our thoughts. If a man speaks or acts with a pure thought, happiness follows him, like a shadow that never departs.', translation: 'English' },
  { religion: 'buddhism', book: 'Dhammapada', chapter: 1, verse: 3, text: '"He abused me, he beat me, he defeated me, he robbed me" — in those who harbour such thoughts hatred will never cease.', translation: 'English' },
  { religion: 'buddhism', book: 'Dhammapada', chapter: 1, verse: 4, text: '"He abused me, he beat me, he defeated me, he robbed me" — in those who do not harbour such thoughts hatred will quickly cease.', translation: 'English' },
  { religion: 'buddhism', book: 'Dhammapada', chapter: 1, verse: 5, text: 'Hatred does not cease by hatred, but only by love; this is the eternal rule.', translation: 'English' },
  { religion: 'buddhism', book: 'Dhammapada', chapter: 1, verse: 6, text: 'The world does not know that we must all come to an end here; but those who know it, their quarrels cease at once.', translation: 'English' },
  { religion: 'buddhism', book: 'Dhammapada', chapter: 1, verse: 7, text: 'He who lives looking for pleasures only, his senses uncontrolled, immoderate in his food, idle and weak, Mara will certainly overthrow him, as the wind throws down a weak tree.', translation: 'English' },
  { religion: 'buddhism', book: 'Dhammapada', chapter: 1, verse: 8, text: 'He who lives without looking for pleasures, his senses well controlled, moderate in his food, faithful and strong, him Mara will certainly not overthrow, any more than the wind throws down a rocky mountain.', translation: 'English' },
  { religion: 'buddhism', book: 'Dhammapada', chapter: 1, verse: 9, text: 'He who wishes to put on the yellow robe without having cleansed himself from sin, who disregards also temperance and truth, is unworthy of the yellow robe.', translation: 'English' },
  { religion: 'buddhism', book: 'Dhammapada', chapter: 1, verse: 10, text: 'But he who has cleansed himself from sin, is well grounded in all virtues, and regards also temperance and truth, he is indeed worthy of the yellow robe.', translation: 'English' },
];

// ─── Load Bhagavad Gita Chapter 1 from local JSON ────────────────────────────

function loadBhagavadGitaChapterOne(): SeedVerse[] {
  const gitaPath = path.resolve(process.cwd(), 'server/data/bhagavad_gita.json');
  const raw = fs.readFileSync(gitaPath, 'utf8');
  const data = JSON.parse(raw) as {
    chapters: Array<{
      number: number;
      title: string;
      verses: Array<{ number: number; translation: string }>;
    }>;
  };

  const chapter = data.chapters.find(c => c.number === 1);
  if (!chapter) {
    throw new Error('Bhagavad Gita Chapter 1 not found in server/data/bhagavad_gita.json');
  }

  return chapter.verses
    .filter(v => v.translation?.trim())
    .map(v => ({
      religion: 'hinduism',
      book: 'Bhagavad Gita',
      chapter: 1,
      verse: v.number,
      text: v.translation.trim(),
      translation: 'English',
    }));
}

// ─── Core seeding logic ───────────────────────────────────────────────────────

export async function seedScriptures(): Promise<void> {
  // Dynamic imports so the module is safely importable without DATABASE_URL
  const { db } = await import('../server/db.js');
  const { scriptures } = await import('../shared/schema.js');
  const { eq, and } = await import('drizzle-orm');

  const allVerses: SeedVerse[] = [
    ...CHRISTIANITY_SEED,
    ...ISLAM_SEED,
    ...JUDAISM_SEED,
    ...BUDDHISM_SEED,
    ...loadBhagavadGitaChapterOne(),
  ];

  const traditionCounts: Record<string, number> = {};
  for (const v of allVerses) {
    traditionCounts[v.religion] = (traditionCounts[v.religion] ?? 0) + 1;
  }

  console.log(`📖 Seeding ${allVerses.length} total verses across 5 traditions:`);
  for (const [rel, count] of Object.entries(traditionCounts)) {
    console.log(`   ${rel}: ${count} verse(s)`);
  }

  let inserted = 0;
  let skipped = 0;

  for (const verse of allVerses) {
    const existing = await db
      .select({ id: scriptures.id })
      .from(scriptures)
      .where(
        and(
          eq(scriptures.religion, verse.religion),
          eq(scriptures.book, verse.book),
          eq(scriptures.chapter, verse.chapter),
          eq(scriptures.verse, verse.verse)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    await db.insert(scriptures).values({
      religion: verse.religion,
      book: verse.book,
      chapter: verse.chapter,
      verse: verse.verse,
      text: verse.text,
      translation: verse.translation,
    });
    inserted++;
  }

  console.log(`✅ Done — inserted: ${inserted}, skipped (already exists): ${skipped}`);
}

// ─── CLI entrypoint ───────────────────────────────────────────────────────────

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  seedScriptures()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Seed failed:', err);
      process.exit(1);
    });
}
