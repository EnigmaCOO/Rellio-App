/**
 * useVerseActions — manages the open/close state of the VerseActionTray.
 * Tracks which verse has the tray open, and provides open/close/toggle helpers.
 */

import { useState, useCallback } from "react";
import type { Scripture } from "@shared/schema";

interface UseVerseActionsReturn {
  openVerseKey: string | null;
  openTrayFor: (verse: Scripture) => void;
  closeTray: () => void;
  isTrayOpen: (verse: Scripture) => boolean;
  verseKey: (verse: Scripture) => string;
}

export function useVerseActions(): UseVerseActionsReturn {
  const [openVerseKey, setOpenVerseKey] = useState<string | null>(null);

  const verseKey = useCallback((v: Scripture) => `${v.religion}::${v.book}::${v.chapter}::${v.verse}`, []);

  const openTrayFor = useCallback((verse: Scripture) => {
    const key = `${verse.religion}::${verse.book}::${verse.chapter}::${verse.verse}`;
    setOpenVerseKey((prev) => (prev === key ? null : key));
  }, []);

  const closeTray = useCallback(() => setOpenVerseKey(null), []);

  const isTrayOpen = useCallback((verse: Scripture) => {
    return openVerseKey === `${verse.religion}::${verse.book}::${verse.chapter}::${verse.verse}`;
  }, [openVerseKey]);

  return { openVerseKey, openTrayFor, closeTray, isTrayOpen, verseKey };
}
