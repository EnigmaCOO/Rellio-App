import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";
import type { Religion } from "@shared/schema";

interface NavigationPanelProps {
  selectedReligion: Religion | null;
  selectedBook: string;
  selectedChapter: number;
  religions?: any[];
  books?: string[];
  maxChapters?: number;
  onReligionChange: (religion: Religion) => void;
  onBookChange: (book: string) => void;
  onChapterChange: (chapter: number) => void;
  isLoading: boolean;
  searchTerm?: string;
}

export function NavigationPanel({
  selectedReligion,
  selectedBook,
  selectedChapter,
  religions,
  books,
  maxChapters = 10,
  onReligionChange,
  onBookChange,
  onChapterChange,
  isLoading,
  searchTerm,
}: NavigationPanelProps) {
  const { data: recentReadings } = useQuery<any[]>({
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

  // Dynamic chapter calculation based on religion and book
  const getDynamicChapterCount = (): number => {
    if (!selectedReligion || !selectedBook) return 0; // No chapters when no book selected

    switch (selectedReligion) {
      case 'bible':
        // Use the API-provided maxChapters for Bible books since we have accurate data
        return maxChapters || 1;
      case 'quran':
        // For Quran, show all 114 surahs as chapters for comprehensive navigation
        return 114;
      case 'hindu':
        return 18; // Bhagavad Gita chapters
      case 'torah':
        // Use the API-provided maxChapters for Torah books since we have accurate data
        return maxChapters || 1;
      case 'buddhist':
        return 10; // Tripitaka sample
      default:
        return maxChapters || 1;
    }
  };

  const dynamicChapterCount = getDynamicChapterCount();

  // Chapter click handler with special Quran logic
  const handleChapterClick = (chapterNum: number) => {
    if (selectedReligion === 'quran') {
      // For Quran, chapter number represents surah number
      // Find the corresponding surah and switch to it
      const surah = quranSurahs.find(s => s.number === chapterNum);
      if (surah && books) {
        // Find the book that matches this surah
        const matchingBook = books.find(book => 
          book.includes(surah.name) || book.includes(`Al-${surah.name}`)
        );
        if (matchingBook) {
          onBookChange(matchingBook);
          onChapterChange(1); // Reset to chapter 1 for the new surah
        }
      }
    } else {
      onChapterChange(chapterNum);
    }
  };

  // Use standard chapter display for all religions
  const displayedSelectedChapter = selectedChapter;

  // Comprehensive Quran surah mapping with verse counts
  const quranSurahs = [
    { number: 1, name: "Al-Fatihah", transliteration: "The Opening", verses: 7 },
    { number: 2, name: "Al-Baqarah", transliteration: "The Cow", verses: 286 },
    { number: 3, name: "Al-Imran", transliteration: "Family of Imran", verses: 200 },
    { number: 4, name: "An-Nisa", transliteration: "The Women", verses: 176 },
    { number: 5, name: "Al-Maidah", transliteration: "The Table", verses: 120 },
    { number: 6, name: "Al-An'am", transliteration: "The Cattle", verses: 165 },
    { number: 7, name: "Al-A'raf", transliteration: "The Heights", verses: 206 },
    { number: 8, name: "Al-Anfal", transliteration: "The Spoils of War", verses: 75 },
    { number: 9, name: "At-Tawbah", transliteration: "The Repentance", verses: 129 },
    { number: 10, name: "Yunus", transliteration: "Jonah", verses: 109 },
    { number: 11, name: "Hud", transliteration: "Hud", verses: 123 },
    { number: 12, name: "Yusuf", transliteration: "Joseph", verses: 111 },
    { number: 13, name: "Ar-Ra'd", transliteration: "The Thunder", verses: 43 },
    { number: 14, name: "Ibrahim", transliteration: "Abraham", verses: 52 },
    { number: 15, name: "Al-Hijr", transliteration: "The Stoneland", verses: 99 },
    { number: 16, name: "An-Nahl", transliteration: "The Bees", verses: 128 },
    { number: 17, name: "Al-Isra", transliteration: "The Night Journey", verses: 111 },
    { number: 18, name: "Al-Kahf", transliteration: "The Cave", verses: 110 },
    { number: 19, name: "Maryam", transliteration: "Mary", verses: 98 },
    { number: 20, name: "Ta-Ha", transliteration: "Ta-Ha", verses: 135 },
    { number: 21, name: "Al-Anbiya", transliteration: "The Prophets", verses: 112 },
    { number: 22, name: "Al-Hajj", transliteration: "The Pilgrimage", verses: 78 },
    { number: 23, name: "Al-Mu'minun", transliteration: "The Believers", verses: 118 },
    { number: 24, name: "An-Nur", transliteration: "The Light", verses: 64 },
    { number: 25, name: "Al-Furqan", transliteration: "The Standard", verses: 77 },
    { number: 26, name: "Ash-Shu'ara", transliteration: "The Poets", verses: 227 },
    { number: 27, name: "An-Naml", transliteration: "The Ants", verses: 93 },
    { number: 28, name: "Al-Qasas", transliteration: "The Stories", verses: 88 },
    { number: 29, name: "Al-Ankabut", transliteration: "The Spider", verses: 69 },
    { number: 30, name: "Ar-Rum", transliteration: "The Romans", verses: 60 },
    { number: 31, name: "Luqman", transliteration: "Luqman", verses: 34 },
    { number: 32, name: "As-Sajdah", transliteration: "The Prostration", verses: 30 },
    { number: 33, name: "Al-Ahzab", transliteration: "The Clans", verses: 73 },
    { number: 34, name: "Saba", transliteration: "Sheba", verses: 54 },
    { number: 35, name: "Al-Fatir", transliteration: "The Creator", verses: 45 },
    { number: 36, name: "Ya-Sin", transliteration: "Ya-Sin", verses: 83 },
    { number: 37, name: "As-Saffat", transliteration: "Those Ranges in Ranks", verses: 182 },
    { number: 38, name: "Sad", transliteration: "Sad", verses: 88 },
    { number: 39, name: "Az-Zumar", transliteration: "The Groups", verses: 75 },
    { number: 40, name: "Ghafir", transliteration: "The Forgiver", verses: 85 },
    { number: 41, name: "Fussilat", transliteration: "Distinguished", verses: 54 },
    { number: 42, name: "Ash-Shura", transliteration: "The Consultation", verses: 53 },
    { number: 43, name: "Az-Zukhruf", transliteration: "The Gold", verses: 89 },
    { number: 44, name: "Ad-Dukhan", transliteration: "The Smoke", verses: 59 },
    { number: 45, name: "Al-Jathiyah", transliteration: "The Kneeling", verses: 37 },
    { number: 46, name: "Al-Ahqaf", transliteration: "The Valley", verses: 35 },
    { number: 47, name: "Muhammad", transliteration: "Muhammad", verses: 38 },
    { number: 48, name: "Al-Fath", transliteration: "The Victory", verses: 29 },
    { number: 49, name: "Al-Hujurat", transliteration: "The Dwellings", verses: 18 },
    { number: 50, name: "Qaf", transliteration: "Qaf", verses: 45 },
    { number: 51, name: "Adh-Dhariyat", transliteration: "The Scatterers", verses: 60 },
    { number: 52, name: "At-Tur", transliteration: "The Mount", verses: 49 },
    { number: 53, name: "An-Najm", transliteration: "The Star", verses: 62 },
    { number: 54, name: "Al-Qamar", transliteration: "The Moon", verses: 55 },
    { number: 55, name: "Ar-Rahman", transliteration: "The Most Gracious", verses: 78 },
    { number: 56, name: "Al-Waqi'ah", transliteration: "The Event", verses: 96 },
    { number: 57, name: "Al-Hadid", transliteration: "The Iron", verses: 29 },
    { number: 58, name: "Al-Mujadilah", transliteration: "The Reasoning", verses: 22 },
    { number: 59, name: "Al-Hashr", transliteration: "The Gathering", verses: 24 },
    { number: 60, name: "Al-Mumtahanah", transliteration: "The Tested", verses: 13 },
    { number: 61, name: "As-Saff", transliteration: "The Row", verses: 14 },
    { number: 62, name: "Al-Jumu'ah", transliteration: "Friday", verses: 11 },
    { number: 63, name: "Al-Munafiqun", transliteration: "The Hypocrites", verses: 11 },
    { number: 64, name: "At-Taghabun", transliteration: "The Loss & Gain", verses: 18 },
    { number: 65, name: "At-Talaq", transliteration: "The Divorce", verses: 12 },
    { number: 66, name: "At-Tahrim", transliteration: "The Prohibition", verses: 12 },
    { number: 67, name: "Al-Mulk", transliteration: "The Kingdom", verses: 30 },
    { number: 68, name: "Al-Qalam", transliteration: "The Pen", verses: 52 },
    { number: 69, name: "Al-Haqqah", transliteration: "The Inevitable", verses: 52 },
    { number: 70, name: "Al-Ma'arij", transliteration: "The Elevated Passages", verses: 44 },
    { number: 71, name: "Nuh", transliteration: "Noah", verses: 28 },
    { number: 72, name: "Al-Jinn", transliteration: "The Jinn", verses: 28 },
    { number: 73, name: "Al-Muzammil", transliteration: "The Wrapped", verses: 20 },
    { number: 74, name: "Al-Mudaththir", transliteration: "The Cloaked", verses: 56 },
    { number: 75, name: "Al-Qiyamah", transliteration: "The Resurrection", verses: 40 },
    { number: 76, name: "Al-Insan", transliteration: "The Human", verses: 31 },
    { number: 77, name: "Al-Mursalat", transliteration: "Those Sent", verses: 50 },
    { number: 78, name: "An-Naba", transliteration: "The Great News", verses: 40 },
    { number: 79, name: "An-Nazi'at", transliteration: "Those Who Pull Out", verses: 46 },
    { number: 80, name: "Abasa", transliteration: "He Frowned", verses: 42 },
    { number: 81, name: "At-Takwir", transliteration: "The Overthrowing", verses: 29 },
    { number: 82, name: "Al-Infitar", transliteration: "The Cleaving", verses: 19 },
    { number: 83, name: "Al-Mutaffifin", transliteration: "Those Who Deal in Fraud", verses: 36 },
    { number: 84, name: "Al-Inshiqaq", transliteration: "The Splitting Asunder", verses: 25 },
    { number: 85, name: "Al-Buruj", transliteration: "The Stars", verses: 22 },
    { number: 86, name: "At-Tariq", transliteration: "The Night Comer", verses: 17 },
    { number: 87, name: "Al-A'la", transliteration: "The Most High", verses: 19 },
    { number: 88, name: "Al-Ghashiyah", transliteration: "The Overwhelming", verses: 26 },
    { number: 89, name: "Al-Fajr", transliteration: "The Dawn", verses: 30 },
    { number: 90, name: "Al-Balad", transliteration: "The City", verses: 20 },
    { number: 91, name: "Ash-Shams", transliteration: "The Sun", verses: 15 },
    { number: 92, name: "Al-Layl", transliteration: "The Night", verses: 21 },
    { number: 93, name: "Adh-Dhuha", transliteration: "The Forenoon", verses: 11 },
    { number: 94, name: "Al-Inshirah", transliteration: "The Opening Forth", verses: 8 },
    { number: 95, name: "At-Tin", transliteration: "The Fig", verses: 8 },
    { number: 96, name: "Al-Alaq", transliteration: "The Clot", verses: 19 },
    { number: 97, name: "Al-Qadr", transliteration: "The Night of Decree", verses: 5 },
    { number: 98, name: "Al-Bayyinah", transliteration: "The Proof", verses: 8 },
    { number: 99, name: "Az-Zalzalah", transliteration: "The Earthquake", verses: 8 },
    { number: 100, name: "Al-Adiyat", transliteration: "Those That Run", verses: 11 },
    { number: 101, name: "Al-Qari'ah", transliteration: "The Striking Hour", verses: 11 },
    { number: 102, name: "At-Takathur", transliteration: "The Piling Up", verses: 8 },
    { number: 103, name: "Al-Asr", transliteration: "The Time", verses: 3 },
    { number: 104, name: "Al-Humazah", transliteration: "The Slanderer", verses: 9 },
    { number: 105, name: "Al-Fil", transliteration: "The Elephant", verses: 5 },
    { number: 106, name: "Quraysh", transliteration: "Quraysh", verses: 4 },
    { number: 107, name: "Al-Ma'un", transliteration: "The Assistance", verses: 7 },
    { number: 108, name: "Al-Kawthar", transliteration: "The River of Abundance", verses: 3 },
    { number: 109, name: "Al-Kafirun", transliteration: "The Disbelievers", verses: 6 },
    { number: 110, name: "An-Nasr", transliteration: "The Help", verses: 3 },
    { number: 111, name: "Al-Masad", transliteration: "The Palm Fiber", verses: 5 },
    { number: 112, name: "Al-Ikhlas", transliteration: "The Sincerity", verses: 4 },
    { number: 113, name: "Al-Falaq", transliteration: "The Daybreak", verses: 5 },
    { number: 114, name: "An-Nas", transliteration: "Mankind", verses: 6 }
  ];

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
    <div className="h-full bg-white shadow-md border-r border-scripture-200 overflow-y-auto">
      <div className="p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-scripture-800 mb-4">Scripture Navigation</h2>
        
        {/* Religion Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-scripture-700 mb-3">Religious Text</label>
          <Select
            value={selectedReligion || ''}
            onValueChange={onReligionChange}
          >
            <SelectTrigger className="w-full h-11 bg-white border-scripture-300 hover:border-scripture-400 focus:border-scripture-500 focus:ring-2 focus:ring-scripture-100 transition-all duration-200">
              <SelectValue placeholder="Choose a religious text..." className="text-scripture-700" />
            </SelectTrigger>
            <SelectContent className="bg-white border-scripture-200 shadow-lg">
              {religions?.map((religion) => (
                <SelectItem 
                  key={religion.id} 
                  value={religion.id}
                  className="cursor-pointer hover:bg-scripture-50 focus:bg-scripture-100 py-2.5 px-3 text-scripture-700 font-medium"
                >
                  {religion.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Book Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-scripture-700 mb-3">
            Book {searchTerm && `(${books?.length || 0} found)`}
          </label>
          <ScrollArea className="h-60 border border-scripture-200 rounded-lg bg-gray-50/50">
            <div className="p-2 space-y-1">
              {books?.length === 0 && searchTerm ? (
                <div className="text-center py-8 text-scripture-500">
                  <p className="text-sm">No books found matching "{searchTerm}"</p>
                </div>
              ) : (
                books?.map((book, index) => {
                  // Handle both string and object formats
                  const bookName = typeof book === 'string' ? book : (book as any)?.name || book;
                  return (
                    <Button
                      key={`${bookName}-${index}`}
                      variant={selectedBook === bookName ? "default" : "ghost"}
                      className="w-full justify-start text-left h-9 px-3 font-medium hover:bg-scripture-100 transition-all duration-200 animate-in fade-in-0"
                      onClick={() => onBookChange(bookName)}
                    >
                      {bookName}
                    </Button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chapter Selector - Only show when a book is selected */}
        {selectedBook && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-scripture-700 mb-3">
              {selectedReligion === 'quran' ? 'Surah' : 'Chapter'} (1-{dynamicChapterCount})
            </label>
            <div className={`grid gap-2 max-h-48 overflow-y-auto p-1 ${
              dynamicChapterCount <= 20 ? 'grid-cols-4' : 
              dynamicChapterCount <= 50 ? 'grid-cols-5' : 
              'grid-cols-6'
            }`}>
              {selectedReligion === 'quran' ? (
                // Special display for Quran surahs with names and verse counts
                quranSurahs.map((surah) => (
                  <Button
                    key={surah.number}
                    variant={displayedSelectedChapter === surah.number ? "default" : "outline"}
                    size="sm"
                    className={`h-auto p-2 text-xs font-medium transition-all duration-200 ${
                      displayedSelectedChapter === surah.number
                        ? 'bg-scripture-600 hover:bg-scripture-700 text-white shadow-md ring-2 ring-scripture-300'
                        : 'hover:bg-scripture-50 border-scripture-300 hover:border-scripture-400 text-scripture-700 hover:shadow-sm'
                    }`}
                    onClick={() => handleChapterClick(surah.number)}
                    title={`${surah.name} (${surah.transliteration}) - ${surah.verses} verses`}
                  >
                    <div className="text-center">
                      <div className="font-bold">{surah.number}</div>
                      <div className="text-[10px] leading-tight">{surah.name}</div>
                      <div className="text-[9px] opacity-75">{surah.verses}v</div>
                    </div>
                  </Button>
                ))
              ) : (
                // Standard chapter display for other religions
                Array.from({ length: dynamicChapterCount }, (_, i) => i + 1).map((chapter) => (
                  <Button
                    key={chapter}
                    variant={displayedSelectedChapter === chapter ? "default" : "outline"}
                    size="sm"
                    className={`h-9 text-xs font-medium transition-all duration-200 ${
                      displayedSelectedChapter === chapter
                        ? 'bg-scripture-600 hover:bg-scripture-700 text-white shadow-md ring-2 ring-scripture-300'
                        : 'hover:bg-scripture-50 border-scripture-300 hover:border-scripture-400 text-scripture-700 hover:shadow-sm'
                    }`}
                    onClick={() => handleChapterClick(chapter)}
                  >
                    {chapter}
                  </Button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Recent Readings */}
        <div className="border-t border-scripture-200 pt-4">
          <h3 className="text-sm font-medium text-scripture-700 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Readings
          </h3>
          <div className="space-y-2">
            {recentReadings && recentReadings.length > 0 ? (
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
