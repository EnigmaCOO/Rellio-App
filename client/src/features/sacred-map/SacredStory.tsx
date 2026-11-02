// Sacred Map — the expanded "story" reader for a single event.
//
// Replaces the simple event card with a scrollable storyboard: it renders the
// event's `story.sections` in order, pulls live scripture passages for any
// cited references (reusing the existing /api/scriptures service), and offers
// entry points into the rest of the app — "Read in full" deep-links into the
// Read tab and "Ask" buttons seed the AI chat. Everything degrades gracefully:
// events without deep content still render from their `description`, and any
// reference whose source can't be fetched falls back to a plain citation.

import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { BookOpen, ExternalLink, MessageCircleQuestion } from "lucide-react";
import type {
  EnrichedEvent,
  MediaItem,
  RelatedBook,
  ResolvedFigure,
  SacredSource,
  ScriptureReference,
  StorySection,
} from "./types";

const GOLD = "#bf9a3a";

function isMythicAge(precision: string): boolean {
  return precision === "legendary" || precision === "mythological";
}

// Surah number → display name, mirroring the list the scripture service uses to
// resolve a Qur'an `book` param back to a surah. This is a lookup table, not
// scripture text. Index 0 = surah 1.
const QURAN_SURAH_NAMES: string[] = [
  "Al-Fatihah (The Opening)", "Al-Baqarah (The Cow)", "Al-Imran (Family of Imran)",
  "An-Nisa (The Women)", "Al-Maidah (The Table)", "Al-An'am (The Cattle)",
  "Al-A'raf (The Heights)", "Al-Anfal (The Spoils of War)", "At-Tawbah (The Repentance)",
  "Yunus (Jonah)", "Hud (Hud)", "Yusuf (Joseph)", "Ar-Ra'd (The Thunder)",
  "Ibrahim (Abraham)", "Al-Hijr (The Rocky Tract)", "An-Nahl (The Bee)",
  "Al-Isra (The Night Journey)", "Al-Kahf (The Cave)", "Maryam (Mary)",
  "Ta-Ha (Ta-Ha)", "Al-Anbiya (The Prophets)", "Al-Hajj (The Pilgrimage)",
  "Al-Mu'minun (The Believers)", "An-Nur (The Light)", "Al-Furqan (The Criterion)",
  "Ash-Shu'ara (The Poets)", "An-Naml (The Ant)", "Al-Qasas (The Stories)",
  "Al-Ankabut (The Spider)", "Ar-Rum (The Romans)", "Luqman (Luqman)",
  "As-Sajdah (The Prostration)", "Al-Ahzab (The Clans)", "Saba (Sheba)",
  "Fatir (Originator)", "Ya-Sin (Ya Sin)", "As-Saffat (Those Who Set The Ranks)",
  "Sad (The Letter Sad)", "Az-Zumar (The Troops)", "Ghafir (The Forgiver)",
  "Fussilat (Explained In Detail)", "Ash-Shura (The Consultation)",
  "Az-Zukhruf (The Ornaments of Gold)", "Ad-Dukhan (The Smoke)",
  "Al-Jathiyah (The Crouching)", "Al-Ahqaf (The Wind-Curved Sandhills)",
  "Muhammad (Muhammad)", "Al-Fath (The Victory)", "Al-Hujurat (The Rooms)",
  "Qaf (The Letter Qaf)", "Adh-Dhariyat (The Winnowing Winds)", "At-Tur (The Mount)",
  "An-Najm (The Star)", "Al-Qamar (The Moon)", "Ar-Rahman (The Beneficent)",
  "Al-Waqi'ah (The Inevitable)", "Al-Hadid (The Iron)", "Al-Mujadilah (The Pleading Woman)",
  "Al-Hashr (The Exile)", "Al-Mumtahanah (She That Is To Be Examined)",
  "As-Saff (The Ranks)", "Al-Jumu'ah (The Congregation)", "Al-Munafiqun (The Hypocrites)",
  "At-Taghabun (The Mutual Disillusion)", "At-Talaq (The Divorce)",
  "At-Tahrim (The Prohibition)", "Al-Mulk (The Sovereignty)", "Al-Qalam (The Pen)",
  "Al-Haqqah (The Reality)", "Al-Ma'arij (The Ascending Stairways)", "Nuh (Noah)",
  "Al-Jinn (The Jinn)", "Al-Muzzammil (The Enshrouded One)", "Al-Muddaththir (The Cloaked One)",
  "Al-Qiyamah (The Resurrection)", "Al-Insan (The Man)", "Al-Mursalat (The Emissaries)",
  "An-Naba (The Tidings)", "An-Nazi'at (Those Who Drag Forth)", "Abasa (He Frowned)",
  "At-Takwir (The Overthrowing)", "Al-Infitar (The Cleaving)", "Al-Mutaffifin (The Defrauding)",
  "Al-Inshiqaq (The Sundering)", "Al-Buruj (The Mansions of the Stars)",
  "At-Tariq (The Morning Star)", "Al-A'la (The Most High)", "Al-Ghashiyah (The Overwhelming)",
  "Al-Fajr (The Dawn)", "Al-Balad (The City)", "Ash-Shams (The Sun)", "Al-Layl (The Night)",
  "Ad-Duha (The Morning Hours)", "Ash-Sharh (The Relief)", "At-Tin (The Fig)",
  "Al-Alaq (The Clot)", "Al-Qadr (The Power)", "Al-Bayyinah (The Clear Proof)",
  "Az-Zalzalah (The Earthquake)", "Al-Adiyat (The Courser)", "Al-Qari'ah (The Calamity)",
  "At-Takathur (The Rivalry In World Increase)", "Al-Asr (The Declining Day)",
  "Al-Humazah (The Traducer)", "Al-Fil (The Elephant)", "Quraysh (Quraysh)",
  "Al-Ma'un (The Small Kindnesses)", "Al-Kawthar (The Abundance)",
  "Al-Kafirun (The Disbelievers)", "An-Nasr (The Divine Support)",
  "Al-Masad (The Palm Fiber)", "Al-Ikhlas (The Sincerity)", "Al-Falaq (The Daybreak)",
  "An-Nas (The Mankind)",
];

