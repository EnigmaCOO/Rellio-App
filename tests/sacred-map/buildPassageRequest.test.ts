import { describe, it, expect } from 'vitest';
import { buildPassageRequest } from '@/features/sacred-map/SacredStory';
import type { ScriptureReference } from '@/features/sacred-map/types';
import eventsData from '../../client/public/data/events.json';

// Pull the real reference fixtures out of events.json so these tests track the
// actual /api/scriptures data shape rather than a hand-rolled copy.
interface RawEvent {
  id: string;
  references?: ScriptureReference[];
}
const events = (eventsData as { events: RawEvent[] }).events;

function refById(eventId: string, refId: string): ScriptureReference {
  const event = events.find((e) => e.id === eventId);
  if (!event) throw new Error(`fixture event not found: ${eventId}`);
  const ref = (event.references ?? []).find((r) => r.id === refId);
  if (!ref) throw new Error(`fixture reference not found: ${eventId}/${refId}`);
  return ref;
}

describe('buildPassageRequest', () => {
  describe('alquran.cloud (Qur\'an)', () => {
    it('maps a surah number to its display name and keeps the ayah range', () => {
      const ref = refById('evt_first_revelation', 'ref_quran_alalaq'); // surah 96
      const req = buildPassageRequest(ref);
      expect(req).toEqual({
        religion: 'islam',
        book: "Al-Alaq (The Clot)",
        chapter: 1,
        verseStart: 1,
        verseEnd: 5,
        continues: false,
      });
    });

    it('resolves a different surah (Maryam) from a parallel-tradition reference', () => {
      const ref = refById('evt_jesus_birth', 'ref_quran_maryam'); // surah 19
      const req = buildPassageRequest(ref);
      expect(req?.book).toBe('Maryam (Mary)');
      expect(req?.religion).toBe('islam');
      expect(req?.verseStart).toBe(16);
      expect(req?.verseEnd).toBe(34);
      expect(req?.continues).toBe(false);
    });

    it('returns null for an out-of-range surah number', () => {
      const ref: ScriptureReference = {
        id: 'ref_bad_surah',
        tradition: 'islam',
        work: "Qur'an",
        citation: 'Qur\'an 999:1',
        locator: { surah: 999, ayah_start: 1, ayah_end: 1 },
        source_system: 'alquran.cloud',
        deep_link_id: 'quran:999:1',
        role: 'primary',
      };
      expect(buildPassageRequest(ref)).toBeNull();
    });
  });

  describe('bible-api (Bible)', () => {
    it('builds a christianity request for a single-chapter range', () => {
      const ref = refById('evt_jesus_birth', 'ref_luke_nativity'); // Luke 2:1-20
      const req = buildPassageRequest(ref);
      expect(req).toEqual({
        religion: 'christianity',
        book: 'Luke',
        chapter: 2,
        verseStart: 1,
        verseEnd: 20,
        continues: false,
      });
    });
  });

  describe('sefaria (Torah)', () => {
    it('builds a judaism request from a sefaria reference', () => {
      const ref: ScriptureReference = {
        id: 'ref_genesis',
        tradition: 'judaism',
        work: 'Torah (Genesis)',
        citation: 'Genesis 1:1-5',
        locator: { book: 'Genesis', chapter: 1, verse_start: 1, verse_end: 5 },
        source_system: 'sefaria',
        deep_link_id: 'torah:genesis:1:1-5',
        role: 'primary',
      };
      const req = buildPassageRequest(ref);
      expect(req).toEqual({
        religion: 'judaism',
        book: 'Genesis',
        chapter: 1,
        verseStart: 1,
        verseEnd: 5,
        continues: false,
      });
    });

    it('also accepts the sefaria.org source_system alias', () => {
      const ref: ScriptureReference = {
        id: 'ref_exodus',
        tradition: 'judaism',
        work: 'Torah (Exodus)',
        citation: 'Exodus 20:1-2',
        locator: { book: 'Exodus', chapter: 20, verse_start: 1, verse_end: 2 },
        source_system: 'sefaria.org',
        deep_link_id: 'torah:exodus:20:1-2',
        role: 'primary',
      };
      expect(buildPassageRequest(ref)?.religion).toBe('judaism');
    });
  });

  describe('cross-chapter ranges', () => {
    it('flags continues=true and opens the verse range when the citation spans chapters', () => {
      const ref = refById('evt_jesus_birth', 'ref_matthew_nativity'); // Matthew 1:18-2:12
      const req = buildPassageRequest(ref);
      expect(req?.religion).toBe('christianity');
      expect(req?.book).toBe('Matthew');
      expect(req?.chapter).toBe(1);
      expect(req?.verseStart).toBe(18);
      expect(req?.continues).toBe(true);
      // verseEnd is opened to infinity so the whole start chapter shows as an excerpt.
      expect(req?.verseEnd).toBe(Number.POSITIVE_INFINITY);
    });
  });

  describe('unsupported sources', () => {
    it('returns null for hadith-api (citation-only fallback)', () => {
      const ref = refById('evt_first_revelation', 'ref_bukhari_wahy');
      expect(buildPassageRequest(ref)).toBeNull();
    });

    it('returns null for an unknown source_system like suttacentral', () => {
      const ref: ScriptureReference = {
        id: 'ref_sutta',
        tradition: 'buddhism',
        work: 'Pali Canon',
        citation: 'DN 16',
        locator: { nikaya: 'digha', sutta: 16 },
        source_system: 'suttacentral',
        deep_link_id: 'sutta:dn:16',
        role: 'primary',
      };
      expect(buildPassageRequest(ref)).toBeNull();
    });
  });
});
