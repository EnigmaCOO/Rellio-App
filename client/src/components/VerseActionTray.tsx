import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, MessageSquarePlus, Sparkles, X, Check, MoreHorizontal, Share2, Highlighter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { track } from "@/lib/analytics";
import type { Scripture } from "@shared/schema";

// ─── Local storage bookmark helpers ─────────────────────────────────────────

const LS_BOOKMARKS_KEY = "rellio_guest_bookmarks";

interface GuestBookmark { religion: string; book: string; chapter: number; verse: number; text: string }

function getGuestBookmarks(): GuestBookmark[] {
  try { return JSON.parse(localStorage.getItem(LS_BOOKMARKS_KEY) || "[]"); } catch { return []; }
}
function setGuestBookmarks(bks: GuestBookmark[]) {
  localStorage.setItem(LS_BOOKMARKS_KEY, JSON.stringify(bks));
}
function isGuestBookmarked(v: Scripture) {
  return getGuestBookmarks().some(b => b.religion === v.religion && b.book === v.book && b.chapter === v.chapter && b.verse === v.verse);
}
function toggleGuestBookmark(v: Scripture) {
  const all = getGuestBookmarks();
  const idx = all.findIndex(b => b.religion === v.religion && b.book === v.book && b.chapter === v.chapter && b.verse === v.verse);
  if (idx > -1) { all.splice(idx, 1); } else { all.push({ religion: v.religion, book: v.book, chapter: v.chapter, verse: v.verse, text: v.text }); }
  setGuestBookmarks(all);
  return idx === -1;
}

// ─── Highlight colors ────────────────────────────────────────────────────────

const HIGHLIGHT_COLORS: { id: string; label: string; bg: string; border: string }[] = [
  { id: "light",  label: "Light",  bg: "rgba(0,0,0,0.06)",       border: "#9ca3af" },
  { id: "medium", label: "Medium", bg: "rgba(0,0,0,0.12)",       border: "#6b7280" },
  { id: "strong", label: "Dark",   bg: "rgba(0,0,0,0.22)",       border: "#374151" },
];

export function getHighlightStyle(color: string) {
  const c = HIGHLIGHT_COLORS.find(h => h.id === color);
  return c ? { background: c.bg, borderLeft: `3px solid ${c.border}` } : {};
}

// ─── Action tray component ────────────────────────────────────────────────────

