import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { Religion } from "@shared/schema";
import { useState } from "react";

import christianSymbol from "@assets/image_1752101829300.png";
import islamSymbol    from "@assets/image_1752101791050.png";
import judaismSymbol  from "@assets/image_1752101819674.png";
import hinduSymbol    from "@assets/image_1752101837542.png";
import buddhismSymbol from "@assets/image_1752101903156.png";

interface NavigationPanelProps {
  selectedReligion: Religion | null;
  selectedBook: string;
  selectedChapter: number;
  religions?: Array<{id: Religion; name: string; books: string[]; sections?: Record<string, string[]>}>;
  books?: string[];
  maxChapters?: number;
  onReligionChange: (religion: Religion) => void;
  onBookChange: (book: string) => void;
  onChapterChange: (chapter: number) => void;
  isLoading: boolean;
  searchTerm?: string;
}

export function NavigationPanel({
  selectedReligion, selectedBook, selectedChapter,
  religions, books, maxChapters = 10,
  onReligionChange, onBookChange, onChapterChange,
  isLoading,
}: NavigationPanelProps) {

  const [uploadedSymbols] = useState({
    christianity: christianSymbol,
    islam:        islamSymbol,
    judaism:      judaismSymbol,
    buddhism:     buddhismSymbol,
    hinduism:     hinduSymbol,
  });

  if (isLoading) {
    return (
      <div className="w-full h-full p-6 bg-white">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white border-r border-gray-200">
      <div className="p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">Scripture Navigation</h2>
        </div>

        {/* Religious Symbols Selector */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-widest mb-3 text-gray-500">Religious Text</label>

          <div className="flex items-center justify-center space-x-4 p-3 rounded-xl border border-gray-200 bg-gray-50">
            {([
              { key: "christianity", src: uploadedSymbols.christianity, title: "Holy Bible" },
              { key: "islam",        src: uploadedSymbols.islam,        title: "Quran" },
              { key: "judaism",      src: uploadedSymbols.judaism,      title: "Torah" },
              { key: "buddhism",     src: uploadedSymbols.buddhism,     title: "Tripitaka" },
              { key: "hinduism",     src: uploadedSymbols.hinduism,     title: "Bhagavad Gita" },
            ] as const).map(({ key, src, title }) => (
              <img
                key={key}
                src={src || undefined}
                alt={title}
                className={`w-10 h-10 cursor-pointer transition-all duration-200 rounded object-cover ${
                  selectedReligion === key ? "ring-2 ring-black" : "opacity-60 hover:opacity-100"
                }`}
                onClick={() => onReligionChange(key as Religion)}
                title={title}
              />
            ))}
          </div>

          <div className="mt-3">
            <Select value={selectedReligion || ''} onValueChange={onReligionChange}>
              <SelectTrigger className="w-full h-11 bg-white border-gray-200 text-black">
                <SelectValue placeholder="Or select from dropdown…" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                {religions?.map((religion) => (
                  <SelectItem key={religion.id} value={religion.id} className="cursor-pointer py-2.5 px-3 font-medium text-black">
                    {religion.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Book Selector */}
        {selectedReligion && (
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-widest mb-3 text-gray-500">Book</label>
            <Select value={selectedBook || ''} onValueChange={onBookChange}>
              <SelectTrigger className="w-full h-11 bg-white border-gray-200 text-black">
                <SelectValue placeholder="Select a book…" />
              </SelectTrigger>
              <SelectContent className="max-h-80 bg-white border-gray-200">
                {(() => {
                  const currentReligion = religions?.find(r => r.id === selectedReligion);
                  if (selectedReligion === 'islam' && currentReligion?.sections) {
                    return Object.entries(currentReligion.sections).map(([sectionName, sectionBooks]) => (
                      <div key={sectionName}>
                        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b border-gray-100 bg-gray-50 text-gray-500">
                          {sectionName}
                        </div>
                        {sectionBooks.map((bookName) => (
                          <SelectItem key={bookName} value={bookName} className="cursor-pointer py-2.5 pl-6 pr-3 font-medium text-black">
                            {bookName}
                          </SelectItem>
                        ))}
                      </div>
                    ));
                  }
                  return books?.map((book, index) => {
                    const bookName = typeof book === 'string' ? book : (book as any)?.name || book;
                    return (
                      <SelectItem key={`${bookName}-${index}`} value={bookName} className="cursor-pointer py-2.5 px-3 font-medium text-black">
                        {bookName}
                      </SelectItem>
                    );
                  });
                })()}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Chapter Selector */}
        {selectedReligion && selectedBook && (
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-widest mb-3 text-gray-500">Chapter</label>
            <Select value={String(selectedChapter)} onValueChange={(v) => onChapterChange(Number(v))}>
              <SelectTrigger className="w-full h-11 bg-white border-gray-200 text-black">
                <SelectValue placeholder="Select a chapter…" />
              </SelectTrigger>
              <SelectContent className="max-h-72 bg-white border-gray-200">
                {Array.from({ length: maxChapters }, (_, i) => i + 1).map((ch) => (
                  <SelectItem key={ch} value={String(ch)} className="cursor-pointer py-2.5 px-3 font-medium text-black">
                    Chapter {ch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
