import { useState, useEffect } from "react";
import { NavigationPanel } from "@/components/NavigationPanel";
import { ContentPanel } from "@/components/ContentPanel";
import { ChatPanel } from "@/components/ChatPanel";
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
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
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
      console.log("Copy event, chat state:", { manualCopy: true, isChatVisible: chatVisible });
      setIsCopyOperation(true);
      setTimeout(() => {
        setIsCopyOperation(false);
      }, 1000);
    };

    document.addEventListener('copy', handleCopyEvent);
    return () => {
      document.removeEventListener('copy', handleCopyEvent);
    };
  }, [chatVisible]);

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

  // Panel toggle functions
  const toggleNavigation = () => {
    setNavigationVisible(!navigationVisible);
  };

  const toggleChat = () => {
    const newChatVisible = !chatVisible;
    console.log("Chat panel action:", { action: newChatVisible ? 'open' : 'close', showChat: newChatVisible });
    setChatVisible(newChatVisible);
  };

  // Swipe handlers for navigation panel
  const navigationSwipeHandlers = useSwipeable({
    onSwipedLeft: () => setNavigationVisible(false),
    onSwipedRight: () => setNavigationVisible(true),
    trackMouse: true,
    preventScrollOnSwipe: true,
  });

  // Swipe handlers for chat panel
  const chatSwipeHandlers = useSwipeable({
    onSwipedLeft: () => setChatVisible(true),
    onSwipedRight: () => {
      // Don't close chat panel during copy operations or text selection
      if (!isCopyOperation && !window.getSelection()?.toString()) {
        setChatVisible(false);
      }
    },
    trackMouse: true,
    preventScrollOnSwipe: true,
  });

  // Double-click handler for maximizing/restoring panel
  const handleHeaderDoubleClick = () => {
    setIsMaximized(!isMaximized);
    console.log("Panel maximized:", !isMaximized);
  };



  // Swipe handlers for content panel to show hidden panels
  const contentSwipeHandlers = useSwipeable({
    onSwipedRight: () => {
      if (!navigationVisible) setNavigationVisible(true);
    },
    onSwipedLeft: () => {
      if (!chatVisible) setChatVisible(true);
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
    if (!navigationVisible && !chatVisible) return 'w-full';
    if (!navigationVisible || !chatVisible) return 'lg:w-2/3';
    return 'lg:w-1/3';
  };

  // Handle copy verse functionality
  const handleCopyVerse = (verseText: string) => {
    console.log("Copy event, chat state:", { isChatVisible: chatVisible });
    
    // Set copy operation flag to prevent swipe handlers from closing the chat
    setIsCopyOperation(true);
    
    const explanationMessage = `Explain the following verse ${verseText}`;
    setExternalMessage(explanationMessage);
    
    // Ensure chat panel is visible
    if (!chatVisible) {
      setChatVisible(true);
    }
    
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
              </div>
              <img src={rellioLogo} alt="Rellio Logo" className="h-10 w-10 lg:h-15 lg:w-15" />
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

      <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] relative overflow-hidden">
        {/* Navigation Panel - Swipeable and Collapsible */}
        <div
          {...navigationSwipeHandlers}
          className={`${
            navigationVisible ? 'w-full lg:w-1/4' : 'w-0'
          } transition-all duration-300 ease-in-out overflow-hidden relative`}
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
              <div className="absolute top-1/2 right-2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                <ChevronLeft className="h-4 w-4" />
              </div>
            </>
          )}
          {!navigationVisible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleNavigation}
              className="absolute top-4 left-2 z-10 bg-white shadow-md hover:bg-gray-50"
              title="Show Navigation"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Content Panel - Expandable */}
        <div
          {...contentSwipeHandlers}
          className={`${getContentWidth()} transition-all duration-300 ease-in-out flex-1 relative overflow-hidden`}
        >
          <ContentPanel
            selectedReligion={selectedReligion}
            selectedBook={selectedBook}
            selectedChapter={selectedChapter}
            scriptures={scriptures}
            isLoading={scripturesLoading}
            isError={!!scripturesError}
            religionName={currentReligionData?.name || selectedReligion || 'Scripture'}
            onChapterChange={handleChapterChange}
            isFullscreen={!navigationVisible}
            panelsVisible={{ navigation: navigationVisible, chat: chatVisible }}
            onCopyVerse={handleCopyVerse}
            onReligionChange={handleReligionChange}
          />
          
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
              title="Show AI Guide Panel"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
          
          {/* Swipe hints when navigation panel hidden */}
          {!navigationVisible && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg text-sm pointer-events-none">
              Swipe right or use button to show navigation panel
            </div>
          )}
        </div>
        
        {/* Maximize Overlay */}
        {isMaximized && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300" />
        )}

        {/* Static Chat Panel - Swipeable and Collapsible */}
        <div
          {...chatSwipeHandlers}
          className={`${
            chatVisible ? (isMaximized ? 'fixed inset-4 z-50' : 'w-full lg:w-1/3') : 'w-0'
          } transition-all duration-300 ease-in-out overflow-hidden relative`}
        >
          {chatVisible && (
            <>
              <div className={`bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col transition-all duration-300 h-full`}>
                {/* Header */}
                <div 
                  className="bg-white text-gray-800 p-3 rounded-t-lg flex items-center justify-between flex-shrink-0 border-b border-gray-200"
                  onDoubleClick={handleHeaderDoubleClick}
                >
                  <h3 className={`font-semibold ${isMaximized ? 'text-lg' : 'text-sm'}`}>
                    AI Scripture Guide
                  </h3>
                  <div className="flex items-center space-x-2">
                    {isMaximized && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleHeaderDoubleClick}
                        className="text-gray-600 hover:bg-gray-100 p-1"
                        title="Restore"
                      >
                        Restore
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleChat}
                      className="text-gray-600 hover:bg-gray-100 p-1"
                      title="Close AI Guide"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Chat Panel Content */}
                <div className={`flex-1 overflow-hidden ${isMaximized ? 'text-lg p-4' : ''}`}>
                  <ChatPanel
                    sessionId={chatSessionId}
                    context={currentContext}
                    externalMessage={externalMessage}
                    onExternalMessageProcessed={handleExternalMessageProcessed}
                    onCopyOperation={handleCopyOperation}
                  />
                </div>
              </div>
              
              {/* Swipe indicator for chat panel */}
              <div className="absolute top-1/2 left-2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                <ChevronRight className="h-4 w-4" />
              </div>
            </>
          )}
          {!chatVisible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleChat}
              className="absolute top-4 right-2 z-10 bg-white shadow-md hover:bg-gray-50"
              title="Show AI Guide"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
