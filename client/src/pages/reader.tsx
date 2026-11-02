import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Type, BookmarkPlus, List, Search, X, Highlighter,
  StickyNote, Trash2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Copy, MessageCircle, Layers,
} from "lucide-react";
import { CenterChatPanel, type ChatMessage } from "@/components/desktop/CenterChatPanel";
import { ALL_SOURCES } from "@/config/bookshelfData";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { PersonaSceneProvider, usePersonaSceneBridge } from "@/hooks/usePersonaSceneBridge";
import { EpubReader, READER_THEMES, type ReaderLocation, type AnnotationLite, type ReaderTheme, type ReadingMode, type FootnotePayload } from "@/components/reader/EpubReader";
import type { NavItem } from "epubjs";
import type { Religion } from "@shared/schema";

interface BookCatalogEntry {
  id: string;
  title: string;
  author: string;
  tradition: string;
  traditionLabel: string;
  accent: string;
}

interface BookProgress { id: number; cfi: string | null; percentage: number; }
interface BookBookmark { id: number; cfi: string; label: string | null; snippet: string | null; createdAt: string; }
interface BookAnnotation { id: number; cfiRange: string; color: string; text: string | null; note: string | null; createdAt: string; }

const HIGHLIGHT_COLORS = [
  { id: "yellow", value: "#fde68a" },
  { id: "green",  value: "#bbf7d0" },
  { id: "blue",   value: "#bfdbfe" },
  { id: "pink",   value: "#fbcfe8" },
  { id: "purple", value: "#ddd6fe" },
];

