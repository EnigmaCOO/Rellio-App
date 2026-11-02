import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useElevenLabsReader } from "@/hooks/useElevenLabsReader";
import { AutoReaderControls } from "./AutoReaderControls";
import { usePersonaSceneBridge } from "@/hooks/usePersonaSceneBridge";
import { useVerseActions } from "@/hooks/useVerseActions";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import type { Religion, Scripture } from "@shared/schema";

interface VerseListProps {
  selectedReligion: Religion | null;
  selectedBook: string;
  selectedChapter: number;
  scriptures?: Scripture[];
  isLoading: boolean;
  isError?: boolean;
  religionName: string;
  onChapterChange: (chapter: number) => void;
  onCopyVerse?: (verseText: string) => void;
  highlightedVerse?: number;
  maxChapters?: number;
  onVerseRead?: () => void;
  readingSession?: {
    incrementVersesRead?: () => void;
  };
  onBookmarkVerse?: (verse: Scripture) => void;
  onAskSage?: (prompt: string) => void;
}

const PAGE_SIZE = 2;

export function VerseList({
  selectedReligion,
  selectedBook,
  selectedChapter,
  scriptures = [],
  isLoading,
  isError = false,
  religionName,
  onChapterChange,
  onCopyVerse,
  highlightedVerse,
  maxChapters = 10,
  onVerseRead,
  readingSession,
  onBookmarkVerse,
  onAskSage,
}: VerseListProps) {
  const { toast } = useToast();
  const { setActiveVerse, pushChatEvent } = usePersonaSceneBridge();
  const { closeTray } = useVerseActions();

  const [pageIndex, setPageIndex] = useState(0);
  const [focusedVerse, setFocusedVerse] = useState<Scripture | null>(null);
  const [versesVisited, setVersesVisited] = useState<Set<number>>(new Set());

  const pages = useMemo(() => {
    if (!scriptures.length) return [] as Scripture[][];
    const chunks: Scripture[][] = [];
    for (let i = 0; i < scriptures.length; i += PAGE_SIZE) {
      chunks.push(scriptures.slice(i, i + PAGE_SIZE));
    }
    return chunks;
  }, [scriptures]);

  const totalPages = pages.length;
  const currentPage = pages[pageIndex] ?? [];

  const handleVerseFocus = useCallback((verse: Scripture | null) => {
    if (!verse) {
      setFocusedVerse(null);
      setActiveVerse(null);
      return;
    }
    if (!versesVisited.has(verse.verse)) {
      setVersesVisited((prev) => {
        const next = new Set(prev);
        next.add(verse.verse);
        return next;
      });
      onVerseRead?.();
      readingSession?.incrementVersesRead?.();
    }
    setFocusedVerse(verse);
    setActiveVerse({
      book: verse.book,
      chapter: verse.chapter,
      verse: verse.verse,
      text: verse.text,
      religion: verse.religion as Religion,
    });
    pushChatEvent({
      type: "system",
      text: `Exploring ${verse.book} ${verse.chapter}:${verse.verse}`,
      energy: 0.14,
    });
  }, [versesVisited, onVerseRead, readingSession, setActiveVerse, pushChatEvent]);

  const {
    isPlaying,
    isPaused,
    currentVerseIndex: readerVerseIndex,
    speed,
    volume,
    pauseDuration,
    availableVoices,
    selectedVoiceIndex,
    startReading,
    pauseReading,
    resumeReading,
    stopReading,
    setSpeed,
    setVolume,
    setPauseDuration,
    setVoice,
    isLoading: isReaderLoading,
  } = useElevenLabsReader({
    scriptures,
    onVerseHighlight: (verseNumber) => {
      if (verseNumber == null) return;
      const verse = scriptures.find((entry) => entry.verse === verseNumber);
      if (verse) handleVerseFocus(verse);
    },
  });

  const handlePlayVerse = useCallback((verse: Scripture) => {
    const index = scriptures.findIndex((entry) => entry.verse === verse.verse);
    if (index >= 0) startReading(index);
    track("verse_audio_play", { book: verse.book, chapter: verse.chapter, verse: verse.verse });
  }, [scriptures, startReading]);

  useEffect(() => {
    setPageIndex(0);
    setVersesVisited(new Set());
    closeTray();
  }, [selectedChapter, selectedBook, closeTray]);

  useEffect(() => {
    if (!currentPage.length) {
      handleVerseFocus(null);
      return;
    }
    const candidate = currentPage[0];
    if (!focusedVerse || focusedVerse.verse !== candidate.verse) {
      handleVerseFocus(candidate);
    }
  }, [currentPage, focusedVerse, handleVerseFocus]);

  useEffect(() => {
    if (!highlightedVerse || !scriptures.length) return;
    const index = scriptures.findIndex((verse) => verse.verse === highlightedVerse);
    if (index >= 0) {
      const newPage = Math.floor(index / PAGE_SIZE);
      if (newPage !== pageIndex) {
        setPageIndex(newPage);
      }
      const verse = scriptures[index];
      setTimeout(() => handleVerseFocus(verse), 150);
    }
  }, [highlightedVerse, scriptures, pageIndex, handleVerseFocus]);

  const handlePageChange = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= totalPages) return;
    closeTray();
    setPageIndex(nextIndex);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton-shimmer h-32 w-full rounded-3xl" />
        <div className="skeleton-shimmer h-32 w-full rounded-3xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 p-8 text-center bg-gray-50">
        <p className="text-sm font-semibold mb-1 text-gray-700">Couldn't load this chapter</p>
        <p className="text-xs text-gray-500">Please try again or choose another book.</p>
      </div>
    );
  }

  if (!scriptures.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 p-8 text-center bg-gray-50">
        <p className="text-sm font-semibold mb-1 text-gray-900">No verses found for this chapter</p>
        <p className="text-xs text-gray-500">Choose a different chapter or explore another tradition.</p>
      </div>
    );
  }

  const readerActiveVerse = scriptures[readerVerseIndex];

  return (
    <div className="flex h-full flex-col gap-5">
      {/* Chapter header + nav */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {religionName} · {selectedBook}
          </h2>
          <p className="text-sm text-gray-500">Chapter {selectedChapter}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => onChapterChange(Math.max(1, selectedChapter - 1))}
            disabled={selectedChapter <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium text-gray-600">
            Chapter {selectedChapter}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => onChapterChange(Math.min(maxChapters, selectedChapter + 1))}
            disabled={selectedChapter >= maxChapters}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Page indicator */}
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs">
        <span className="text-gray-500">Page {pageIndex + 1} of {totalPages}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => handlePageChange(pageIndex - 1)} disabled={pageIndex === 0}>Previous</Button>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => handlePageChange(pageIndex + 1)} disabled={pageIndex >= totalPages - 1}>Next</Button>
        </div>
      </div>

      {/* Verse cards — static, no flip animation */}
      <div className="grid gap-4 md:grid-cols-2">
        {currentPage.map((verse) => {
          const isHighlighted = highlightedVerse === verse.verse;
          const isAudioActive = readerActiveVerse?.verse === verse.verse && isPlaying;
          return (
            <div key={`${verse.book}-${verse.chapter}-${verse.verse}`} className="relative">
              <Card
                className={cn(
                  "relative overflow-visible border border-gray-100 bg-white",
                  isHighlighted && "ring-2 ring-gray-300"
                )}
                onMouseEnter={() => handleVerseFocus(verse)}
                onFocus={() => handleVerseFocus(verse)}
              >
                <div className="relative flex h-full flex-col gap-3 p-5">
                  {/* Verse header */}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Verse {verse.verse}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {verse.book} {verse.chapter}:{verse.verse}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={() => handlePlayVerse(verse)}
                        title="Play recitation"
                      >
                        <Volume2 className={cn("h-4 w-4", isAudioActive ? "text-gray-900" : "text-gray-400")} />
                      </Button>
                    </div>
                  </div>

                  {/* Verse text */}
                  <p className="text-sm leading-relaxed font-scripture text-gray-900">
                    {verse.text}
                  </p>

                  {isAudioActive && (
                    <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                      Reciting…
                    </span>
                  )}
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Immersive reader controls */}
      <div className="mt-auto space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Recitation</p>
            <p className="text-xs text-gray-500">
              Persona-guided reading with gentle pauses.
            </p>
          </div>
        </div>
        <AutoReaderControls
          isPlaying={isPlaying}
          isPaused={isPaused}
          speed={speed}
          volume={volume}
          pauseDuration={pauseDuration}
          onPlay={() => {
            if (isPaused) {
              resumeReading();
            } else if (!isPlaying) {
              const startIndex = focusedVerse
                ? scriptures.findIndex((v) => v.verse === focusedVerse.verse)
                : 0;
              startReading(Math.max(0, startIndex));
            }
          }}
          onPause={pauseReading}
          onStop={stopReading}
          onSpeedChange={setSpeed}
          onVolumeChange={setVolume}
          onPauseDurationChange={setPauseDuration}
          onVoiceChange={setVoice}
          availableVoices={availableVoices}
          selectedVoiceIndex={selectedVoiceIndex}
          disabled={isReaderLoading}
        />
        {isReaderLoading && (
          <p className="text-[11px] text-gray-400">Preparing voices…</p>
        )}
      </div>
    </div>
  );
}