// The verse shape returned by /api/scriptures.
interface ScriptureVerse {
  religion: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation?: string;
}

// A resolved, fetchable scripture request derived from a reference's locator.
interface PassageRequest {
  religion: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  // True when the cited range continues past the fetched chapter (we show the
  // start chapter and note the continuation rather than fetching every chapter).
  continues: boolean;
}

function asNumber(value: unknown, fallback: number): number {
  const n = typeof value === "string" ? parseInt(value, 10) : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Translate a reference into a concrete /api/scriptures request, or null when
// the source isn't one we can fetch live (e.g. bibliographic-only citations).
export function buildPassageRequest(ref: ScriptureReference): PassageRequest | null {
  const loc = ref.locator ?? {};
  switch (ref.source_system) {
    case "alquran.cloud": {
      const surah = asNumber(loc.surah, 0);
      const name = QURAN_SURAH_NAMES[surah - 1];
      if (!name) return null;
      const start = asNumber(loc.ayah_start, 1);
      return {
        religion: "islam",
        book: name,
        chapter: 1,
        verseStart: start,
        verseEnd: asNumber(loc.ayah_end, start),
        continues: false,
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
      const religion = ref.source_system === "bible-api" ? "christianity" : "judaism";
      return {
        religion,
        book,
        chapter,
        verseStart: start,
        verseEnd: continues ? Number.POSITIVE_INFINITY : asNumber(loc.verse_end, start),
        continues,
      };
    }
    default:
      return null;
  }
}

// Build a deep-link into the Read tab for a reference's tradition. The reader
// filters by `tradition`; religion/book/chapter are passed for forward-compat.
function readHref(ref: ScriptureReference, req: PassageRequest | null): string {
  const tradition = req?.religion ?? ref.tradition;
  const params = new URLSearchParams({ tradition });
  if (req) {
    params.set("religion", req.religion);
    params.set("book", req.book);
    params.set("chapter", String(req.chapter));
  }
  return `/read?${params.toString()}`;
}

function askHref(seed: string): string {
  return `/ask?seed=${encodeURIComponent(seed)}`;
}

const ROLE_LABELS: Record<string, string> = {
  primary: "Primary",
  supporting: "Supporting",
  "parallel-tradition": "Parallel tradition",
};

// ─── A single cited scripture passage (fetched live) ─────────────────────────
export function ScripturePassage({ reference }: { reference: ScriptureReference }) {
  const [, navigate] = useLocation();
  const req = buildPassageRequest(reference);
  const roleLabel = ROLE_LABELS[reference.role] ?? null;

  const passageQuery = useQuery<ScriptureVerse[]>({
    queryKey: ["/api/scriptures", req?.religion, req?.book, req?.chapter],
    queryFn: async () => {
      const url = `/api/scriptures?religion=${encodeURIComponent(req!.religion)}&book=${encodeURIComponent(
        req!.book,
      )}&chapter=${req!.chapter}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to load passage: ${res.status}`);
      return (await res.json()) as ScriptureVerse[];
    },
    enabled: req != null,
    staleTime: Infinity,
  });

  const verses = req
    ? (passageQuery.data ?? []).filter(
        (v) => v.verse >= req.verseStart && v.verse <= req.verseEnd,
      )
    : [];

  return (
    <div
      className="mt-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
      data-testid={`passage-${reference.id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-serif text-sm font-semibold text-slate-800">
          {reference.citation}
        </div>
        <div className="flex items-center gap-1.5">
          {req?.continues && (
            <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Excerpt
            </span>
          )}
          {roleLabel && (
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ borderColor: `${GOLD}80`, color: GOLD }}
            >
              {roleLabel}
            </span>
          )}
        </div>
      </div>

      {req && passageQuery.isLoading && (
        <div className="mt-2 space-y-1.5" data-testid={`passage-loading-${reference.id}`}>
          <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
        </div>
      )}

      {req && !passageQuery.isLoading && verses.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {verses.map((v) => (
            <p key={`${v.book}-${v.chapter}-${v.verse}`} className="text-[13px] leading-relaxed text-slate-700">
              <sup className="mr-1 font-semibold text-slate-400">{v.verse}</sup>
              {v.text}
            </p>
          ))}
          {req.continues && (
            <p className="text-[11px] italic text-slate-400">
              Showing the opening of this passage; the full citation continues into the next chapter — open the reader for the complete text.
            </p>
          )}
          {verses[0]?.translation && (
            <div className="pt-0.5 text-[10px] uppercase tracking-wider text-slate-400">
              {verses[0].translation}
            </div>
          )}
        </div>
      )}

      {/* Couldn't fetch (unsupported source, error, or no matching verses):
          fall back to the citation + note so the reference is never lost. */}
      {(!req || passageQuery.isError || (!passageQuery.isLoading && verses.length === 0)) && (
        <p className="mt-2 text-[13px] italic leading-relaxed text-slate-500">
          {reference.note ?? "See the cited passage in the reader."}
        </p>
      )}

      {req && verses.length > 0 && reference.note && (
        <p className="mt-2 text-[12px] italic leading-relaxed text-slate-500">{reference.note}</p>
      )}

      <div className="mt-2.5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => navigate(readHref(reference, req))}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
          data-testid={`button-read-${reference.id}`}
        >
          <BookOpen className="h-3 w-3" />
          Read in full
        </button>
        <button
          type="button"
          onClick={() =>
            navigate(
              askHref(
                `Help me understand ${reference.citation}. What does this passage mean and why does it matter?`,
              ),
            )
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
          data-testid={`button-ask-passage-${reference.id}`}
        >
          <MessageCircleQuestion className="h-3 w-3" />
          Ask
        </button>
      </div>
    </div>
  );
}

// ─── One narrative section + its cited passages ──────────────────────────────
function StorySectionBlock({
  section,
  refsById,
}: {
  section: StorySection;
  refsById: Map<string, ScriptureReference>;
}) {
  const cited = section.ref_ids
    .map((id) => refsById.get(id))
    .filter((r): r is ScriptureReference => r != null);

  const isAcrossTraditions =
    section.id.includes("across") || /across traditions/i.test(section.heading);

  return (
    <section
      className={
        isAcrossTraditions
          ? "rounded-xl border-l-2 bg-white/60 pl-3"
          : undefined
      }
      style={isAcrossTraditions ? { borderColor: GOLD } : undefined}
      data-testid={`section-${section.id}`}
    >
      <h4 className="font-serif text-base font-semibold text-slate-800">{section.heading}</h4>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{section.body}</p>
      {cited.map((ref) => (
        <ScripturePassage key={ref.id} reference={ref} />
      ))}
    </section>
  );
}

// ─── Figure chips → seed the Ask chat ────────────────────────────────────────
function FigureChips({
  figures,
  eventTitle,
}: {
  figures: ResolvedFigure[];
  eventTitle: string;
}) {
  const [, navigate] = useLocation();
  if (figures.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {figures.map((f) => (
        <button
          key={f.name}
          type="button"
          onClick={() =>
            navigate(
              askHref(
                `Tell me about ${f.name}${f.role ? `, ${f.role},` : ""} and their role in ${eventTitle}.`,
              ),
            )
          }
          className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          data-testid={`chip-figure-${f.name}`}
        >
          {f.name}
        </button>
      ))}
    </div>
  );
}

// ─── Sources list (handles both string + structured shapes) ──────────────────
function Sources({ sources }: { sources: Array<string | SacredSource> }) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-1 text-[11px] uppercase tracking-wider text-slate-400">
      Sources:{" "}
      <span className="normal-case">
        {sources.map((s, i) => {
          const sep = i > 0 ? ", " : "";
          if (typeof s === "string") return <span key={i}>{sep}{s}</span>;
          return (
            <span key={s.id ?? i}>
              {sep}
              {s.url ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 underline hover:text-slate-700"
                >
                  {s.citation}
                </a>
              ) : (
                s.citation
              )}
            </span>
          );
        })}
      </span>
    </div>
  );
}

// ─── Media gallery (license + credit gated, lazy-loaded) ─────────────────────
// Only assets carrying BOTH a credit and a license are shown — we never embed
// content without explicit rights. Renders nothing when there's nothing to show.
function MediaGallery({ media }: { media?: MediaItem[] }) {
  const items = (media ?? []).filter(
    (m) =>
      m != null &&
      typeof m.url === "string" &&
      m.url.length > 0 &&
      typeof m.credit === "string" &&
      m.credit.trim().length > 0 &&
      typeof m.license === "string" &&
      m.license.trim().length > 0,
  );
  if (items.length === 0) return null;

  return (
    <div className="mt-4" data-testid="media-gallery">
      <h4 className="font-serif text-base font-semibold text-slate-800">Gallery</h4>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {items.map((m) => (
          <figure
            key={m.id}
            className="overflow-hidden rounded-lg border border-slate-200 bg-white"
            data-testid={`media-${m.id}`}
          >
            {m.type === "video" ? (
              <video
                controls
                preload="none"
                poster={m.thumbnail_url}
                className="aspect-video w-full bg-slate-100 object-cover"
                data-testid={`media-video-${m.id}`}
              >
                <source src={m.url} />
              </video>
            ) : (
              <img
                src={m.thumbnail_url ?? m.url}
                alt={m.title ?? m.credit}
                loading="lazy"
                className="aspect-video w-full bg-slate-100 object-cover"
                data-testid={`media-image-${m.id}`}
              />
            )}
            <figcaption className="px-2 py-1.5 text-[10px] leading-snug text-slate-500">
              {m.title && <span className="block font-medium text-slate-600">{m.title}</span>}
              <span>{m.credit}</span>
              <span className="text-slate-400"> · {m.license}</span>
              {m.source_url && (
                <a
                  href={m.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 inline-flex items-center gap-0.5 underline hover:text-slate-700"
                >
                  source
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

// ─── Further-reading list ────────────────────────────────────────────────────
function ReadingList({ books }: { books?: RelatedBook[] }) {
  const items = (books ?? []).filter(
    (b) => b != null && typeof b.title === "string" && b.title.trim().length > 0,
  );
  if (items.length === 0) return null;

  return (
    <div className="mt-4" data-testid="reading-list">
      <h4 className="font-serif text-base font-semibold text-slate-800">Further reading</h4>
      <ul className="mt-2 space-y-1.5">
        {items.map((b) => (
          <li key={b.id} className="text-[13px] leading-snug text-slate-700" data-testid={`book-${b.id}`}>
            {b.url ? (
              <a
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-700 underline hover:text-slate-900"
              >
                {b.title}
              </a>
            ) : (
              <span className="font-medium">{b.title}</span>
            )}
            {b.author && <span className="text-slate-500"> — {b.author}</span>}
            {b.note && <span className="block text-[12px] italic text-slate-500">{b.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── The full story reader for one event ─────────────────────────────────────
export function SacredStory({
  event,
  color,
  siteName,
}: {
  event: EnrichedEvent;
  color: string;
  siteName?: string;
}) {
  const [, navigate] = useLocation();
  const sections = event.story?.sections ?? [];
  const refsById = new Map<string, ScriptureReference>(
    (event.references ?? []).map((r) => [r.id, r]),
  );
  const note = event.tradition_note;
  const hasNote = typeof note === "string" && note.trim().length > 0;

  const eventSeed = `Tell me more about ${event.title}${
    siteName ? ` at ${siteName}` : ""
  } (${event.date.display}).`;

  return (
    <article
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      data-testid={`event-${event.id}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#1e2330]"
          style={{ backgroundColor: color }}
        >
          {event.category}
        </span>
        {isMythicAge(event.date.precision) && (
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{ borderColor: `${GOLD}80`, color: GOLD }}
          >
            Mythic Age
          </span>
        )}
      </div>

      <h3 className="mt-2.5 font-serif text-lg leading-snug text-slate-800">{event.title}</h3>

      <div
        className="mt-1 font-serif text-sm"
        style={{ color: GOLD }}
        data-testid={`event-date-${event.id}`}
      >
        {event.date.display}
      </div>

      <FigureChips figures={event.figures} eventTitle={event.title} />

      {/* Body: story sections in order, or a plain description fallback. */}
      <div className="mt-3 space-y-4">
        {sections.length > 0 ? (
          sections.map((s) => (
            <StorySectionBlock key={s.id} section={s} refsById={refsById} />
          ))
        ) : (
          <p className="text-sm leading-relaxed text-slate-700">{event.description}</p>
        )}
      </div>

      {/* Tradition note callout */}
      {hasNote && (
        <aside
          className="mt-4 rounded-lg border-l-2 bg-amber-50/40 py-2 pl-3 pr-2 text-[13px] italic leading-relaxed text-slate-600"
          style={{ borderColor: GOLD }}
          data-testid={`note-${event.id}`}
        >
          {note}
        </aside>
      )}

      {/* Optional media gallery + further-reading (render nothing when empty) */}
      <MediaGallery media={event.media} />
      <ReadingList books={event.related_books} />

      {/* Ask about the whole event */}
      <button
        type="button"
        onClick={() => navigate(askHref(eventSeed))}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-[#1e2330] transition-opacity hover:opacity-90"
        style={{ backgroundColor: GOLD }}
        data-testid={`button-ask-event-${event.id}`}
      >
        <MessageCircleQuestion className="h-3.5 w-3.5" />
        Ask about this
      </button>

      <div className="mt-3">
        <Sources sources={event.sources} />
      </div>
    </article>
  );
}
