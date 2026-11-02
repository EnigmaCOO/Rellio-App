import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import {
  Bookmark, MessageSquare, Highlighter, Trash2, BookOpen, LogIn,
  Flame, GitCompare, Settings, ChevronRight, Clock, Layers, Timer,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { getBookCover } from "@/config/bookCovers";
import { cn } from "@/lib/utils";
import type {
  Bookmark as BookmarkType, VerseNote, VerseHighlight,
  SpiritualJourney,
} from "@shared/schema";

type SavedComparison = { id: number; theme: string; traditions: string[]; summary?: string; createdAt: string };
type LibTab = "all" | "bookmarks" | "highlights" | "notes" | "comparisons";

interface BookProgress {
  id: number;
  bookId: string;
  cfi: string | null;
  percentage: number;
  updatedAt: string;
}
interface BookCatalogEntry {
  id: string;
  title: string;
  author: string;
  traditionLabel: string;
  accent: string;
}

const LIB_TABS: { id: LibTab; label: string; Icon: React.ElementType }[] = [
  { id: "all",         label: "All",         Icon: Layers },
  { id: "bookmarks",   label: "Bookmarks",   Icon: Bookmark },
  { id: "highlights",  label: "Highlights",  Icon: Highlighter },
  { id: "notes",       label: "Notes",       Icon: MessageSquare },
  { id: "comparisons", label: "Compares",    Icon: GitCompare },
];

function Skel({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer rounded-xl", className)} />;
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-100 border border-gray-200">
        <Icon size={20} className="text-gray-500" />
      </div>
      <p className="text-sm text-center max-w-xs text-gray-500">{message}</p>
    </div>
  );
}

function ProfileHeader({ journey }: { journey?: SpiritualJourney }) {
  const { user, isGuest } = useAuth();
  const [, navigate] = useLocation();

  if (isGuest) {
    return (
      <div className="rounded-3xl p-6 text-center border border-gray-200 bg-gray-50 mb-4">
        <p className="text-lg font-bold mb-1 text-gray-900">Your journey awaits</p>
        <p className="text-sm mb-5 text-gray-500">Sign in to track your reading and sync across devices.</p>
        <button
          onClick={() => navigate("/auth")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm bg-gray-900 text-white"
          data-testid="you-sign-in"
        >
          <LogIn size={15} /> Sign in · It&apos;s free
        </button>
      </div>
    );
  }

  const name = user?.firstName ?? user?.username ?? user?.email?.split("@")[0] ?? "Seeker";
  const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  const streak = journey?.currentStreak ?? 0;

  return (
    <div className="rounded-3xl p-5 border border-gray-200 bg-gray-50 mb-4 flex items-center gap-4">
      <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl border-2 border-gray-200 bg-white text-gray-900 flex-shrink-0">
        {user?.profileImageUrl
          ? <img src={user.profileImageUrl} alt={name} className="w-16 h-16 rounded-full object-cover" />
          : initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-lg text-gray-900 truncate">{name}</p>
        {streak > 0 && (
          <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
            <Flame size={12} /> {streak} day streak
          </p>
        )}
      </div>
      <Link
        href="/profile"
        className="p-2 rounded-xl hover:bg-white transition-colors no-underline"
        data-testid="you-settings"
      >
        <Settings size={18} className="text-gray-600" />
      </Link>
    </div>
  );
}

function ReadingProgressCard({ journey }: { journey?: SpiritualJourney }) {
  if (!journey) return null;
  const streak = journey.currentStreak ?? 0;
  const totalMin = journey.totalTimeMinutes ?? 0;
  const sessions = journey.totalReadingSessions ?? 0;
  const totalLabel = totalMin >= 60
    ? `${Math.round(totalMin / 60)}h`
    : `${totalMin}m`;
  return (
    <div
      className="grid grid-cols-3 gap-3 mb-6 rounded-2xl border border-gray-200 bg-white p-4"
      data-testid="reading-progress-card"
    >
      <div className="flex flex-col items-center text-center">
        <Flame size={16} className="text-gray-500 mb-1" />
        <p className="text-lg font-bold text-gray-900 leading-tight">{streak}</p>
        <p className="text-[10px] uppercase tracking-wide text-gray-500">Day streak</p>
      </div>
      <div className="flex flex-col items-center text-center border-x border-gray-100">
        <Timer size={16} className="text-gray-500 mb-1" />
        <p className="text-lg font-bold text-gray-900 leading-tight">{totalLabel}</p>
        <p className="text-[10px] uppercase tracking-wide text-gray-500">Total time</p>
      </div>
      <div className="flex flex-col items-center text-center">
        <BookOpen size={16} className="text-gray-500 mb-1" />
        <p className="text-lg font-bold text-gray-900 leading-tight">{sessions}</p>
        <p className="text-[10px] uppercase tracking-wide text-gray-500">Sessions</p>
      </div>
    </div>
  );
}

function ContinueReading() {
  const { isGuest } = useAuth();
  const { data: progress = [] } = useQuery<BookProgress[]>({
    queryKey: ["/api/v1/library/progress/all"],
    enabled: !isGuest,
    retry: false,
  });
  const { data: books = [] } = useQuery<BookCatalogEntry[]>({
    queryKey: ["/api/v1/library"],
  });

  const items = useMemo(() => {
    const map = new Map(books.map((b) => [b.id, b]));
    return progress
      .map((p) => ({ p, book: map.get(p.bookId) }))
      .filter((x): x is { p: BookProgress; book: BookCatalogEntry } => !!x.book)
      .sort((a, b) => new Date(b.p.updatedAt).getTime() - new Date(a.p.updatedAt).getTime())
      .slice(0, 6);
  }, [progress, books]);

  if (items.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Continue reading</h2>
      <div className="space-y-2">
        {items.map(({ p, book }) => (
          <Link
            key={p.bookId}
            href={`/reader/${p.bookId}`}
            className="flex items-center gap-3 p-3 rounded-2xl border border-gray-200 hover:bg-gray-50 no-underline text-inherit"
            data-testid={`continue-${p.bookId}`}
          >
            {(() => {
              const cover = getBookCover(book.id);
              return cover ? (
                <img
                  src={cover}
                  alt={book.title}
                  className="w-10 h-14 rounded shadow object-cover flex-shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className={`w-10 h-14 rounded shadow bg-gradient-to-br ${book.accent} flex items-center justify-center text-white text-[10px] flex-shrink-0`}>
                  <BookOpen size={14} />
                </div>
              );
            })()}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{book.title}</p>
              <p className="text-xs text-gray-500 truncate">{book.traditionLabel}</p>
              <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-900" style={{ width: `${Math.min(100, p.percentage)}%` }} />
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </Link>
        ))}
      </div>
    </section>
  );
}

// ── Saved-feed unified entry types ────────────────────────────────────────
type SavedEntry =
  | { kind: "bookmark";   id: number; ts: number; data: BookmarkType }
  | { kind: "highlight";  id: number; ts: number; data: VerseHighlight }
  | { kind: "note";       id: number; ts: number; data: VerseNote }
  | { kind: "comparison"; id: number; ts: number; data: SavedComparison };

function entryDate(d: { createdAt?: string | Date | null } | null | undefined): number {
  const v = d?.createdAt;
  if (!v) return 0;
  return new Date(v).getTime();
}

function SavedRow({ entry, onDelete }: { entry: SavedEntry; onDelete: () => void }) {
  if (entry.kind === "bookmark") {
    const b = entry.data;
    return (
      <div className="rounded-2xl border border-gray-200 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 flex items-center gap-1">
              <Bookmark size={10} /> Bookmark · {b.religion}
            </p>
            <p className="text-sm font-semibold text-gray-900">{b.book} {b.chapter}:{b.verse}</p>
          </div>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Delete">
            <Trash2 size={13} className="text-gray-500" />
          </button>
        </div>
        {b.note && <p className="text-sm mt-2 text-gray-600">{b.note}</p>}
      </div>
    );
  }
  if (entry.kind === "highlight") {
    const h = entry.data;
    return (
      <div className="rounded-2xl border border-gray-200 p-3 flex items-center gap-3">
        <div className="w-2.5 h-10 rounded-full bg-gray-300 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 flex items-center gap-1">
            <Highlighter size={10} /> Highlight · {h.religion}
          </p>
          <p className="text-sm font-semibold text-gray-900">{h.book} {h.chapter}:{h.verse}</p>
        </div>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Delete">
          <Trash2 size={13} className="text-gray-500" />
        </button>
      </div>
    );
  }
  if (entry.kind === "note") {
    const n = entry.data;
    return (
      <div className="rounded-2xl border border-gray-200 p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-500 flex items-center gap-1">
              <MessageSquare size={10} /> Note · {n.religion}
            </p>
            <p className="text-sm font-semibold text-gray-900">{n.book} {n.chapter}:{n.verse}</p>
          </div>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Delete">
            <Trash2 size={13} className="text-gray-500" />
          </button>
        </div>
        {n.verseText && <p className="text-sm italic border-l-2 border-gray-300 pl-3 text-gray-600">{n.verseText}</p>}
        <p className="text-sm text-gray-900">{n.text}</p>
      </div>
    );
  }
  const c = entry.data;
  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 flex items-center gap-1">
            <GitCompare size={10} /> Compare
          </p>
          <p className="text-sm font-semibold text-gray-900 truncate">{c.theme}</p>
          <p className="text-xs text-gray-500 mt-0.5">{c.traditions?.join(" · ")}</p>
        </div>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0" aria-label="Delete">
          <Trash2 size={13} className="text-gray-500" />
        </button>
      </div>
      {c.summary && <p className="text-xs mt-2 line-clamp-2 text-gray-600">{c.summary}</p>}
      <p className="text-[10px] mt-2 text-gray-500"><Clock size={10} className="inline mr-1" />{new Date(c.createdAt).toLocaleDateString()}</p>
    </div>
  );
}

function SavedLibrary() {
  const { isGuest } = useAuth();
  const [tab, setTab] = useState<LibTab>("all");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: bookmarks = [], isLoading: bkLoad } = useQuery<BookmarkType[]>({
    queryKey: ["/api/v1/bookmarks"],
    enabled: !isGuest,
  });
  const { data: notes = [], isLoading: notesLoad } = useQuery<VerseNote[]>({
    queryKey: ["/api/v1/notes"],
    enabled: !isGuest,
  });
  const { data: highlights = [], isLoading: hlLoad } = useQuery<VerseHighlight[]>({
    queryKey: ["/api/v1/highlights"],
    enabled: !isGuest,
  });
  const { data: comparisons = [], isLoading: cmpLoad } = useQuery<SavedComparison[]>({
    queryKey: ["/api/v1/comparisons"],
    enabled: !isGuest,
  });

  const delMut = useMutation({
    mutationFn: ({ kind, id }: { kind: "bookmarks" | "highlights" | "notes" | "comparisons"; id: number }) =>
      apiRequest(`/api/v1/${kind}/${id}`, { method: "DELETE" }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [`/api/v1/${vars.kind}`] });
      toast({ title: "Removed", duration: 1500 });
    },
  });

  const all: SavedEntry[] = useMemo(() => {
    const items: SavedEntry[] = [
      ...bookmarks.map((b) => ({ kind: "bookmark" as const, id: b.id, ts: entryDate(b), data: b })),
      ...highlights.map((h) => ({ kind: "highlight" as const, id: h.id, ts: entryDate(h), data: h })),
      ...notes.map((n) => ({ kind: "note" as const, id: n.id, ts: entryDate(n), data: n })),
      ...comparisons.map((c) => ({ kind: "comparison" as const, id: c.id, ts: new Date(c.createdAt).getTime(), data: c })),
    ];
    return items.sort((a, b) => b.ts - a.ts);
  }, [bookmarks, highlights, notes, comparisons]);

  const filtered = useMemo(() => {
    if (tab === "all") return all;
    if (tab === "bookmarks") return all.filter((e) => e.kind === "bookmark");
    if (tab === "highlights") return all.filter((e) => e.kind === "highlight");
    if (tab === "notes") return all.filter((e) => e.kind === "note");
    return all.filter((e) => e.kind === "comparison");
  }, [tab, all]);

  const isLoading = bkLoad || notesLoad || hlLoad || cmpLoad;

  if (isGuest) {
    return <EmptyState icon={Bookmark} message="Sign in to keep your saved passages and notes across devices." />;
  }

  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Saved</h2>
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {LIB_TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              data-testid={`saved-tab-${id}`}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all border",
                active ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200",
              )}
            >
              <Icon size={12} /> {label}
            </button>
          );
        })}
      </div>

      {isLoading && tab === "all" ? (
        <Skel className="h-20" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          message={
            tab === "all"
              ? "Bookmark, highlight, or take notes while reading. Saved Compares show up here too."
              : tab === "bookmarks" ? "Tap a passage and save it to read again later."
              : tab === "highlights" ? "Highlight a passage from any book to save it here."
              : tab === "notes" ? "Long-press a passage and add a personal note."
              : "Run a Compare in Ask and save the result."
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const kindToEndpoint: Record<SavedEntry["kind"], "bookmarks" | "highlights" | "notes" | "comparisons"> = {
              bookmark: "bookmarks",
              highlight: "highlights",
              note: "notes",
              comparison: "comparisons",
            };
            return (
              <SavedRow
                key={`${entry.kind}-${entry.id}`}
                entry={entry}
                onDelete={() => delMut.mutate({ kind: kindToEndpoint[entry.kind], id: entry.id })}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function YouPage() {
  const { isGuest } = useAuth();
  const { data: journey } = useQuery<SpiritualJourney>({
    queryKey: ["/api/progress/journey"],
    enabled: !isGuest,
    retry: false,
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-10">
        <h1 className="font-serif text-2xl font-bold text-gray-900 mb-1">You</h1>
        <p className="text-sm text-gray-500 mb-5">Your library, progress, and saved reflections.</p>

        <ProfileHeader journey={journey} />
        {!isGuest && <ReadingProgressCard journey={journey} />}
        <ContinueReading />
        <SavedLibrary />
      </div>
    </div>
  );
}
