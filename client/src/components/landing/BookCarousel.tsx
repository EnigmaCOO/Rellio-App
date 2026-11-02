import { useMemo, useState } from "react";
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
                "group flex min-w-[9rem] flex-1 flex-col items-start justify-center rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 sm:min-w-[10rem]",
                isActive
                  ? "border-gray-400 bg-gray-100 text-gray-900 shadow-sm"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              <span className="text-xs font-semibold tracking-[0.22em] text-gray-700">
                {library.name}
              </span>
              <span className="mt-2 text-[11px] leading-relaxed text-gray-500">
                {library.tagline}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative rounded-3xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-500">
              Sacred library
            </p>
            <h3 className="mt-1 font-serif text-2xl text-gray-900 sm:text-3xl">
              {activeLibrary.name}
            </h3>
          </div>
          {hasVoicePrompt && (
            <Button
              type="button"
              variant="outline"
              className="border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
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
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => onNavigate(book.route)}
                >
                  <Card className="group relative h-full overflow-hidden border border-gray-200 bg-white transition-colors duration-300 hover:border-gray-400">
                    <CardHeader className="relative flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.3em] text-gray-600">
                          {book.id}
                        </span>
                        <BookOpen className="h-5 w-5 text-gray-400" />
                      </div>
                      <CardTitle className="font-serif text-xl text-gray-900">
                        {book.title}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-500">
                        {book.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="relative space-y-4">
                      {book.highlight && (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-700">
                          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-500">
                            <Sparkles className="h-3.5 w-3.5" />
                            Highlight
                          </div>
                          <p>{book.highlight}</p>
                        </div>
                      )}
                      {book.livePreview && (
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                          {book.livePreview}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="mt-4 flex items-center justify-end gap-2">
            <CarouselPrevious className="border-gray-200 text-gray-700 hover:border-gray-400 hover:text-gray-900" />
            <CarouselNext className="border-gray-200 text-gray-700 hover:border-gray-400 hover:text-gray-900" />
          </div>
        </Carousel>
      </div>
    </div>
  );
}
