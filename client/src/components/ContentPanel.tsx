import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronLeft, 
  ChevronRight, 
  Bookmark, 
  Share, 
  Printer, 
  Highlighter, 
  StickyNote, 
  Quote,
  MessageCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Religion, Scripture } from "@shared/schema";

interface ContentPanelProps {
  selectedReligion: Religion | null;
  selectedBook: string;
  selectedChapter: number;
  scriptures?: Scripture[];
  isLoading: boolean;
  isError?: boolean;
  religionName: string;
  onChapterChange: (chapter: number) => void;
}

export function ContentPanel({
  selectedReligion,
  selectedBook,
  selectedChapter,
  scriptures,
  isLoading,
  isError = false,
  religionName,
  onChapterChange,
}: ContentPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const recordReadingMutation = useMutation({
    mutationFn: async (reading: { userId: number; religion: Religion; book: string; chapter: number }) => {
      await apiRequest("POST", "/api/readings", reading);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/readings'] });
    },
  });

  const handleChapterNavigation = (direction: 'prev' | 'next') => {
    const newChapter = direction === 'prev' ? selectedChapter - 1 : selectedChapter + 1;
    if (newChapter > 0) {
      onChapterChange(newChapter);
      
      // Record the reading (only if religion is selected)
      if (selectedReligion) {
        recordReadingMutation.mutate({
          userId: 1, // Default user ID
          religion: selectedReligion as Religion,
          book: selectedBook,
          chapter: newChapter,
        });
      }
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}?religion=${selectedReligion}&book=${selectedBook}&chapter=${selectedChapter}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied!",
      description: "Scripture link has been copied to your clipboard.",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleStudyTool = (tool: string) => {
    toast({
      title: `${tool} selected`,
      description: `${tool} functionality would be implemented here.`,
    });
  };

  // Show welcome message when no religion is selected
  if (!selectedReligion) {
    return (
      <div className="flex-1 bg-white shadow-md mx-2 p-6">
        <div className="space-y-6 flex flex-col items-center justify-center min-h-[500px]">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-scripture-800">Welcome to the Scripture Dashboard!</h2>
            <p className="text-lg text-scripture-600 max-w-md mx-auto leading-relaxed">
              Please select a religious text and book from the navigation panel to begin exploring sacred writings.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">Bible</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">Quran</span>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">Torah</span>
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">Bhagavad Gita</span>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">Tripitaka</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 bg-white shadow-md mx-2 p-6">
        <div className="space-y-4 flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scripture-600"></div>
          <div className="text-scripture-600 text-lg font-medium">Loading scripture content...</div>
          <div className="text-scripture-500 text-sm">Fetching {religionName} - {selectedBook} Chapter {selectedChapter}</div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 bg-white shadow-md mx-2 p-6">
        <div className="space-y-4 flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-red-600 text-lg font-medium">Error loading scripture content</div>
          <div className="text-scripture-500 text-sm">Failed to fetch {religionName} - {selectedBook} Chapter {selectedChapter}</div>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white shadow-md mx-2 overflow-y-auto">
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-scripture-800">
              {religionName} - {selectedBook}
              <span className="text-scripture-500 ml-2">Chapter {selectedChapter}</span>
            </h2>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={() => handleStudyTool("Bookmark")}>
                <Bookmark className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Chapter Navigation */}
          <div className="flex items-center space-x-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChapterNavigation('prev')}
              disabled={selectedChapter <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-scripture-600">Chapter {selectedChapter}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChapterNavigation('next')}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Scripture Content */}
        <div className="bg-scripture-50 rounded-lg p-6 mb-6">
          <div className="space-y-4">
            {scriptures && scriptures.length > 0 ? (
              scriptures.map((scripture, index) => (
                <div
                  key={scripture.id || `${scripture.religion}-${scripture.book}-${scripture.chapter}-${scripture.verse || index}`}
                  className="flex items-start space-x-4 hover:bg-white rounded-lg p-3 transition-colors cursor-pointer group"
                >
                  <span className="text-blue-600 font-bold text-sm mt-1 min-w-[2rem]">
                    {scripture.verse}
                  </span>
                  <p className="text-scripture-800 leading-relaxed text-lg group-hover:text-scripture-900">
                    {scripture.text}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleStudyTool("Comment")}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-scripture-600">
                No scripture content available for this selection.
              </div>
            )}
          </div>
        </div>

        {/* Study Tools */}
        <div className="border-t border-scripture-200 pt-6">
          <h3 className="text-lg font-semibold text-scripture-800 mb-4">Study Tools</h3>
          <div className="grid grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="p-4 h-auto flex-col bg-blue-50 hover:bg-blue-100 border-blue-200"
              onClick={() => handleStudyTool("Highlight")}
            >
              <Highlighter className="h-6 w-6 text-blue-600 mb-2" />
              <span className="text-sm font-medium">Highlight</span>
            </Button>
            <Button
              variant="outline"
              className="p-4 h-auto flex-col bg-green-50 hover:bg-green-100 border-green-200"
              onClick={() => handleStudyTool("Add Note")}
            >
              <StickyNote className="h-6 w-6 text-green-600 mb-2" />
              <span className="text-sm font-medium">Add Note</span>
            </Button>
            <Button
              variant="outline"
              className="p-4 h-auto flex-col bg-amber-50 hover:bg-amber-100 border-amber-200"
              onClick={() => handleStudyTool("Quote")}
            >
              <Quote className="h-6 w-6 text-amber-600 mb-2" />
              <span className="text-sm font-medium">Quote</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
