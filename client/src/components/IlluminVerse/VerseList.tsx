import { useState, useEffect, useMemo, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Volume2, Copy, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useElevenLabsReader } from "@/hooks/useElevenLabsReader";
import { AutoReaderControls } from "./AutoReaderControls";
import { usePersonaSceneBridge } from "@/hooks/usePersonaSceneBridge";
import { cn } from "@/lib/utils";
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
}

const PAGE_SIZE = 2;

const defaultPageVariants = {
  enter: (direction: number) => ({
    rotateY: direction > 0 ? -35 : 35,
    opacity: 0,
    x: direction * 120,
    scale: 0.96,
  }),
  center: {
    rotateY: 0,
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 120, damping: 20 },
  },
  exit: (direction: number) => ({
    rotateY: direction > 0 ? 25 : -25,
    opacity: 0,
    x: direction * -90,
    scale: 0.96,
  }),
};

const reducedMotionPageVariants = {
  enter: () => ({
    opacity: 0,
    x: 0,
    rotateY: 0,
    scale: 0.98,
  }),
  center: {
    opacity: 1,
    x: 0,
    rotateY: 0,
    scale: 1,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: () => ({
    opacity: 0,
    x: 0,
    rotateY: 0,
    scale: 0.98,
  }),
};

const verseGradientMap: Record<string, string> = {
  islam: "from-emerald-50 via-white to-emerald-100",
  christianity: "from-indigo-50 via-white to-blue-100",
  judaism: "from-purple-50 via-white to-indigo-100",
  hinduism: "from-amber-50 via-white to-orange-100",
  buddhism: "from-violet-50 via-white to-pink-100",
  universal: "from-slate-50 via-white to-slate-100",
};

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
  readingSession
}: VerseListProps) {
  const { toast } = useToast();
  const { setActiveVerse, pushChatEvent } = usePersonaSceneBridge();
  const prefersReducedMotion = useReducedMotion();
  const pageVariants = prefersReducedMotion ? reducedMotionPageVariants : defaultPageVariants;

  const [pageIndex, setPageIndex] = useState(0);
  const [pageDirection, setPageDirection] = useState<1 | -1>(1);
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
      if (verseNumber == null) {
        return;
      }
      const verse = scriptures.find((entry) => entry.verse === verseNumber);
      if (verse) {
        handleVerseFocus(verse);
      }
    },
  });

  const handleCopy = useCallback((verse: Scripture) => {
    const verseText = `${verse.book} ${verse.chapter}:${verse.verse} — ${verse.text}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(verseText).catch(() => {
        toast({
          title: "Copy failed",
          description: "Please copy manually if needed.",
          variant: "destructive",
        });
      });
    }
    onCopyVerse?.(verseText);
    toast({
      title: "Verse copied",
      description: `${verse.book} ${verse.chapter}:${verse.verse} ready for sharing`,
      variant: "default",
    });
  }, [onCopyVerse, toast]);

  const handlePlayVerse = useCallback((verse: Scripture) => {
    const index = scriptures.findIndex((entry) => entry.verse === verse.verse);
    if (index >= 0) {
      startReading(index);
    }
  }, [scriptures, startReading]);

  useEffect(() => {
    setPageIndex(0);
    setPageDirection(1);
    setVersesVisited(new Set());
  }, [selectedChapter, selectedBook]);

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
        setPageDirection(newPage > pageIndex ? 1 : -1);
        setPageIndex(newPage);
      }
      const verse = scriptures[index];
      setTimeout(() => handleVerseFocus(verse), 150);
    }
  }, [highlightedVerse, scriptures, pageIndex, handleVerseFocus]);

  const handlePageChange = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= totalPages) return;
    setPageDirection(nextIndex > pageIndex ? 1 : -1);
    setPageIndex(nextIndex);
  };

  const gradientClass = verseGradientMap[selectedReligion ?? "universal"];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-3xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="flex h-full flex-col items-center justify-center border-dashed border-red-200 bg-red-50/40 p-6 text-center">
        <p className="text-sm text-red-600">We couldn’t load this chapter right now.</p>
        <p className="text-xs text-red-500">Please try again or choose another book.</p>
      </Card>
    );
  }

  if (!scriptures.length) {
    return (
      <Card className="flex h-full flex-col items-center justify-center border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
        <p className="text-sm font-semibold text-slate-600">No verses found for this chapter yet.</p>
        <p className="text-xs text-slate-500">Choose a different chapter or explore another tradition.</p>
      </Card>
    );
  }

  const readerActiveVerse = scriptures[readerVerseIndex];

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {religionName} · {selectedBook}
          </h2>
          <p className="text-sm text-slate-500">Chapter {selectedChapter}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => onChapterChange(Math.max(1, selectedChapter - 1))}
            disabled={selectedChapter <= 1}
            title="Previous chapter"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium text-slate-600">Chapter {selectedChapter}</span>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => onChapterChange(Math.min(maxChapters, selectedChapter + 1))}
            disabled={selectedChapter >= maxChapters}
            title="Next chapter"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-2 text-xs text-slate-600 shadow-sm backdrop-blur">
        <div>
          Page {pageIndex + 1} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => handlePageChange(pageIndex - 1)}
            disabled={pageIndex === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => handlePageChange(pageIndex + 1)}
            disabled={pageIndex >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      </div>

      <div className="relative flex-1">
        <AnimatePresence initial={false} custom={pageDirection} mode="wait">
          <motion.div
            key={pageIndex}
            custom={pageDirection}
            variants={pageVariants}
            initial={prefersReducedMotion ? false : "enter"}
            animate="center"
            exit={prefersReducedMotion ? false : "exit"}
            className="grid h-full gap-4 md:grid-cols-2"
          >
            {currentPage.map((verse) => {
              const isFocused = focusedVerse?.verse === verse.verse;
              const isHighlighted = highlightedVerse === verse.verse;
              const isAudioActive = readerActiveVerse?.verse === verse.verse && isPlaying;
              return (
                <Card
                  key={`${verse.book}-${verse.chapter}-${verse.verse}`}
                  className={cn(
                    "relative overflow-hidden border-none bg-white/80 shadow-lg transition-transform duration-300",
                    (isFocused || isAudioActive) && "scale-[1.01] shadow-xl",
                    isHighlighted && "ring-2 ring-teal-300"
                  )}
                  onMouseEnter={() => handleVerseFocus(verse)}
                  onFocus={() => handleVerseFocus(verse)}
                >
                  <div className={cn("absolute inset-0 opacity-80", `bg-gradient-to-br ${gradientClass}`)} />
                  <div className="relative flex h-full flex-col gap-3 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Verse {verse.verse}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {verse.book} {verse.chapter}:{verse.verse}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                          onClick={() => handlePlayVerse(verse)}
                          title="Play immersive recitation from this verse"
                        >
                          <Volume2 className={cn("h-4 w-4", isAudioActive ? "text-teal-600" : "text-slate-500")}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                          onClick={() => handleCopy(verse)}
                          title="Copy verse"
                        >
                          <Copy className="h-4 w-4 text-slate-500" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm leading-relaxed text-slate-800">
                      {verse.text}
                    </p>

                    {isAudioActive && (
                      <span className="text-[11px] font-medium uppercase tracking-wide text-teal-600">
                        Persona reciting…
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-auto space-y-3 rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Immersive recitation</p>
            <p className="text-xs text-slate-500">
              Let your chosen persona guide the reading with gentle pauses and ambient tone.
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
                ? scriptures.findIndex((verse) => verse.verse === focusedVerse.verse)
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
          <p className="text-[11px] text-slate-500">Preparing voices…</p>
        )}
      </div>
    </div>
  );
}