const FONT_FAMILIES = [
  { id: "serif", label: "Serif", css: 'Georgia, "Times New Roman", serif' },
  { id: "sans", label: "Sans", css: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { id: "mono", label: "Mono", css: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
];

const PREFS_KEY = "rellio.reader.prefs";
const GUEST_KEY = (bookId: string, kind: string) => `rellio.guest.${bookId}.${kind}`;

interface ReaderPrefs {
  fontSize: number;
  fontFamilyId: string;
  themeId: ReaderTheme["id"];
  brightness: number;
  lineHeight: number;
  marginPct: number;
  readingMode: ReadingMode;
  cleanReadingMode: boolean;
}

const DEFAULT_PREFS: ReaderPrefs = {
  fontSize: 110, fontFamilyId: "serif", themeId: "light",
  brightness: 1, lineHeight: 1.7, marginPct: 6,
  readingMode: "paginated", cleanReadingMode: true,
};

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function loadPrefs(): ReaderPrefs {
  let stored: Partial<ReaderPrefs> = {};
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch { /* ignore */ }
  // Mobile defaults to scroll mode unless the user explicitly chose otherwise.
  const merged: ReaderPrefs = { ...DEFAULT_PREFS, ...stored };
  if (stored.readingMode === undefined && isMobileViewport()) {
    merged.readingMode = "scroll";
  }
  return merged;
}

function savePrefs(p: ReaderPrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export default function ReaderPage() {
  return (
    <PersonaSceneProvider>
      <ReaderPageInner />
    </PersonaSceneProvider>
  );
}

// Map a book id / tradition to the single source the Scholar should be scoped to.
function scopedSourceForBook(bookId?: string, tradition?: string): string[] {
  if (!bookId && !tradition) return [];
  // Direct match by id (e.g. "bhagavad-gita" or "quran" present in ALL_SOURCES).
  if (bookId) {
    const direct = ALL_SOURCES.find((s) => s.id === bookId || bookId.includes(s.id));
    if (direct) return [direct.id];
  }
  // Otherwise pick the most canonical source for that tradition.
  if (tradition) {
    const canonical: Record<string, string> = {
      islam: "quran",
      christianity: "bible",
      judaism: "torah",
      hinduism: "bhagavad-gita",
      buddhism: "dhammapada",
      shintoism: "kojiki",
      sikhism: "guru-granth-sahib",
    };
    const fallback = canonical[tradition];
    if (fallback) return [fallback];
    const first = ALL_SOURCES.find((s) => s.religion === tradition);
    if (first) return [first.id];
  }
  return [];
}

// ─── Scholar panel — side-by-side on desktop, bottom sheet on mobile ────
function ScholarDock({
  bookId,
  bookTradition,
  bookTitle,
  currentCfi,
  currentPercentage,
  selectedPassage,
  messages,
  onMessagesChange,
  onClose,
  initialSend,
  onInitialSent,
  expanded,
  onToggleExpanded,
}: {
  bookId?: string;
  bookTradition?: string;
  bookTitle?: string;
  currentCfi?: string | null;
  currentPercentage?: number | null;
  selectedPassage?: { cfiRange: string; text: string } | null;
  messages: ChatMessage[];
  onMessagesChange: (m: ChatMessage[]) => void;
  onClose: () => void;
  initialSend?: string | null;
  onInitialSent?: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const requestContext = useMemo(
    () => ({
      religion: bookTradition ?? null,
      book: bookId ?? null,
      bookTitle: bookTitle ?? null,
      cfi: currentCfi ?? null,
      percentage: currentPercentage ?? null,
      mode: "passage_scholar",
      passageSelection: selectedPassage
        ? { text: selectedPassage.text, cfiRange: selectedPassage.cfiRange }
        : null,
      edition: bookTitle ?? null,
    }),
    [bookId, bookTradition, bookTitle, currentCfi, currentPercentage, selectedPassage],
  );
  const pinnedSources = useMemo(
    () => scopedSourceForBook(bookId, bookTradition),
    [bookId, bookTradition],
  );
  const sessionIdRef = useRef(`scholar-${bookId ?? "book"}-${Date.now()}`);
  const lastSeedRef = useRef<string | null>(null);

  const handleMessagesChange = useCallback(
    (m: ChatMessage[]) => {
      onMessagesChange(m);
      if (initialSend && lastSeedRef.current !== initialSend && m.some((x) => x.role === "assistant")) {
        lastSeedRef.current = initialSend;
        onInitialSent?.();
      }
    },
    [initialSend, onInitialSent, onMessagesChange],
  );

  return (
    <aside
      className={cn(
        "absolute inset-x-0 bottom-0 z-40 bg-white text-gray-900 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] border-t border-gray-200 flex flex-col transition-[height] duration-300 ease-out lg:static lg:col-start-2 lg:row-start-2 lg:h-full lg:min-h-0 lg:w-full lg:border-t-0 lg:border-l lg:shadow-none lg:transition-none",
        expanded ? "h-[68%]" : "h-[40%]",
      )}
      data-testid="scholar-dock"
      role="dialog"
      aria-label="Scholar chat"
    >
      {/* Drag/grip handle row */}
      <button
        type="button"
        onClick={onToggleExpanded}
        className="w-full flex flex-col items-center py-1.5 hover:bg-gray-50 lg:hidden"
        aria-label={expanded ? "Collapse Scholar" : "Expand Scholar"}
        data-testid="scholar-handle"
      >
        <span className="block w-10 h-1 rounded-full bg-gray-300" />
      </button>
      <div className="flex items-center justify-between px-4 h-10 border-b border-gray-200 flex-shrink-0">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Scholar · {bookTitle ?? "This book"}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleExpanded}
            className="p-1 hover:bg-gray-100 rounded text-gray-600 lg:hidden"
            aria-label={expanded ? "Collapse" : "Expand"}
            data-testid="scholar-toggle"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded text-gray-600"
            aria-label="Close Scholar"
            data-testid="scholar-close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <CenterChatPanel
          sessionId={sessionIdRef.current}
          messages={messages}
          onMessagesChange={handleMessagesChange}
          selectedSources={pinnedSources}
          onSourceToggle={() => {}}
          pinnedSources={pinnedSources}
          mode="passage_scholar"
          initialSend={initialSend ?? null}
          requestContext={requestContext}
        />
      </div>
    </aside>
  );
}

function ReaderPageInner() {
  const [, params] = useRoute<{ id: string }>("/reader/:id");
  const bookId = params?.id ?? "";
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setActiveVerse, pushChatEvent } = usePersonaSceneBridge();
  const verseSeqRef = useRef(0);
  const [scholarOpen, setScholarOpen] = useState(false);
  const [scholarExpanded, setScholarExpanded] = useState(false);
  const [scholarMessages, setScholarMessages] = useState<ChatMessage[]>([]);
  const [scholarSeed, setScholarSeed] = useState<string | null>(null);
  const [scholarPassage, setScholarPassage] = useState<{ cfiRange: string; text: string } | null>(null);

  // Keyboard shortcut: `s` toggles the Scholar panel (skipped while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "s" && e.key !== "S") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      setScholarOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Touch swipe-up on the bottom edge to open the Scholar dock.
  useEffect(() => {
    if (scholarOpen) return;
    let startY = 0;
    let startX = 0;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      // Only respond to swipes that start in the bottom 12% of the viewport.
      if (t.clientY < window.innerHeight * 0.88) return;
      startY = t.clientY;
      startX = t.clientX;
    };
    const onEnd = (e: TouchEvent) => {
      if (!startY) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dy = startY - t.clientY;
      const dx = Math.abs(t.clientX - startX);
      startY = 0;
      if (dy > 50 && dx < 80) setScholarOpen(true);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [scholarOpen]);

  // Clear focused passage when navigating away from the reader
  useEffect(() => () => { setActiveVerse(null); }, [setActiveVerse]);

  const [prefs, setPrefs] = useState<ReaderPrefs>(() => loadPrefs());
  useEffect(() => savePrefs(prefs), [prefs]);

  const [chromeVisible, setChromeVisible] = useState(true);
  const [panel, setPanel] = useState<null | "toc" | "bookmarks" | "annotations" | "search" | "type">(null);
  const [location, setLocation] = useState<ReaderLocation | null>(null);
  const [toc, setToc] = useState<NavItem[]>([]);
  const [selection, setSelection] = useState<{ cfiRange: string; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ cfi: string; excerpt: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [footnote, setFootnote] = useState<FootnotePayload | null>(null);

  const navRef = useRef<{ next: () => void; prev: () => void; goTo: (cfi: string) => void; search: (q: string) => Promise<{ cfi: string; excerpt: string }[]> } | null>(null);

  // ── Catalog fetch ─────────────────────────────────────────────────────────
  const { data: book } = useQuery<BookCatalogEntry>({
    queryKey: ["/api/v1/library", bookId],
    queryFn: async () => (await fetch(`/api/v1/library/${bookId}`, { credentials: "include" })).json(),
    enabled: !!bookId,
  });

  // ── Server progress (only when authed) ────────────────────────────────────
  const { data: serverProgress } = useQuery<BookProgress | null>({
    queryKey: ["/api/v1/library", bookId, "progress"],
    queryFn: async () => {
      const r = await fetch(`/api/v1/library/${bookId}/progress`, { credentials: "include" });
      if (r.status === 401 || r.status === 404) return null;
      return r.json();
    },
    enabled: !!bookId && isAuthenticated,
    retry: false,
  });

  const initialCfi = useMemo<string | null>(() => {
    if (isAuthenticated) return serverProgress?.cfi ?? null;
    try { return localStorage.getItem(GUEST_KEY(bookId, "progress")); } catch { return null; }
  }, [isAuthenticated, serverProgress, bookId]);

  // ── Bookmarks & annotations ───────────────────────────────────────────────
  const { data: bookmarks = [] } = useQuery<BookBookmark[]>({
    queryKey: ["/api/v1/library", bookId, "bookmarks"],
    queryFn: async () => (await fetch(`/api/v1/library/${bookId}/bookmarks`, { credentials: "include" })).json(),
    enabled: !!bookId && isAuthenticated,
  });
  const { data: serverAnnotations = [] } = useQuery<BookAnnotation[]>({
    queryKey: ["/api/v1/library", bookId, "annotations"],
    queryFn: async () => (await fetch(`/api/v1/library/${bookId}/annotations`, { credentials: "include" })).json(),
    enabled: !!bookId && isAuthenticated,
  });

  const [guestAnnotations, setGuestAnnotations] = useState<BookAnnotation[]>([]);
  const [guestBookmarks, setGuestBookmarks] = useState<BookBookmark[]>([]);

  // Reload guest state whenever the book changes (and on initial mount)
  useEffect(() => {
    if (!bookId) return;
    try { setGuestAnnotations(JSON.parse(localStorage.getItem(GUEST_KEY(bookId, "annotations")) || "[]")); } catch { setGuestAnnotations([]); }
    try { setGuestBookmarks(JSON.parse(localStorage.getItem(GUEST_KEY(bookId, "bookmarks")) || "[]")); } catch { setGuestBookmarks([]); }
  }, [bookId]);

  useEffect(() => {
    if (!isAuthenticated) {
      try { localStorage.setItem(GUEST_KEY(bookId, "annotations"), JSON.stringify(guestAnnotations)); } catch {}
    }
  }, [guestAnnotations, isAuthenticated, bookId]);
  useEffect(() => {
    if (!isAuthenticated) {
      try { localStorage.setItem(GUEST_KEY(bookId, "bookmarks"), JSON.stringify(guestBookmarks)); } catch {}
    }
  }, [guestBookmarks, isAuthenticated, bookId]);

  const annotations: AnnotationLite[] = useMemo(() => {
    const src = isAuthenticated ? serverAnnotations : guestAnnotations;
    return src.map((a) => ({
      id: a.id,
      cfiRange: a.cfiRange,
      color: HIGHLIGHT_COLORS.find((c) => c.id === a.color)?.value ?? "#fde68a",
      text: a.text,
      note: a.note,
    }));
  }, [isAuthenticated, serverAnnotations, guestAnnotations]);

  const allBookmarks = isAuthenticated ? bookmarks : guestBookmarks;
  const allAnnotations = isAuthenticated ? serverAnnotations : guestAnnotations;

  // ── Mutations ─────────────────────────────────────────────────────────────
  const saveProgress = useMutation({
    mutationFn: async (loc: ReaderLocation) =>
      apiRequest(`/api/v1/library/${bookId}/progress`, {
        method: "PUT",
        body: JSON.stringify({ cfi: loc.cfi, percentage: loc.percentage }),
      }),
  });

  const lastSaveRef = useRef(0);
  const handleLocation = useCallback((loc: ReaderLocation) => {
    setLocation(loc);
    if (isAuthenticated) {
      const now = Date.now();
      if (now - lastSaveRef.current > 4000) {
        lastSaveRef.current = now;
        saveProgress.mutate(loc);
      }
    } else {
      try { localStorage.setItem(GUEST_KEY(bookId, "progress"), loc.cfi); } catch {}
    }
  }, [isAuthenticated, bookId, saveProgress]);

  const addBookmark = useCallback(async () => {
    if (!location) return;
    const payload = { cfi: location.cfi, label: book?.title ?? null, snippet: null };
    if (isAuthenticated) {
      const created = await apiRequest(`/api/v1/library/${bookId}/bookmarks`, {
        method: "POST", body: JSON.stringify(payload),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/library", bookId, "bookmarks"] });
      toast({ title: "Bookmark added" });
      return created;
    } else {
      const local: BookBookmark = { id: Date.now(), cfi: location.cfi, label: book?.title ?? null, snippet: null, createdAt: new Date().toISOString() };
      setGuestBookmarks((prev) => [local, ...prev]);
      toast({ title: "Bookmark added" });
    }
  }, [location, book, bookId, isAuthenticated, queryClient, toast]);

  const removeBookmark = useCallback(async (id: number) => {
    if (isAuthenticated) {
      await apiRequest(`/api/v1/library/${bookId}/bookmarks/${id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/library", bookId, "bookmarks"] });
    } else {
      setGuestBookmarks((prev) => prev.filter((b) => b.id !== id));
    }
  }, [isAuthenticated, bookId, queryClient]);

  const createHighlight = useCallback(async (color: string) => {
    if (!selection) return;
    const payload = { cfiRange: selection.cfiRange, color, text: selection.text, note: null };
    if (isAuthenticated) {
      await apiRequest(`/api/v1/library/${bookId}/annotations`, { method: "POST", body: JSON.stringify(payload) });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/library", bookId, "annotations"] });
    } else {
      const local: BookAnnotation = { id: Date.now(), cfiRange: selection.cfiRange, color, text: selection.text, note: null, createdAt: new Date().toISOString() };
      setGuestAnnotations((prev) => [local, ...prev]);
    }
    setSelection(null);
  }, [selection, isAuthenticated, bookId, queryClient]);

  const addNoteToSelection = useCallback(async () => {
    if (!selection) return;
    const note = window.prompt("Add a note", "");
    if (note === null) return;
    const payload = { cfiRange: selection.cfiRange, color: "yellow", text: selection.text, note };
    if (isAuthenticated) {
      await apiRequest(`/api/v1/library/${bookId}/annotations`, { method: "POST", body: JSON.stringify(payload) });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/library", bookId, "annotations"] });
    } else {
      const local: BookAnnotation = { id: Date.now(), cfiRange: selection.cfiRange, color: "yellow", text: selection.text, note, createdAt: new Date().toISOString() };
      setGuestAnnotations((prev) => [local, ...prev]);
    }
    setSelection(null);
  }, [selection, isAuthenticated, bookId, queryClient]);

  const deleteAnnotation = useCallback(async (id: number) => {
    if (isAuthenticated) {
      await apiRequest(`/api/v1/library/${bookId}/annotations/${id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/library", bookId, "annotations"] });
    } else {
      setGuestAnnotations((prev) => prev.filter((a) => a.id !== id));
    }
  }, [isAuthenticated, bookId, queryClient]);

  const runSearch = useCallback(async () => {
    if (!navRef.current || !searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await navRef.current.search(searchQuery);
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const fileUrl = `/api/library/${bookId}/file`;
  const theme = READER_THEMES.find((t) => t.id === prefs.themeId) ?? READER_THEMES[0];
  const fontFamily = FONT_FAMILIES.find((f) => f.id === prefs.fontFamilyId)?.css ?? FONT_FAMILIES[0].css;

  if (!bookId) return null;

  return (
    <div
      className="fixed inset-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(340px,38vw)]"
      style={{
        background: theme.bodyBg,
        fontFamily,
        gridTemplateRows: "auto minmax(0,1fr) auto",
        height: "100dvh",
      }}
    >
      {/* Top chrome */}
      <header
        className={`relative z-30 overflow-hidden transition-[max-height,opacity] duration-300 ease-out lg:col-span-2 ${chromeVisible ? "max-h-16 opacity-100" : "max-h-0 opacity-0 pointer-events-none"}`}
        style={{ background: theme.bodyBg, color: theme.bodyColor, borderBottom: `1px solid ${theme.bodyColor}22` }}
      >
        <div className="flex items-center gap-1 px-3 h-12 safe-top">
          <Link
            href="/read"
            className="p-2 rounded hover:bg-black/5 no-underline text-inherit"
            data-testid="reader-back"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 text-center text-sm font-medium truncate px-2">
            {book?.title ?? "Loading…"}
          </div>
          <button onClick={() => setPanel(panel === "search" ? null : "search")} className="p-2 rounded hover:bg-black/5" data-testid="btn-search">
            <Search size={18} />
          </button>
          <button onClick={() => setPanel(panel === "type" ? null : "type")} className="p-2 rounded hover:bg-black/5" data-testid="btn-type">
            <Type size={18} />
          </button>
          <button onClick={addBookmark} className="p-2 rounded hover:bg-black/5" data-testid="btn-add-bookmark">
            <BookmarkPlus size={18} />
          </button>
          <button
            onClick={() => setScholarOpen((v) => !v)}
            className={`p-2 rounded hover:bg-black/5 ${scholarOpen ? "text-gray-900" : ""}`}
            data-testid="btn-scholar"
            title="Ask Scholar"
            aria-pressed={scholarOpen}
          >
            <MessageCircle size={18} />
          </button>
          <button onClick={() => setPanel(panel === "toc" ? null : "toc")} className="p-2 rounded hover:bg-black/5" data-testid="btn-toc">
            <List size={18} />
          </button>
        </div>
      </header>

      {/* Scholar panel — side column on desktop, bottom sheet on mobile */}
      {scholarOpen && (
        <ScholarDock
          bookId={book?.id}
          bookTradition={book?.tradition}
          bookTitle={book?.title}
          currentCfi={location?.cfi ?? null}
          currentPercentage={location?.percentage ?? null}
          selectedPassage={scholarPassage}
          messages={scholarMessages}
          onMessagesChange={setScholarMessages}
          onClose={() => { setScholarOpen(false); setScholarExpanded(false); }}
          initialSend={scholarSeed}
          onInitialSent={() => setScholarSeed(null)}
          expanded={scholarExpanded}
          onToggleExpanded={() => setScholarExpanded((v) => !v)}
        />
      )}

      {/* Reader viewport */}
      <div
        className={cn(
          "relative min-h-0 min-w-0 overflow-hidden lg:row-start-2",
          scholarOpen ? "lg:col-start-1" : "lg:col-span-2",
        )}
      >
        <EpubReader
          fileUrl={fileUrl}
          initialCfi={initialCfi}
          fontSize={prefs.fontSize}
          fontFamily={fontFamily}
          lineHeight={prefs.lineHeight}
          marginPct={prefs.marginPct}
          theme={theme}
          brightness={prefs.brightness}
          annotations={annotations}
          readingMode={prefs.readingMode}
          cleanReadingMode={prefs.cleanReadingMode}
          onFootnote={(payload) => setFootnote(payload)}
          onLocationChange={handleLocation}
          onTocReady={setToc}
          onSelection={(cfiRange, text) => {
            setSelection({ cfiRange, text });
            setScholarPassage(text ? { cfiRange, text } : null);
            if (text.length > 0) {
              verseSeqRef.current += 1;
              setActiveVerse({
                book: book?.title ?? bookId,
                chapter: 1,
                verse: verseSeqRef.current,
                text,
                religion: (book?.tradition ?? null) as Religion | null,
              });
            }
          }}
          onTap={() => setChromeVisible((v) => !v)}
          registerNav={(api) => { navRef.current = api; }}
        />

        {/* Side page-flip controls */}
        <button
          onClick={() => navRef.current?.prev()}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 h-24 w-12 items-center justify-center text-black/30 hover:text-black/70 hover:bg-black/5 rounded-r"
          data-testid="page-prev"
          aria-label="Previous page"
        >
          <ChevronLeft size={28} />
        </button>
        <button
          onClick={() => navRef.current?.next()}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 h-24 w-12 items-center justify-center text-black/30 hover:text-black/70 hover:bg-black/5 rounded-l"
          data-testid="page-next"
          aria-label="Next page"
        >
          <ChevronRight size={28} />
        </button>

        {/* Selection toolbar */}
        {selection && (
          <div
            className="absolute z-40 left-1/2 -translate-x-1/2 bottom-20 bg-gray-900 text-white shadow-xl rounded-full px-2 py-1.5 flex items-center gap-1"
            data-testid="selection-toolbar"
          >
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => createHighlight(c.id)}
                className="w-7 h-7 rounded-full border border-white/40 hover:scale-110 transition-transform"
                style={{ background: c.value }}
                aria-label={`Highlight ${c.id}`}
                data-testid={`hl-${c.id}`}
              />
            ))}
            <div className="w-px h-6 bg-white/20 mx-1" />
            <button onClick={addNoteToSelection} className="p-1.5 hover:bg-white/10 rounded-full" data-testid="add-note" title="Add note">
              <StickyNote size={16} />
            </button>
            <button
              onClick={async () => {
                if (!selection) return;
                try {
                  await navigator.clipboard.writeText(selection.text);
                  toast({ title: "Copied to clipboard" });
                } catch {
                  toast({ title: "Couldn't copy", variant: "destructive" });
                }
                setSelection(null);
              }}
              className="p-1.5 hover:bg-white/10 rounded-full"
              data-testid="copy-selection"
              title="Copy"
            >
              <Copy size={16} />
            </button>
            <button
              onClick={() => {
                if (!selection) return;
                if (selection.text.length > 4000) {
                  toast({
                    title: "Select a shorter passage",
                    description: "Passage Scholar can verify selections up to 4,000 characters.",
                    variant: "destructive",
                  });
                  return;
                }
                const seed = `What does this passage mean? "${selection.text.slice(0, 240)}"`;
                pushChatEvent({ type: "user", text: selection.text, energy: 0.18 });
                setScholarMessages([]);
                setScholarPassage(selection);
                setScholarSeed(seed);
                setScholarOpen(true);
                setSelection(null);
              }}
              className="p-1.5 hover:bg-white/10 rounded-full"
              data-testid="ask-scholar"
              title="Ask Scholar"
            >
              <MessageCircle size={16} />
            </button>
            <button
              onClick={() => {
                if (!selection) return;
                const seed = `Compare across traditions: ${selection.text.slice(0, 240)}`;
                navigate(`/ask?mode=compare&seed=${encodeURIComponent(seed)}`);
              }}
              className="p-1.5 hover:bg-white/10 rounded-full"
              data-testid="compare-selection"
              title="Compare across traditions"
            >
              <Layers size={16} />
            </button>
            <button onClick={() => { setActiveVerse(null); setSelection(null); }} className="p-1.5 hover:bg-white/10 rounded-full" data-testid="cancel-selection" title="Dismiss">
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Bottom chrome — progress */}
      <footer
        className={`relative z-30 overflow-hidden transition-[max-height,opacity] duration-300 ease-out lg:col-span-2 ${chromeVisible ? "max-h-16 opacity-100" : "max-h-0 opacity-0 pointer-events-none"}`}
        style={{ background: theme.bodyBg, color: theme.bodyColor, borderTop: `1px solid ${theme.bodyColor}22` }}
      >
        <div className="px-4 py-2 text-xs flex items-center gap-3 safe-bottom">
          <span className="font-medium">{location?.percentage ?? 0}%</span>
          <div className="flex-1 h-1 bg-current/20 rounded-full overflow-hidden">
            <div className="h-full bg-current/60" style={{ width: `${location?.percentage ?? 0}%` }} />
          </div>
        </div>
      </footer>

      {/* Footnote sheet — bottom on mobile, side popover on md+ */}
      {footnote && (
        <>
          <div
            className="absolute inset-0 z-40 bg-black/30"
            onClick={() => setFootnote(null)}
            data-testid="footnote-backdrop"
          />
          <div
            className="absolute z-50 bg-white text-gray-900 shadow-2xl border border-gray-200
                       inset-x-0 bottom-0 rounded-t-2xl max-h-[60vh]
                       md:inset-x-auto md:right-6 md:bottom-16 md:left-auto md:top-auto
                       md:w-[420px] md:max-h-[70vh] md:rounded-2xl
                       flex flex-col"
            role="dialog"
            aria-label="Footnote"
            data-testid="footnote-sheet"
          >
            <div className="flex items-center justify-between px-4 h-10 border-b border-gray-200 flex-shrink-0">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                {footnote.label || "Footnote"}
              </div>
              <button
                onClick={() => setFootnote(null)}
                className="p-1 hover:bg-gray-100 rounded text-gray-600"
                aria-label="Close footnote"
                data-testid="footnote-close"
              >
                <X size={16} />
              </button>
            </div>
            <div
              className="flex-1 overflow-auto px-4 py-3 text-sm leading-relaxed prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: footnote.html }}
            />
          </div>
        </>
      )}

      {/* Side panel */}
      {panel && (
        <div className="absolute inset-y-0 right-0 z-40 w-full sm:w-96 bg-white text-gray-900 shadow-2xl flex flex-col" data-testid={`panel-${panel}`}>
          <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200">
            <div className="font-semibold text-sm capitalize">{panel}</div>
            <button onClick={() => setPanel(null)} className="p-1 hover:bg-gray-100 rounded">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            {panel === "type" && (
              <div className="p-4 space-y-6">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Reading mode</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPrefs((p) => ({ ...p, readingMode: "scroll" }))}
                      className={`h-10 rounded-md border text-sm ${prefs.readingMode === "scroll" ? "border-gray-900 bg-gray-50 font-semibold" : "border-gray-200"}`}
                      data-testid="reading-mode-scroll"
                    >
                      Scroll
                    </button>
                    <button
                      onClick={() => setPrefs((p) => ({ ...p, readingMode: "paginated" }))}
                      className={`h-10 rounded-md border text-sm ${prefs.readingMode === "paginated" ? "border-gray-900 bg-gray-50 font-semibold" : "border-gray-200"}`}
                      data-testid="reading-mode-paginated"
                    >
                      Page flip
                    </button>
                  </div>
                </div>
                <div>
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <span className="text-sm">
                      <span className="font-medium block">Clean reading mode</span>
                      <span className="text-xs text-gray-500">Hide cover, copyright, and TOC pages</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={prefs.cleanReadingMode}
                      onChange={(e) => setPrefs((p) => ({ ...p, cleanReadingMode: e.target.checked }))}
                      className="h-5 w-5 accent-gray-900"
                      data-testid="toggle-clean-mode"
                    />
                  </label>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Theme</div>
                  <div className="flex gap-2">
                    {READER_THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setPrefs((p) => ({ ...p, themeId: t.id }))}
                        className={`flex-1 h-12 rounded-md border-2 ${prefs.themeId === t.id ? "border-gray-900" : "border-gray-200"}`}
                        style={{ background: t.bodyBg, color: t.bodyColor }}
                        data-testid={`theme-${t.id}`}
                      >
                        Aa
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Font</div>
                  <div className="flex gap-2">
                    {FONT_FAMILIES.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setPrefs((p) => ({ ...p, fontFamilyId: f.id }))}
                        className={`flex-1 h-10 rounded-md border ${prefs.fontFamilyId === f.id ? "border-gray-900 bg-gray-50" : "border-gray-200"}`}
                        style={{ fontFamily: f.css }}
                        data-testid={`font-${f.id}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs uppercase tracking-wide text-gray-500 mb-2">
                    <span>Text size</span>
                    <span>{prefs.fontSize}%</span>
                  </div>
                  <Slider
                    value={[prefs.fontSize]}
                    min={80} max={180} step={5}
                    onValueChange={([v]) => setPrefs((p) => ({ ...p, fontSize: v }))}
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs uppercase tracking-wide text-gray-500 mb-2">
                    <span>Line spacing</span>
                    <span>{prefs.lineHeight.toFixed(1)}×</span>
                  </div>
                  <Slider
                    value={[Math.round(prefs.lineHeight * 10)]}
                    min={12} max={22} step={1}
                    onValueChange={([v]) => setPrefs((p) => ({ ...p, lineHeight: v / 10 }))}
                    data-testid="slider-line-height"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs uppercase tracking-wide text-gray-500 mb-2">
                    <span>Margins</span>
                    <span>{prefs.marginPct}%</span>
                  </div>
                  <Slider
                    value={[prefs.marginPct]}
                    min={0} max={20} step={1}
                    onValueChange={([v]) => setPrefs((p) => ({ ...p, marginPct: v }))}
                    data-testid="slider-margin"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs uppercase tracking-wide text-gray-500 mb-2">
                    <span>Brightness</span>
                    <span>{Math.round(prefs.brightness * 100)}%</span>
                  </div>
                  <Slider
                    value={[prefs.brightness * 100]}
                    min={50} max={100} step={5}
                    onValueChange={([v]) => setPrefs((p) => ({ ...p, brightness: v / 100 }))}
                  />
                </div>
              </div>
            )}

            {panel === "toc" && (
              <ul className="divide-y divide-gray-100">
                <li className="px-4 py-2 text-xs uppercase text-gray-500">Contents</li>
                {toc.length === 0 && <li className="px-4 py-6 text-sm text-gray-500">Loading…</li>}
                {toc.map((item) => (
                  <TocItem key={item.id || item.href} item={item} onSelect={(href) => { navRef.current?.goTo(href); setPanel(null); }} />
                ))}
              </ul>
            )}

            {panel === "search" && (
              <div className="p-4 space-y-3">
                <form onSubmit={(e) => { e.preventDefault(); runSearch(); }} className="flex gap-2">
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search this book…"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    data-testid="input-search"
                  />
                  <Button type="submit" size="sm" disabled={searching}>
                    {searching ? "…" : "Find"}
                  </Button>
                </form>
                <ul className="divide-y divide-gray-100">
                  {searchResults.map((r, idx) => (
                    <li key={idx}>
                      <button
                        onClick={() => { navRef.current?.goTo(r.cfi); setPanel(null); }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                        data-testid={`search-result-${idx}`}
                      >
                        <div className="line-clamp-3 text-gray-700">{stripTags(r.excerpt)}</div>
                      </button>
                    </li>
                  ))}
                  {!searching && searchQuery && searchResults.length === 0 && (
                    <li className="px-3 py-6 text-sm text-gray-500 text-center">No matches</li>
                  )}
                </ul>
              </div>
            )}

            {panel === "bookmarks" && (
              <ul className="divide-y divide-gray-100">
                {allBookmarks.length === 0 && (
                  <li className="px-4 py-8 text-center text-sm text-gray-500">No bookmarks yet</li>
                )}
                {allBookmarks.map((b) => (
                  <li key={b.id} className="px-4 py-3 flex items-start gap-3">
                    <button onClick={() => { navRef.current?.goTo(b.cfi); setPanel(null); }} className="flex-1 text-left">
                      <div className="text-sm font-medium">{b.label || "Bookmark"}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{new Date(b.createdAt).toLocaleString()}</div>
                    </button>
                    <button onClick={() => removeBookmark(b.id)} className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {panel === "annotations" && (
              <ul className="divide-y divide-gray-100">
                {allAnnotations.length === 0 && (
                  <li className="px-4 py-8 text-center text-sm text-gray-500">No highlights yet</li>
                )}
                {allAnnotations.map((a) => (
                  <li key={a.id} className="px-4 py-3 flex items-start gap-3">
                    <span
                      className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: HIGHLIGHT_COLORS.find((c) => c.id === a.color)?.value ?? "#fde68a" }}
                    />
                    <button onClick={() => { navRef.current?.goTo(a.cfiRange); setPanel(null); }} className="flex-1 text-left">
                      <div className="text-sm text-gray-800 line-clamp-3">"{a.text}"</div>
                      {a.note && <div className="text-xs italic text-gray-600 mt-1">{a.note}</div>}
                    </button>
                    <button onClick={() => deleteAnnotation(a.id)} className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Panel switcher tabs */}
          {(panel === "bookmarks" || panel === "annotations" || panel === "toc") && (
            <div className="border-t border-gray-200 grid grid-cols-3">
              <button onClick={() => setPanel("toc")} className={`py-2 text-xs flex flex-col items-center gap-0.5 ${panel === "toc" ? "text-gray-900 font-semibold" : "text-gray-500"}`}>
                <List size={14} /> Contents
              </button>
              <button onClick={() => setPanel("bookmarks")} className={`py-2 text-xs flex flex-col items-center gap-0.5 ${panel === "bookmarks" ? "text-gray-900 font-semibold" : "text-gray-500"}`}>
                <BookmarkPlus size={14} /> Bookmarks
              </button>
              <button onClick={() => setPanel("annotations")} className={`py-2 text-xs flex flex-col items-center gap-0.5 ${panel === "annotations" ? "text-gray-900 font-semibold" : "text-gray-500"}`}>
                <Highlighter size={14} /> Highlights
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TocItem({ item, onSelect, depth = 0 }: { item: NavItem; onSelect: (href: string) => void; depth?: number }) {
  return (
    <>
      <li>
        <button
          onClick={() => onSelect(item.href)}
          className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
          style={{ paddingLeft: 16 + depth * 16 }}
        >
          {item.label.trim()}
        </button>
      </li>
      {item.subitems?.map((sub) => (
        <TocItem key={sub.id || sub.href} item={sub} onSelect={onSelect} depth={depth + 1} />
      ))}
    </>
  );
}
