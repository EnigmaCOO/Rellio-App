import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";
import type { Religion } from "@shared/schema";

interface NavigationPanelProps {
  selectedReligion: Religion;
  selectedBook: string;
  selectedChapter: number;
  religions?: any[];
  books?: string[];
  onReligionChange: (religion: Religion) => void;
  onBookChange: (book: string) => void;
  onChapterChange: (chapter: number) => void;
  isLoading: boolean;
}

export function NavigationPanel({
  selectedReligion,
  selectedBook,
  selectedChapter,
  religions,
  books,
  onReligionChange,
  onBookChange,
  onChapterChange,
  isLoading,
}: NavigationPanelProps) {
  const { data: recentReadings } = useQuery({
    queryKey: ['/api/readings', 1], // Using user ID 1 as default
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
    if (diffInHours < 48) return 'Yesterday';
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  if (isLoading) {
    return (
      <div className="w-1/4 bg-white shadow-md border-r border-scripture-200 p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-1/4 bg-white shadow-md border-r border-scripture-200 overflow-y-auto">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-scripture-800 mb-4">Scripture Navigation</h2>
        
        {/* Religion Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-scripture-700 mb-2">Religious Text</label>
          <Select
            value={selectedReligion}
            onValueChange={onReligionChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a religion" />
            </SelectTrigger>
            <SelectContent>
              {religions?.map((religion) => (
                <SelectItem key={religion.id} value={religion.id}>
                  {religion.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Book Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-scripture-700 mb-2">Book</label>
          <ScrollArea className="h-60">
            <div className="space-y-2">
              {books?.map((book) => {
                // Handle both string and object formats
                const bookName = typeof book === 'string' ? book : book.name || book;
                return (
                  <Button
                    key={bookName}
                    variant={selectedBook === bookName ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => onBookChange(bookName)}
                  >
                    {bookName}
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Chapter Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-scripture-700 mb-2">Chapter</label>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((chapter) => (
              <Button
                key={chapter}
                variant={selectedChapter === chapter ? "default" : "outline"}
                size="sm"
                onClick={() => onChapterChange(chapter)}
              >
                {chapter}
              </Button>
            ))}
          </div>
        </div>

        {/* Recent Readings */}
        <div className="border-t border-scripture-200 pt-4">
          <h3 className="text-sm font-medium text-scripture-700 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Readings
          </h3>
          <div className="space-y-2">
            {recentReadings?.length > 0 ? (
              recentReadings.slice(0, 5).map((reading: any) => (
                <div key={reading.id} className="p-2 bg-scripture-50 rounded-lg text-sm">
                  <div className="font-medium text-scripture-700">
                    {reading.book} {reading.chapter}
                  </div>
                  <div className="text-xs text-scripture-500">
                    {formatTimeAgo(reading.timestamp)}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-2 bg-scripture-50 rounded-lg text-sm text-scripture-600">
                No recent readings
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
