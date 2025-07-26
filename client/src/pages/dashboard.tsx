import { useState, useEffect } from "react";
import { NavigationPanel } from "@/components/NavigationPanel";
import { VerseSpotlight } from "@/components/VerseSpotlight";
import { VerseList } from "@/components/IlluminVerse/VerseList";
import { RightColumnChat } from "@/components/RightColumnChat";
import { useQuery } from "@tanstack/react-query";
import { Search, Settings, BookOpen, Menu, X, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import rellioLogo from "@assets/image_1751817332000.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useSwipeable } from "react-swipeable";
import type { Religion, Scripture } from "@shared/schema";

export default function Dashboard() {
  const [selectedReligion, setSelectedReligion] = useState<Religion | null>(null);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [chatSessionId] = useState<string>(() => `session_${Date.now()}`);
  const [navigationVisible, setNavigationVisible] = useState<boolean>(true);
  const [chatVisible, setChatVisible] = useState<boolean>(true);
  const [externalMessage, setExternalMessage] = useState<string>('');
  const [isCopyOperation, setIsCopyOperation] = useState<boolean>(false);
  const [highlightedVerse, setHighlightedVerse] = useState<number | undefined>(undefined);
  const { toast } = useToast();

  // Debug panel visibility state
  useEffect(() => {
    console.log("Panel state:", { navigationVisible, chatVisible });
  }, [navigationVisible, chatVisible]);

  // Check for top left bubble and log confirmation
  useEffect(() => {
    console.log("Top left bubble removed or not found");
  }, []);

  // Add copy event listeners to detect manual copying
  useEffect(() => {
    const handleCopyEvent = () => {
      console.log("Copy event, chat state:", { manualCopy: true });
      setIsCopyOperation(true);
      setTimeout(() => {
        setIsCopyOperation(false);
      }, 1000);
    };

    document.addEventListener('copy', handleCopyEvent);
    return () => {
      document.removeEventListener('copy', handleCopyEvent);
    };
  }, []);

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
    queryKey: [`/api/scriptures?religion=${selectedReligion}&book=${selectedBook}&chapter=${selectedChapter}`],
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

  // Panel toggle functions
  const toggleNavigation = () => {
    setNavigationVisible(!navigationVisible);
  };

  const toggleChat = () => {
    setChatVisible(!chatVisible);
  };



  // Swipe handlers for navigation panel
  const navigationSwipeHandlers = useSwipeable({
    onSwipedLeft: () => setNavigationVisible(false),
    onSwipedRight: () => setNavigationVisible(true),
    trackMouse: true,
    preventScrollOnSwipe: true,
  });

  // Swipe handlers for content panel to show hidden panels
  const contentSwipeHandlers = useSwipeable({
    onSwipedRight: () => {
      if (!navigationVisible) setNavigationVisible(true);
    },
    trackMouse: true,
    preventScrollOnSwipe: true,
  });

  const currentReligionData = religions?.find(r => r.id === selectedReligion);
  const currentContext = {
    religion: selectedReligion,
    book: selectedBook,
    chapter: selectedChapter,
  };

  // Calculate content panel width based on visible panels
  const getContentWidth = () => {
    // Mobile: full width (columns stack vertically)
    // Desktop: responsive based on visible panels
    if (!navigationVisible && !chatVisible) return 'w-full';
    if (!navigationVisible && chatVisible) return 'lg:w-3/4';
    if (navigationVisible && !chatVisible) return 'lg:w-3/4';
    return 'lg:w-1/2'; // Both panels visible
  };

  // Calculate chat panel classes for responsive layout
  const getChatClasses = () => {
    return chatVisible 
      ? 'w-full lg:w-1/4 order-3' 
      : 'w-0 order-3';
  };

  // Calculate navigation panel classes for responsive layout
  const getNavigationClasses = () => {
    return navigationVisible 
      ? 'w-full lg:w-1/4 order-1' 
      : 'w-0 order-1';
  };

  // Handle copy verse functionality
  const handleCopyVerse = (verseText: string) => {
    console.log("Copy event:", { verseText });
    
    // Set copy operation flag
    setIsCopyOperation(true);
    
    const explanationMessage = `Explain the following verse ${verseText}`;
    setExternalMessage(explanationMessage);
    
    // Reset copy operation flag after a short delay
    setTimeout(() => {
      setIsCopyOperation(false);
    }, 1000);
  };

  // Handle external message processed
  const handleExternalMessageProcessed = () => {
    setExternalMessage('');
  };

  // Handle copy operation from chat panel
  const handleCopyOperation = (isActive: boolean) => {
    setIsCopyOperation(isActive);
  };

  // Handle navigation to verse from chat panel
  const handleNavigateToVerse = (religion: Religion, book: string, chapter: number, verse?: number) => {
    console.log("Dashboard handleNavigateToVerse called:", { religion, book, chapter, verse });
    
    // Update navigation state
    setSelectedReligion(religion);
    
    // For Quran, we need to map the book name to match the available books
    if (religion === 'quran') {
      const currentBooks = religions?.find(r => r.id === 'quran')?.books || [];
      
      // Try to find an exact match first
      let matchingBook = currentBooks.find(b => b === book);
      
      // If no exact match, try fuzzy matching
      if (!matchingBook) {
        matchingBook = currentBooks.find(b => 
          b.toLowerCase().includes(book.toLowerCase()) || 
          book.toLowerCase().includes(b.toLowerCase()) ||
          b.toLowerCase().replace(/[^a-z]/g, '') === book.toLowerCase().replace(/[^a-z]/g, '')
        );
      }
      
      // If still no match, try matching without prefixes (Al-, An-, etc.)
      if (!matchingBook) {
        const bookWithoutPrefix = book.replace(/^(Al-|An-|As-|At-|Ar-|Az-)/, '');
        matchingBook = currentBooks.find(b => 
          b.toLowerCase().includes(bookWithoutPrefix.toLowerCase()) ||
          b.toLowerCase().replace(/^(al-|an-|as-|at-|ar-|az-)/, '').includes(bookWithoutPrefix.toLowerCase())
        );
      }
      
      console.log("Quran book mapping:", { originalBook: book, matchingBook, availableBooks: currentBooks });
      setSelectedBook(matchingBook || currentBooks[0] || book);
    } else {
      setSelectedBook(book);
    }
    
    setSelectedChapter(chapter); // Always use the actual chapter number provided
    
    console.log("Setting chapter to:", chapter);
    
    // Ensure navigation panel is visible
    if (!navigationVisible) {
      console.log("Making navigation panel visible");
      setNavigationVisible(true);
    }
    
    // Set highlighted verse for the ContentPanel
    if (verse) {
      console.log("Setting up verse highlighting for verse:", verse);
      // Wait for navigation to complete, then highlight verse
      setTimeout(() => {
        console.log("Setting highlighted verse:", verse);
        setHighlightedVerse(verse);
        
        // Clear the highlighted verse after a delay
        setTimeout(() => {
          console.log("Clearing highlighted verse");
          setHighlightedVerse(undefined);
        }, 4000);
      }, 2000); // Longer delay to ensure content loads first
    } else {
      console.log("No verse provided for highlighting");
    }
  };

  return (
    <div className="min-h-screen bg-scripture-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-scripture-200">
        <div className="max-w-full px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 lg:space-x-3">
              {/* Panel Toggle Buttons */}
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleNavigation}
                  className={`transition-colors ${
                    navigationVisible 
                      ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title={navigationVisible ? 'Hide Navigation' : 'Show Navigation'}
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleChat}
                  className={`transition-colors ${
                    chatVisible 
                      ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title={chatVisible ? 'Hide Chat' : 'Show Chat'}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
              <img src={rellioLogo} alt="Rellio Logo" className="h-10 w-10 lg:h-15 lg:w-15" />
            </div>
            <div className="flex items-center space-x-2 lg:space-x-4">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Three-Column Responsive Layout */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] relative overflow-hidden">
        
        {/* Left Column - Navigation Panel */}
        <div
          {...navigationSwipeHandlers}
          className={`${getNavigationClasses()} transition-all duration-300 ease-in-out overflow-hidden relative border-r border-gray-200`}
        >
          {navigationVisible && (
            <>
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
              {/* Swipe indicator for navigation panel */}
              <div className="absolute top-1/2 right-2 transform -translate-y-1/2 text-gray-400 pointer-events-none lg:hidden">
                <ChevronLeft className="h-4 w-4" />
              </div>
            </>
          )}
        </div>
        
        {/* Center Column - Verse Content */}
        <div
          {...contentSwipeHandlers}
          className={`${getContentWidth()} transition-all duration-300 ease-in-out relative overflow-hidden order-2`}
        >
          {selectedReligion ? (
            <div className="h-full bg-gray-50 flex flex-col p-4">
              {/* Verse List - Full height without chat */}
              <VerseList
                selectedReligion={selectedReligion}
                selectedBook={selectedBook}
                selectedChapter={selectedChapter}
                scriptures={scriptures}
                isLoading={scripturesLoading}
                isError={!!scripturesError}
                religionName={currentReligionData?.name || selectedReligion || 'Scripture'}
                onChapterChange={handleChapterChange}
                onCopyVerse={handleCopyVerse}
                highlightedVerse={highlightedVerse}
                maxChapters={bookInfo?.chapters || 10}
              />
            </div>
          ) : (
            <div className="h-full bg-gray-50 p-4 space-y-4 overflow-y-auto">
              {/* Verse Spotlight */}
              <div className="flex items-center justify-center h-full">
                <VerseSpotlight onNavigateToVerse={handleNavigateToVerse} />
              </div>
            </div>
          )}
          
          {/* Hidden panel indicators */}
          {!navigationVisible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleNavigation}
              className="absolute top-4 left-4 z-10 bg-white shadow-md hover:bg-gray-50 transition-opacity"
              title="Show Navigation Panel"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
          
          {!chatVisible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleChat}
              className="absolute top-4 right-4 z-10 bg-white shadow-md hover:bg-gray-50 transition-opacity"
              title="Show Chat Panel"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Right Column - Chat Panel */}
        <div
          className={`${getChatClasses()} transition-all duration-300 ease-in-out overflow-hidden relative border-l border-gray-200`}
        >
          {chatVisible && (
            <div className="h-full bg-white rounded-l-lg lg:rounded-none shadow-lg lg:shadow-none">
              {/* Chat Header with Controls */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 rounded-t-lg lg:rounded-none">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">AI Scripture Guide</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleChat}
                    className="lg:hidden"
                    title="Hide Chat"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Chat Content - Full Height */}
              <div className="h-[calc(100%-80px)]">
                <RightColumnChat
                  sessionId={chatSessionId}
                  context={currentContext}
                  externalMessage={externalMessage}
                  onExternalMessageProcessed={handleExternalMessageProcessed}
                  onCopyOperation={handleCopyOperation}
                  onNavigateToVerse={handleNavigateToVerse}
                />
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
