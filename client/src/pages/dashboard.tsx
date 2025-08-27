import { useState, useEffect } from "react";
import { NavigationPanel } from "@/components/NavigationPanel";
import { VerseSpotlight } from "@/components/VerseSpotlight";
import { VerseList } from "@/components/IlluminVerse/VerseList";
import { VoiceFirstChatInterface } from "@/components/chat/VoiceFirstChatInterface";
import { ProgressDashboard } from "@/components/progress/ProgressDashboard";
import { type ScholarPersona, getPersonaForReligion } from "@/components/chat/ScholarPersonas";
import { useQuery } from "@tanstack/react-query";
import { Search, Settings, BookOpen, Menu, X, ChevronLeft, ChevronRight, MessageCircle, TrendingUp, User, LogOut } from "lucide-react";
import rellioLogo from "@assets/image_1756158906598.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSwipeable } from "react-swipeable";
import { useReadingSession } from "@/hooks/useReadingSession";
import { cn } from "@/lib/utils";
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
  
  // Reading session tracking
  const readingSession = useReadingSession();
  const [selectedPersona, setSelectedPersona] = useState<ScholarPersona | null>(null);
  const [currentView, setCurrentView] = useState<'scripture' | 'progress'>('scripture');
  const { toast } = useToast();
  const { user, isGuest } = useAuth();

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

  const { data: religions, isLoading: religionsLoading } = useQuery<Array<{id: Religion, name: string, books: string[], sections?: Record<string, string[]>}>>({
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

  // Enhanced auto-select persona with book context
  useEffect(() => {
    const persona = getPersonaForReligion(selectedReligion, selectedBook);
    
    // Only update if persona actually changed
    if (!selectedPersona || selectedPersona.id !== persona.id) {
      setSelectedPersona(persona);
      
      if (selectedReligion && selectedBook) {
        console.log(`🎭 Inside books - Persona activated: ${persona.name} for ${selectedReligion} - ${selectedBook}`);
        toast({
          title: `${persona.name} Activated`,
          description: `Your ${persona.title} is now guiding your ${selectedBook} study`,
          variant: "default"
        });
      } else {
        console.log(`🎭 Outside books - Universal Scholar activated`);
        if (persona.id === 'universal-scholar') {
          toast({
            title: `${persona.name} Activated`,
            description: "Your wise interfaith guide for universal spiritual insights",
            variant: "default"
          });
        }
      }
    }
  }, [selectedReligion, selectedBook, selectedPersona, toast]);

  const handleReligionChange = (religion: Religion) => {
    setSelectedReligion(religion);
    setSelectedChapter(1);
    // Reset book selection to let the effect handle it
    setSelectedBook('');
    
    // End current reading session when switching religions
    if (readingSession.isSessionActive()) {
      readingSession.endSession();
    }
  };

  const handleBookChange = (book: string) => {
    setSelectedBook(book);
    setSelectedChapter(1);
    
    // Start or restart reading session for new book
    if (selectedReligion && book) {
      readingSession.startSession(selectedReligion, book, 1);
    }
  };

  const handleChapterChange = (chapter: number) => {
    setSelectedChapter(chapter);
    
    // Update chapter in reading session and track progress
    if (readingSession.isSessionActive()) {
      readingSession.updateChapter(chapter);
    } else if (selectedReligion && selectedBook) {
      // Start session if not already active
      readingSession.startSession(selectedReligion, selectedBook, chapter);
    }
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
    // Mobile: always full width when visible, hide panels below
    // Desktop: responsive based on visible panels
    if (!navigationVisible && !chatVisible) return 'w-full';
    if (!navigationVisible && chatVisible) return 'w-full lg:w-3/4';
    if (navigationVisible && !chatVisible) return 'w-full lg:w-3/4';
    return 'w-full lg:w-1/2'; // Both panels visible
  };

  // Calculate chat panel classes for responsive layout
  const getChatClasses = () => {
    return chatVisible 
      ? 'w-full lg:w-1/4 order-3 lg:relative fixed inset-0 lg:inset-auto z-50 lg:z-auto bg-white lg:bg-transparent' 
      : 'w-0 order-3 hidden lg:block';
  };

  // Calculate navigation panel classes for responsive layout
  const getNavigationClasses = () => {
    return navigationVisible 
      ? 'w-full lg:w-1/4 order-1 lg:relative fixed inset-0 lg:inset-auto z-40 lg:z-auto bg-white lg:bg-transparent' 
      : 'w-0 order-1 hidden lg:block';
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
    
    // For Islam, we need to map the book name to match the available books
    if (religion === 'islam') {
      const currentBooks = religions?.find(r => r.id === 'islam')?.books || [];
      
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-amber-200">
        <div className="max-w-full px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Header Actions - Hamburger, Chat, and Logo grouped together on left */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleNavigation}
                className={`transition-colors h-8 w-8 ${
                  navigationVisible 
                    ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' 
                    : 'text-gray-500 hover:text-amber-600'
                }`}
                title={navigationVisible ? 'Hide Navigation' : 'Show Navigation'}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleChat}
                className={`transition-colors h-8 w-8 ${
                  chatVisible 
                    ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' 
                    : 'text-gray-500 hover:text-amber-600'
                }`}
                title={chatVisible ? 'Hide AI Chat' : 'Show AI Chat'}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-amber-300 mx-2"></div>
              <img 
                src={rellioLogo} 
                alt="Rellio" 
                className="w-10 h-10 object-contain" 
              />
            </div>

            {/* Right Side - Progress and Profile */}
            <div className="flex items-center space-x-2">
              <Button
                variant={currentView === 'progress' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('progress')}
                className={cn(
                  "h-8 px-3 text-xs transition-all duration-200",
                  currentView === 'progress' 
                    ? "bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200" 
                    : "text-gray-600 hover:bg-amber-50 hover:text-amber-700"
                )}
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                Progress
              </Button>
              
              {/* User Profile Section with Circular Picture */}
              {isGuest ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/api/auth/google'}
                  className="h-8 px-3 hover:bg-blue-50 transition-colors border border-blue-200 text-blue-600"
                  title="Sign in with Google"
                >
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-xs">Sign in</span>
                </Button>
              ) : (
                <div className="flex items-center space-x-2">
                  {/* Circular Profile Picture */}
                  <div 
                    className="w-8 h-8 rounded-full bg-amber-100 border-2 border-amber-200 overflow-hidden cursor-pointer hover:border-amber-300 transition-colors"
                    onClick={() => window.location.href = '/profile'}
                    title="View Profile"
                  >
                    {user?.profileImageUrl ? (
                      <img 
                        src={user.profileImageUrl} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to initials if image fails to load
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling!.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className={cn(
                        "w-full h-full flex items-center justify-center text-xs font-semibold text-amber-700",
                        user?.profileImageUrl ? "hidden" : "flex"
                      )}
                    >
                      {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </div>
                  </div>
                  
                  {/* Profile Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.href = '/profile'}
                    className="h-8 px-2 hover:bg-amber-50 transition-colors text-xs"
                    title="View Profile"
                  >
                    {user?.firstName || 'Profile'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Three-Column Responsive Layout */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] relative overflow-hidden bg-gray-50">
        
        {/* Left Column - Navigation Panel (only for scripture view) */}
        <div
          {...navigationSwipeHandlers}
          className={`${currentView === 'scripture' ? getNavigationClasses() : 'w-0 hidden'} transition-all duration-300 ease-in-out overflow-hidden border-r border-amber-200`}
        >
          {navigationVisible && currentView === 'scripture' && (
            <>
              {/* Mobile overlay background */}
              <div className="lg:hidden absolute inset-0 bg-black bg-opacity-50" onClick={() => setNavigationVisible(false)}></div>
              
              {/* Navigation content */}
              <div className="lg:static absolute inset-y-0 left-0 w-4/5 max-w-sm lg:w-full lg:max-w-none bg-white shadow-xl lg:shadow-none">
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
                
                {/* Mobile close button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNavigationVisible(false)}
                  className="lg:hidden absolute top-4 right-4 z-10"
                  title="Close Navigation"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
        
        {/* Center Column - Verse Content or Progress Dashboard */}
        <div
          {...contentSwipeHandlers}
          className={`${getContentWidth()} transition-all duration-300 ease-in-out relative overflow-hidden order-2`}
        >
          {currentView === 'progress' ? (
            <div className="h-full bg-white overflow-y-auto">
              <ProgressDashboard onClose={() => setCurrentView('scripture')} />
            </div>
          ) : selectedReligion ? (
            <div className="h-full bg-white flex flex-col p-4">
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
                onVerseRead={() => readingSession.incrementVersesRead()}
                readingSession={readingSession}
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
          {!navigationVisible && currentView === 'scripture' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleNavigation}
              className="lg:hidden absolute top-4 left-4 z-10 bg-white shadow-md hover:bg-gray-50 transition-opacity rounded-full p-2"
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
              className="lg:hidden absolute top-4 right-4 z-10 bg-white shadow-md hover:bg-gray-50 transition-opacity rounded-full p-2"
              title="Show Chat Panel"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Right Column - Chat Panel */}
        <div
          className={`${getChatClasses()} transition-all duration-300 ease-in-out overflow-hidden border-l border-gray-200 h-full`}
        >
          {chatVisible && (
            <>
              {/* Mobile overlay background */}
              <div className="lg:hidden absolute inset-0 bg-black bg-opacity-50" onClick={() => setChatVisible(false)}></div>
              
              {/* Chat content */}
              <div className="lg:static absolute inset-y-0 right-0 w-4/5 max-w-sm lg:w-full lg:max-w-none h-full bg-white shadow-xl lg:shadow-none flex flex-col">
                {/* Chat Header with Controls */}
                <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Universal Wisdom Explorer</h3>
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
                
                {/* Enhanced Voice-First Chat - Full Height */}
                <div className="flex-1 min-h-0">
                  <VoiceFirstChatInterface
                    sessionId={chatSessionId}
                    context={currentContext}
                    selectedPersona={selectedPersona}
                    isInsideBook={!!(selectedReligion && selectedBook)}
                    onNavigateToVerse={handleNavigateToVerse}
                    className="h-full"
                    onMessageSent={() => readingSession.incrementChatMessages()}
                  />
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