interface VerseActionTrayProps {
  verse: Scripture;
  religion: string;
  onAskSage?: (prompt: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function VerseActionTray({ verse, religion, onAskSage, isOpen, onClose }: VerseActionTrayProps) {
  const { isGuest } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showMore, setShowMore] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [localBookmarked, setLocalBookmarked] = useState(() => isGuest ? isGuestBookmarked(verse) : false);
  const [localHighlight, setLocalHighlight] = useState<string | null>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showNoteInput && noteRef.current) noteRef.current.focus();
  }, [showNoteInput]);

  const { data: existingBookmark } = useQuery<{ id: number } | null>({
    queryKey: ["/api/v1/bookmarks/verse", religion, verse.book, verse.chapter, verse.verse],
    queryFn: async () => {
      const all = await apiRequest("GET", "/api/v1/bookmarks") as any[];
      return all?.find((b: any) => b.religion === religion && b.book === verse.book && b.chapter === verse.chapter && b.verse === verse.verse) ?? null;
    },
    enabled: !isGuest && isOpen,
    retry: false,
  });

  const isBookmarked = isGuest ? localBookmarked : !!existingBookmark;

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (isGuest) {
        const added = toggleGuestBookmark({ ...verse, religion });
        setLocalBookmarked(added);
        return added;
      }
      if (existingBookmark) {
        await apiRequest("DELETE", `/api/v1/bookmarks/${existingBookmark.id}`);
        return false;
      } else {
        await apiRequest("POST", "/api/v1/bookmarks", { religion, book: verse.book, chapter: verse.chapter, verse: verse.verse, text: verse.text });
        return true;
      }
    },
    onSuccess: (added) => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/bookmarks"] });
      track(added ? "verse_bookmarked" : "verse_bookmark_removed", { religion, book: verse.book, chapter: verse.chapter, verse: verse.verse });
      toast({ title: added ? "Verse saved" : "Bookmark removed", duration: 1800 });
    },
  });

  const highlightMutation = useMutation({
    mutationFn: async (color: string) => {
      if (localHighlight === color) {
        setLocalHighlight(null);
        if (!isGuest) {
          const highlights = await apiRequest("GET", `/api/v1/highlights/chapter?religion=${religion}&book=${encodeURIComponent(verse.book)}&chapter=${verse.chapter}`) as any[];
          const h = highlights?.find((h: any) => h.verse === verse.verse);
          if (h) await apiRequest("DELETE", `/api/v1/highlights/${h.id}`);
        }
        return null;
      }
      setLocalHighlight(color);
      if (!isGuest) {
        await apiRequest("POST", "/api/v1/highlights", { religion, book: verse.book, chapter: verse.chapter, verse: verse.verse, color });
      }
      return color;
    },
    onSuccess: (color) => {
      track("verse_highlighted", { religion, book: verse.book, verse: verse.verse, color: color ?? "removed" });
      setShowHighlightPicker(false);
      toast({ title: color ? "Highlight added" : "Highlight removed", duration: 1500 });
    },
  });

  const noteMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!isGuest) {
        await apiRequest("POST", "/api/v1/notes", { religion, book: verse.book, chapter: verse.chapter, verse: verse.verse, text, verseText: verse.text });
      }
      return text;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/notes"] });
      track("note_saved", { religion, book: verse.book, verse: verse.verse });
      toast({ title: "Note saved", duration: 1800 });
      setShowNoteInput(false);
      setNoteText("");
    },
  });

  const handleShare = async () => {
    const shareText = `"${verse.text}" — ${verse.book} ${verse.chapter}:${verse.verse} | Rellio`;
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast({ title: "Copied to clipboard", duration: 1800 });
      }
      track("verse_shared", { religion, book: verse.book, verse: verse.verse });
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl border border-gray-200 shadow-lg z-50 overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          {verse.book} {verse.chapter}:{verse.verse}
        </p>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
          <X size={14} className="text-gray-500" />
        </button>
      </div>

      {/* Primary action: Ask AI */}
      {onAskSage && (
        <div className="px-4 pt-3 pb-2">
          <button
            onClick={() => {
              onAskSage(`Explain this verse: "${verse.text}" (${verse.book} ${verse.chapter}:${verse.verse})`);
              track("ai_prompt_clicked", { source: "verse_tray", verse: verse.verse });
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            <Sparkles size={15} />
            Ask AI about this verse
          </button>
        </div>
      )}

      {/* Secondary actions row */}
      <div className="flex items-center px-4 pb-3 gap-2">
        <button
          onClick={() => bookmarkMutation.mutate()}
          disabled={bookmarkMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 flex-1 justify-center"
        >
          {isBookmarked
            ? <BookmarkCheck size={14} className="text-black" />
            : <Bookmark size={14} />}
          {isBookmarked ? "Saved" : "Save"}
        </button>
        <button
          onClick={() => { setShowMore(!showMore); setShowNoteInput(false); setShowHighlightPicker(false); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <MoreHorizontal size={14} />
          More
        </button>
      </div>

      {/* Overflow actions */}
      {showMore && (
        <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-2">
          <button
            onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowNoteInput(false); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Highlighter size={14} className={localHighlight ? "text-black" : ""} />
            Highlight
          </button>
          <button
            onClick={() => { setShowNoteInput(!showNoteInput); setShowHighlightPicker(false); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <MessageSquarePlus size={14} className={showNoteInput ? "text-black" : ""} />
            Note
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Share2 size={14} />
            Share
          </button>
        </div>
      )}

      {/* Highlight color picker */}
      {showHighlightPicker && (
        <div className="px-4 pb-3 flex items-center gap-3 border-t border-gray-100 pt-3">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => highlightMutation.mutate(c.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all"
              style={{
                background: localHighlight === c.id ? c.bg : "transparent",
                borderColor: localHighlight === c.id ? c.border : "#e5e5e5",
                color: "#374151",
              }}
            >
              <span className="w-3 h-3 rounded-full" style={{ background: c.border }} />
              {c.label}
              {localHighlight === c.id && <Check size={12} />}
            </button>
          ))}
        </div>
      )}

      {/* Note input */}
      {showNoteInput && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <textarea
            ref={noteRef}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add your reflection or note…"
            rows={3}
            className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none border border-gray-200 bg-gray-50 text-black placeholder:text-gray-400"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => { setShowNoteInput(false); setNoteText(""); }}
              className="px-3 py-1.5 text-xs rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => noteText.trim() && noteMutation.mutate(noteText.trim())}
              disabled={!noteText.trim() || noteMutation.isPending}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-black text-white transition-opacity disabled:opacity-40"
            >
              {noteMutation.isPending ? "Saving…" : "Save note"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
