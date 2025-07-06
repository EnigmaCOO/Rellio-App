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

  // Get proper chapter display for Quran (shows surah number instead of always 1)
  const getDisplayChapter = (): number => {
    if (selectedReligion === 'quran' && selectedBook) {
      // Map common Quran surahs to their numbers
      const quranBookMapping: Record<string, number> = {
        "Al-Fatihah (The Opening)": 1,
        "Al-Baqarah (The Cow)": 2,
        "Al-Imran (The Family of Imran)": 3,
        "An-Nisa (The Women)": 4,
        "Al-Maidah (The Table)": 5,
        "Al-An'am (The Cattle)": 6,
        "Al-A'raf (The Heights)": 7,
        "Al-Anfal (The Spoils of War)": 8,
        "At-Tawbah (The Repentance)": 9,
        "Yunus (Jonah)": 10,
        "Hud": 11,
        "Yusuf (Joseph)": 12,
        "Ar-Ra'd (The Thunder)": 13,
        "Ibrahim (Abraham)": 14,
        "Al-Hijr": 15,
        "An-Nahl (The Bees)": 16,
        "Al-Isra (The Night Journey)": 17,
        "Al-Kahf (The Cave)": 18,
        "Maryam (Mary)": 19,
        "Ta-Ha": 20,
        "Al-Anbiya (The Prophets)": 21,
        "Al-Hajj (The Pilgrimage)": 22,
        "Al-Mu'minun (The Believers)": 23,
        "An-Nur (The Light)": 24,
        "Al-Furqan (The Standard)": 25,
        "Ash-Shu'ara (The Poets)": 26,
        "An-Naml (The Ants)": 27,
        "Al-Qasas (The Stories)": 28,
        "Al-Ankabut (The Spider)": 29,
        "Ar-Rum (The Romans)": 30,
        "Luqman": 31,
        "As-Sajdah (The Prostration)": 32,
        "Al-Ahzab (The Clans)": 33,
        "Saba (Sheba)": 34,
        "Al-Fatir (The Creator)": 35,
        "Ya-Sin": 36,
        "As-Saffat (Those Ranges in Ranks)": 37,
        "Sad": 38,
        "Az-Zumar (The Groups)": 39,
        "Ghafir (The Forgiver)": 40,
        "Fussilat (Distinguished)": 41,
        "Ash-Shura (The Consultation)": 42,
        "Az-Zukhruf (The Gold)": 43,
        "Ad-Dukhan (The Smoke)": 44,
        "Al-Jathiyah (The Kneeling)": 45,
        "Al-Ahqaf (The Valley)": 46,
        "Muhammad": 47,
        "Al-Fath (The Victory)": 48,
        "Al-Hujurat (The Dwellings)": 49,
        "Qaf": 50,
        "Adh-Dhariyat (The Scatterers)": 51,
        "At-Tur (The Mount)": 52,
        "An-Najm (The Star)": 53,
        "Al-Qamar (The Moon)": 54,
        "Ar-Rahman (The Most Gracious)": 55,
        "Al-Waqi'ah (The Event)": 56,
        "Al-Hadid (The Iron)": 57,
        "Al-Mujadilah (The Reasoning)": 58,
        "Al-Hashr (The Gathering)": 59,
        "Al-Mumtahanah (The Tested)": 60,
        "As-Saff (The Row)": 61,
        "Al-Jumu'ah (Friday)": 62,
        "Al-Munafiqun (The Hypocrites)": 63,
        "At-Taghabun (The Loss & Gain)": 64,
        "At-Talaq (The Divorce)": 65,
        "At-Tahrim (The Prohibition)": 66,
        "Al-Mulk (The Kingdom)": 67,
        "Al-Qalam (The Pen)": 68,
        "Al-Haqqah (The Inevitable)": 69,
        "Al-Ma'arij (The Elevated Passages)": 70,
        "Nuh (Noah)": 71,
        "Al-Jinn (The Jinn)": 72,
        "Al-Muzammil (The Wrapped)": 73,
        "Al-Mudaththir (The Cloaked)": 74,
        "Al-Qiyamah (The Resurrection)": 75,
        "Al-Insan (The Human)": 76,
        "Al-Mursalat (Those Sent)": 77,
        "An-Naba (The Great News)": 78,
        "An-Nazi'at (Those Who Pull Out)": 79,
        "Abasa (He Frowned)": 80,
        "At-Takwir (The Overthrowing)": 81,
        "Al-Infitar (The Cleaving)": 82,
        "Al-Mutaffifin (Those Who Deal in Fraud)": 83,
        "Al-Inshiqaq (The Splitting Asunder)": 84,
        "Al-Buruj (The Stars)": 85,
        "At-Tariq (The Night Comer)": 86,
        "Al-A'la (The Most High)": 87,
        "Al-Ghashiyah (The Overwhelming)": 88,
        "Al-Fajr (The Dawn)": 89,
        "Al-Balad (The City)": 90,
        "Ash-Shams (The Sun)": 91,
        "Al-Layl (The Night)": 92,
        "Adh-Dhuha (The Forenoon)": 93,
        "Al-Inshirah (The Opening Forth)": 94,
        "At-Tin (The Fig)": 95,
        "Al-Alaq (The Clot)": 96,
        "Al-Qadr (The Night of Decree)": 97,
        "Al-Bayyinah (The Proof)": 98,
        "Az-Zalzalah (The Earthquake)": 99,
        "Al-Adiyat (Those That Run)": 100,
        "Al-Qari'ah (The Striking Hour)": 101,
        "At-Takathur (The Piling Up)": 102,
        "Al-Asr (The Time)": 103,
        "Al-Humazah (The Slanderer)": 104,
        "Al-Fil (The Elephant)": 105,
        "Quraysh": 106,
        "Al-Ma'un (The Assistance)": 107,
        "Al-Kawthar (The River of Abundance)": 108,
        "Al-Kafirun (The Disbelievers)": 109,
        "An-Nasr (The Help)": 110,
        "Al-Masad (The Palm Fiber)": 111,
        "Al-Ikhlas (The Sincerity)": 112,
        "Al-Falaq (The Daybreak)": 113,
        "An-Nas (Mankind)": 114
      };
      
      return quranBookMapping[selectedBook] || selectedChapter;
    }
    return selectedChapter;
  };

  const displayChapter = getDisplayChapter();
  
  // Debug logging for Bible chapter display
  if (selectedReligion === 'bible') {
    console.log(`Bible Debug - selectedChapter: ${selectedChapter}, displayChapter: ${displayChapter}, selectedBook: ${selectedBook}`);
  }

  // Calculate pagination for scriptures with verse counts
  const VERSES_PER_PAGE = 10; // Show 10 verses per page for Quran
  const totalVerses = scriptures?.length || 0;
  const isQuranPagination = selectedReligion === 'quran';
  const isBibleChapter = selectedReligion === 'bible';
  
  // For Quran: page-based navigation within surahs
  // For Bible: chapter-based navigation with verse counts displayed
  const totalPages = isQuranPagination ? Math.ceil(totalVerses / VERSES_PER_PAGE) : 1;
  const currentPage = isQuranPagination ? selectedChapter : selectedChapter;
  const startVerseIndex = isQuranPagination ? (currentPage - 1) * VERSES_PER_PAGE : 0;
  const endVerseIndex = isQuranPagination ? Math.min(startVerseIndex + VERSES_PER_PAGE, totalVerses) : totalVerses;
  const versesOnCurrentPage = endVerseIndex - startVerseIndex;

  // Get verses for current page (only for Quran pagination)
  const currentPageVerses = isQuranPagination ? 
    scriptures?.slice(startVerseIndex, endVerseIndex) || [] : 
    scriptures || [];

  const recordReadingMutation = useMutation({
    mutationFn: async (reading: { userId: number; religion: Religion; book: string; chapter: number }) => {
      await apiRequest("POST", "/api/readings", reading);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/readings'] });
    },
  });

  const handleChapterNavigation = (direction: 'prev' | 'next') => {
    if (isQuranPagination) {
      // For Quran, navigate through pages of verses within a surah
      const newPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
      
      if (newPage >= 1 && newPage <= totalPages) {
        onChapterChange(newPage);
        
        // Record the reading
        recordReadingMutation.mutate({
          userId: 1, // Default user ID
          religion: selectedReligion as Religion,
          book: selectedBook,
          chapter: newPage,
        });
      }
    } else {
      // For Bible and other religions, navigate through chapters
      const newChapter = direction === 'prev' ? selectedChapter - 1 : selectedChapter + 1;
      if (newChapter > 0) {
        onChapterChange(newChapter);
        
        // Record the reading
        if (selectedReligion) {
          recordReadingMutation.mutate({
            userId: 1, // Default user ID
            religion: selectedReligion as Religion,
            book: selectedBook,
            chapter: newChapter,
          });
        }
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
      <div className="h-full bg-white shadow-md p-4 lg:p-6">
        <div className="space-y-6 flex flex-col items-center justify-center min-h-[500px] animate-in fade-in-0 duration-500">
          <div className="text-center space-y-4">
            <h2 className="text-2xl lg:text-3xl font-bold text-scripture-800">Welcome to the Scripture Dashboard!</h2>
            <p className="text-base lg:text-lg text-scripture-600 max-w-md mx-auto leading-relaxed">
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
      <div className="h-full bg-white shadow-md p-4 lg:p-6">
        <div className="space-y-4 flex flex-col items-center justify-center min-h-[400px] animate-in fade-in-0 duration-300">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scripture-600"></div>
          <div className="text-scripture-600 text-base lg:text-lg font-medium">Loading scripture content...</div>
          <div className="text-scripture-500 text-sm">
            Fetching {religionName} - {selectedBook} {isQuranPagination ? `Page ${selectedChapter}` : `Chapter ${selectedChapter}`}
          </div>
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
    <div className="h-full bg-white shadow-md overflow-y-auto">
      <div className="p-4 lg:p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg lg:text-2xl font-bold text-scripture-800">
              {religionName} - {selectedBook}
              <span className="text-scripture-500 ml-2">
                {isQuranPagination ? 
                  `Page ${currentPage} of ${totalPages}` : 
                  isBibleChapter ? 
                    `Chapter ${displayChapter} (${totalVerses} verses)` :
                    `Chapter ${displayChapter}`
                }
              </span>
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
          
          {/* Chapter/Page Navigation */}
          <div className="flex items-center space-x-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChapterNavigation('prev')}
              disabled={isQuranPagination ? currentPage <= 1 : selectedChapter <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-scripture-600">
              {isQuranPagination ? (
                <div className="text-center">
                  <div>Page {currentPage} of {totalPages}</div>
                  <div className="text-xs text-scripture-500">
                    {versesOnCurrentPage} verses on this page
                  </div>
                </div>
              ) : isBibleChapter ? (
                <div className="text-center">
                  <div>Chapter {displayChapter}</div>
                  <div className="text-xs text-scripture-500">
                    {totalVerses} verses in this chapter
                  </div>
                </div>
              ) : (
                `Chapter ${displayChapter}`
              )}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChapterNavigation('next')}
              disabled={isQuranPagination ? currentPage >= totalPages : false}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Scripture Content */}
        <div className="bg-scripture-50 rounded-lg p-4 lg:p-6 mb-6 animate-in fade-in-0 duration-500">
          <div className="space-y-4">
            {currentPageVerses && currentPageVerses.length > 0 ? (
              currentPageVerses.map((scripture, index) => (
                <div
                  key={scripture.id || `${scripture.religion}-${scripture.book}-${scripture.chapter}-${scripture.verse || index}`}
                  className="flex items-start space-x-4 hover:bg-white rounded-lg p-3 transition-all duration-200 cursor-pointer group animate-in fade-in-0"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <span className="text-blue-600 font-bold text-sm mt-1 min-w-[2rem]">
                    {isQuranPagination ? 
                      scripture.verse || (startVerseIndex + index + 1) : 
                      scripture.verse
                    }
                  </span>
                  <p className="text-scripture-800 leading-relaxed text-base lg:text-lg group-hover:text-scripture-900">
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
