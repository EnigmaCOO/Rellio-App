import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Clock, Search, Flame, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getBookCover } from "@/config/bookCovers";
import type { SpiritualJourney } from "@shared/schema";

const WEEKLY_REFLECTIONS = [
  "This week, notice where stillness already lives in your day.",
  "Read slowly enough to hear the question behind the verse.",
  "What you keep returning to is already teaching you.",
  "Hold one passage long enough for it to hold you back.",
  "Compare two voices this week — let the contrast become your prayer.",
  "Small, daily reading outlasts dramatic, occasional resolve.",
  "Write down one line that won't leave you alone.",
  "Let mercy be the first lens you bring to any text today.",
];

function weeklyReflection(): string {
  const start = new Date(new Date().getFullYear(), 0, 1);
  const week = Math.floor((Date.now() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return WEEKLY_REFLECTIONS[week % WEEKLY_REFLECTIONS.length];
}

const TRADITION_TO_BOOK_PRIORITY: Record<string, string[]> = {
  islam:        ["quran", "hadith"],
  christianity: ["bible", "new-testament", "old-testament"],
  judaism:      ["torah", "tanakh", "talmud"],
  hinduism:     ["bhagavad-gita-as-it-is", "bhagavad-gita", "vedas", "upanishads"],
  buddhism:     ["dhammapada", "tripitaka", "mahayana"],
};

const OPEN_DEFAULT_KEY = "rellio.openDefaultBookOnce";

interface BookCatalogEntry {
  id: string;
  title: string;
  author: string;
  tradition: string;
  traditionLabel: string;
  language: string;
  filename: string;
  description?: string;
  accent: string;
}

interface BookProgress {
  id: number;
  bookId: string;
  cfi: string | null;
  percentage: number;
  updatedAt: string;
}

const TRADITIONS: { id: string | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "islam", label: "Islam" },
  { id: "christianity", label: "Christianity" },
  { id: "judaism", label: "Judaism" },
  { id: "hinduism", label: "Hinduism" },
  { id: "buddhism", label: "Buddhism" },
  { id: "sikhism", label: "Sikhism" },
  { id: "shintoism", label: "Shintoism" },
];

const TRADITION_ORDER: string[] = [
  "Islam",
  "Christianity",
  "Judaism",
  "Hinduism",
  "Buddhism",
  "Sikhism",
  "Shintoism",
];

function BookCover({ book, percentage }: { book: BookCatalogEntry; percentage?: number }) {
  const coverImage = getBookCover(book.id);
  return (
    <Link href={`/reader/${book.id}`} className="group block no-underline" data-testid={`book-card-${book.id}`}>
      <div
        className={`relative aspect-[2/3] rounded-md shadow-lg overflow-hidden transition-transform group-hover:-translate-y-1 group-hover:shadow-2xl ${
          coverImage ? "bg-gray-900" : `bg-gradient-to-br ${book.accent}`
        }`}
      >
        {coverImage ? (
          <img
            src={coverImage}
            alt={book.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 p-4 flex flex-col justify-between text-white">
            <div className="text-[10px] uppercase tracking-widest opacity-80">{book.traditionLabel}</div>
            <div>
              <div className="text-base font-serif font-bold leading-tight drop-shadow-sm line-clamp-4">{book.title}</div>
            </div>
          </div>
        )}
        <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-black/20" />
        {typeof percentage === "number" && percentage > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
            <div className="h-full bg-white" style={{ width: `${Math.min(100, percentage)}%` }} />
          </div>
        )}
      </div>
      <div className="mt-2 px-1">
        <div className="text-sm font-semibold text-gray-900 line-clamp-1">{book.title}</div>
      </div>
    </Link>
  );
}

function ReadHeader() {
  const { user, isGuest } = useAuth();
  const { data: journey } = useQuery<SpiritualJourney>({
    queryKey: ["/api/progress/journey"],
    enabled: !isGuest,
    retry: false,
  });

  const name = isGuest
    ? "Welcome"
    : user?.firstName ?? user?.username ?? user?.email?.split("@")[0] ?? "Welcome back";
  const streak = journey?.currentStreak ?? 0;

  return (
    <div className="px-4 lg:px-6 pt-6 pb-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-gray-900">
            {isGuest ? "Welcome" : `Hello, ${name}`}
          </h1>
          <p className="text-sm text-gray-500">Pick a book to keep reading.</p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700">
            <Flame size={12} /> {streak} day streak
          </div>
        )}
      </div>
      <div
        className="mt-3 flex items-start gap-2 text-sm italic text-gray-600 max-w-2xl"
        data-testid="weekly-reflection"
      >
        <Sparkles size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
        <span>{weeklyReflection()}</span>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const [location, navigate] = useLocation();
  const [tradition, setTradition] = useState<string>(() => {
    try {
      const search = window.location.search.replace(/^\?/, "");
      const t = new URLSearchParams(search).get("tradition");
      return t && TRADITIONS.some((x) => x.id === t) ? t : "all";
    } catch {
      return "all";
    }
  });
  const [query, setQuery] = useState("");

  // Honor /read?tradition=... when arriving from a citation tap.
  useEffect(() => {
    const search = location.includes("?") ? location.split("?")[1] : window.location.search.replace(/^\?/, "");
    if (!search) return;
    const t = new URLSearchParams(search).get("tradition");
    if (t && TRADITIONS.some((x) => x.id === t)) {
      setTradition(t);
      window.history.replaceState({}, "", "/read");
    }
  }, [location]);

  const { data: books = [], isLoading } = useQuery<BookCatalogEntry[]>({
    queryKey: ["/api/v1/library"],
  });

  // First-time post-onboarding: auto-open the default book of the chosen tradition (one-time, skippable shelf).
  useEffect(() => {
    if (books.length === 0) return;
    let pending: string | null = null;
    try { pending = localStorage.getItem(OPEN_DEFAULT_KEY); } catch { /* ignore */ }
    if (!pending) return;
    try { localStorage.removeItem(OPEN_DEFAULT_KEY); } catch { /* ignore */ }
    const priority = TRADITION_TO_BOOK_PRIORITY[pending] ?? [];
    const byTradition = books.filter((b) => b.tradition === pending);
    const exact = priority
      .map((id) => byTradition.find((b) => b.id === id) ?? books.find((b) => b.id === id))
      .find(Boolean);
    const target = exact ?? byTradition[0];
    if (target) navigate(`/reader/${target.id}`);
  }, [books, navigate]);

  const { data: progress = [] } = useQuery<BookProgress[]>({
    queryKey: ["/api/v1/library/progress/all"],
    retry: false,
  });

  const progressByBook = useMemo(() => {
    const m = new Map<string, BookProgress>();
    progress.forEach((p) => m.set(p.bookId, p));
    return m;
  }, [progress]);

  const continueReading = useMemo(
    () =>
      books
        .filter((b) => progressByBook.get(b.id))
        .sort(
          (a, b) =>
            new Date(progressByBook.get(b.id)!.updatedAt).getTime() -
            new Date(progressByBook.get(a.id)!.updatedAt).getTime(),
        )
        .slice(0, 6),
    [books, progressByBook],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter((b) => {
      if (tradition !== "all" && b.tradition !== tradition) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.traditionLabel.toLowerCase().includes(q) ||
        (b.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [books, tradition, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, BookCatalogEntry[]>();
    filtered.forEach((b) => {
      const arr = map.get(b.traditionLabel) ?? [];
      arr.push(b);
      map.set(b.traditionLabel, arr);
    });
    const rank = (label: string) => {
      const i = TRADITION_ORDER.indexOf(label);
      return i === -1 ? TRADITION_ORDER.length : i;
    };
    return Array.from(map.entries()).sort(([a], [b]) => rank(a) - rank(b));
  }, [filtered]);

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <ReadHeader />

      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200 px-4 lg:px-6 py-3">
        <div className="max-w-6xl mx-auto">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or tradition…"
              className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              data-testid="library-search"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {TRADITIONS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTradition(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  tradition === t.id
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                }`}
                data-testid={`filter-${t.id}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 lg:px-6 py-6 space-y-10">
        {isLoading && (
          <div className="text-center text-gray-500 py-20">Loading library…</div>
        )}

        {!isLoading && continueReading.length > 0 && tradition === "all" && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-gray-600" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Continue reading</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {continueReading.map((b) => (
                <BookCover key={b.id} book={b} percentage={progressByBook.get(b.id)?.percentage} />
              ))}
            </div>
          </section>
        )}

        {!isLoading &&
          grouped.map(([label, items]) => (
            <section key={label}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-3">{label}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {items.map((b) => (
                  <BookCover key={b.id} book={b} percentage={progressByBook.get(b.id)?.percentage} />
                ))}
              </div>
            </section>
          ))}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center text-gray-500 py-20">No books available in this tradition yet.</div>
        )}
      </main>
    </div>
  );
}
