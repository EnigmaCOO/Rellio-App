import { useState, useEffect } from "react";
import { NavigationPanel } from "@/components/NavigationPanel";
import { ContentPanel } from "@/components/ContentPanel";
import { ChatPanel } from "@/components/ChatPanel";
import { useQuery } from "@tanstack/react-query";
import { Search, Settings, BookOpen } from "lucide-react";
import rellioLogo from "@assets/image_1751817332000.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Religion, Scripture } from "@shared/schema";

export default function Dashboard() {
  const [selectedReligion, setSelectedReligion] = useState<Religion | null>(null);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [chatSessionId] = useState<string>(() => `session_${Date.now()}`);
  const { toast } = useToast();

  const { data: religions, isLoading: religionsLoading } = useQuery<Array<{id: Religion, name: string, books: string[]}>>({
    queryKey: ['/api/religions'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: books, isLoading: booksLoading } = useQuery({
    queryKey: ['/api/religions', selectedReligion, 'books'],
    enabled: !!selectedReligion,
  });

  const { data: bookInfo } = useQuery<{name: string, chapters: number, religion: Religion}>({
    queryKey: [`/api/religions/${selectedReligion}/books/${selectedBook}`],
    enabled: !!selectedReligion && !!selectedBook,
  });

  const { data: scriptures, isLoading: scripturesLoading, error: scripturesError } = useQuery<Scripture[]>({
    queryKey: [`/api/scriptures?religion=${selectedReligion}&book=${selectedBook}&chapter=${selectedReligion === 'quran' ? 1 : selectedChapter}`],
    enabled: !!selectedReligion && !!selectedBook && !!selectedChapter,
  });

  // Get books for current religion from the religions data
  const currentReligionBooks = religions?.find(r => r.id === selectedReligion)?.books || [];

  // Filter books based on search term
  const filteredBooks = currentReligionBooks.filter(book => 
    book.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Update selected book when religion changes
  useEffect(() => {
    if (currentReligionBooks && currentReligionBooks.length > 0 && !currentReligionBooks.includes(selectedBook)) {
      setSelectedBook(currentReligionBooks[0]);
    }
  }, [currentReligionBooks, selectedBook]);

  // Reset chapter when book changes
  useEffect(() => {
    setSelectedChapter(1);
  }, [selectedBook]);

  // Show error toast if scripture loading fails
  useEffect(() => {
    if (scripturesError) {
      toast({
        title: "Error loading scriptures",
        description: "Failed to load scripture content. Please try again.",
        variant: "destructive",
      });
    }
  }, [scripturesError, toast]);

  const handleReligionChange = (religion: Religion) => {
    setSelectedReligion(religion);
    setSelectedChapter(1);
    // Reset book selection to let the effect handle it
    setSelectedBook('');
  };

  const handleBookChange = (book: string) => {
    setSelectedBook(book);
    setSelectedChapter(1);
  };

  const handleChapterChange = (chapter: number) => {
    setSelectedChapter(chapter);
  };

  const currentReligionData = religions?.find(r => r.id === selectedReligion);
  const currentContext = {
    religion: selectedReligion,
    book: selectedBook,
    chapter: selectedChapter,
  };

  return (
    <div className="min-h-screen bg-scripture-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-scripture-200">
        <div className="max-w-full px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 lg:space-x-3">
              <img src={rellioLogo} alt="Rellio Logo" className="h-6 w-6 lg:h-8 lg:w-8" />
              <h1 className="text-lg lg:text-2xl font-bold text-scripture-800">Rellio Scripture Library</h1>
            </div>
            <div className="flex items-center space-x-2 lg:space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-scripture-400" />
                <Input
                  type="text"
                  placeholder="Search scriptures..."
                  className="pl-10 pr-4 py-2 w-48 lg:w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] gap-1">
        {/* Enhanced responsive layout with animations */}
        <div className="w-full lg:w-1/4 transition-all duration-300 ease-in-out">
          <NavigationPanel
            selectedReligion={selectedReligion}
            selectedBook={selectedBook}
            selectedChapter={selectedChapter}
            religions={religions}
            books={filteredBooks}
            maxChapters={bookInfo?.chapters || 10}
            onReligionChange={handleReligionChange}
            onBookChange={handleBookChange}
            onChapterChange={handleChapterChange}
            isLoading={religionsLoading}
            searchTerm={searchTerm}
          />
        </div>
        
        <div className="w-full lg:w-2/4 transition-all duration-300 ease-in-out">
          <ContentPanel
            selectedReligion={selectedReligion}
            selectedBook={selectedBook}
            selectedChapter={selectedChapter}
            scriptures={scriptures}
            isLoading={scripturesLoading}
            isError={!!scripturesError}
            religionName={currentReligionData?.name || selectedReligion || 'Scripture'}
            onChapterChange={handleChapterChange}
          />
        </div>
        
        <div className="w-full lg:w-1/4 transition-all duration-300 ease-in-out">
          <ChatPanel
            sessionId={chatSessionId}
            context={currentContext}
          />
        </div>
      </div>
    </div>
  );
}
