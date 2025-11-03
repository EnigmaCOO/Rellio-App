import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BookOpen, Sparkles, Volume2 } from "lucide-react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Religion } from "@shared/schema";

export type BookPreview = {
  id: string;
  title: string;
  description: string;
  route: string;
  highlight?: string;
  livePreview?: React.ReactNode;
};

export type FaithLibrary = {
  id: Religion;
  name: string;
  tagline: string;
  accent: string;
  glow: string;
  voicePrompt?: string;
  books: BookPreview[];
};

type BookCarouselProps = {
  libraries: FaithLibrary[];
  onNavigate: (route: string) => void;
  onVoicePrompt?: (prompt: string, meta: { faith: Religion }) => void;
};

export function BookCarousel({ libraries, onNavigate, onVoicePrompt }: BookCarouselProps) {
  const shouldReduceMotion = useReducedMotion();
  const [activeId, setActiveId] = useState<Religion | undefined>(() => libraries[0]?.id);

  const activeLibrary = useMemo(() => {
    return libraries.find((library) => library.id === activeId) ?? libraries[0];
  }, [activeId, libraries]);

  if (!activeLibrary) {
    return null;
  }

  const hasVoicePrompt = Boolean(activeLibrary.voicePrompt);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {libraries.map((library) => {
          const isActive = library.id === activeLibrary.id;
          return (
            <button
              key={library.id}
              type="button"
              onClick={() => setActiveId(library.id)}
              className={cn(
                "group flex min-w-[9rem] flex-1 flex-col items-start justify-center rounded-2xl border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/80 sm:min-w-[10rem]",
                isActive
                  ? "border-yellow-300/60 bg-yellow-300/10 text-yellow-100 shadow-[0_0_20px_rgba(250,204,21,0.2)]"
                  : "border-yellow-200/20 bg-black/40 text-yellow-100/70 hover:border-yellow-200/40 hover:bg-yellow-200/5"
              )}
            >
              <span className="text-xs font-semibold tracking-[0.22em] text-yellow-100/80">
                {library.name}
              </span>
              <span className="mt-2 text-[11px] leading-relaxed text-yellow-100/60">
                {library.tagline}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeLibrary.id}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.4, ease: "easeOut" }}
          className={cn(
            "relative rounded-3xl border border-yellow-200/20 bg-black/60 p-6 backdrop-blur",
            activeLibrary.glow
          )}
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(255, 215, 0, 0.12), rgba(0, 0, 0, 0.35)), linear-gradient(160deg, ${activeLibrary.accent})`,
          }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-yellow-200/80">
                Sacred library
              </p>
              <h3 className="mt-1 font-serif text-2xl text-yellow-100 sm:text-3xl">
                {activeLibrary.name}
              </h3>
            </div>
            {hasVoicePrompt && (
              <Button
                type="button"
                variant="outline"
                className="border-yellow-200/40 bg-yellow-200/10 text-yellow-100 hover:bg-yellow-200/20"
                onClick={() => {
                  if (activeLibrary.voicePrompt) {
                    onVoicePrompt?.(activeLibrary.voicePrompt, { faith: activeLibrary.id });
                  }
                }}
              >
                <Volume2 className="h-4 w-4" />
                Play voice prompt
              </Button>
            )}
          </div>

          <Carousel
            opts={{ align: "start", loop: activeLibrary.books.length > 2 }}
            className="mt-6"
          >
            <CarouselContent className="-ml-4">
              {activeLibrary.books.map((book) => (
                <CarouselItem key={book.id} className="pl-4 sm:basis-1/2 xl:basis-1/3">
                  <motion.button
                    type="button"
                    whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                    className="w-full text-left"
                    onClick={() => onNavigate(book.route)}
                  >
                    <Card className="group relative h-full overflow-hidden border border-yellow-200/20 bg-black/70 transition-colors duration-300 hover:border-yellow-200/60">
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-yellow-200/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      <CardHeader className="relative flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="rounded-full border border-yellow-200/40 bg-yellow-200/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.3em] text-yellow-100/80">
                            {book.id}
                          </span>
                          <BookOpen className="h-5 w-5 text-yellow-200/70" />
                        </div>
                        <CardTitle className="font-serif text-xl text-yellow-50">
                          {book.title}
                        </CardTitle>
                        <CardDescription className="text-sm text-yellow-100/70">
                          {book.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="relative space-y-4">
                        {book.highlight && (
                          <div className="rounded-2xl border border-yellow-200/20 bg-yellow-200/5 p-4 text-sm leading-relaxed text-yellow-100/80">
                            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-yellow-200/70">
                              <Sparkles className="h-3.5 w-3.5" />
                              Highlight
                            </div>
                            <p>{book.highlight}</p>
                          </div>
                        )}
                        {book.livePreview && (
                          <div className="rounded-2xl border border-yellow-200/10 bg-black/40 p-4">
                            {book.livePreview}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.button>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="mt-4 flex items-center justify-end gap-2">
              <CarouselPrevious className="border-yellow-200/40 text-yellow-100 hover:border-yellow-200/60 hover:text-yellow-50" />
              <CarouselNext className="border-yellow-200/40 text-yellow-100 hover:border-yellow-200/60 hover:text-yellow-50" />
            </div>
          </Carousel>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

