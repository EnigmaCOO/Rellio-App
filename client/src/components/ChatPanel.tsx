import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Send, MoreVertical, Bot, User, Bookmark, BookmarkCheck, Trash2, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Religion, ChatMessage } from "@shared/schema";

// Component to render clickable scripture references
interface ClickableMessageProps {
  content: string;
  onScriptureClick: (religion: Religion, book: string, chapter: number, verse?: number) => void;
}

function ClickableMessage({ content, onScriptureClick }: ClickableMessageProps) {
  const [processedContent, setProcessedContent] = useState<string>("");

  useEffect(() => {
    // Parse scripture references and make them clickable
    const parseScriptureReferences = (text: string) => {
      console.log("Parsing scripture references from text:", text.substring(0, 200));
      // Bible references - including both "Mark 12:31" and "Genesis Chapter 1" formats
      const biblePattern = /\b(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Songs|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation)\s+(?:Chapter\s+)?(\d+)(?::(\d+))?/gi;
      
      // Quran references - including surah names
      const quranPattern = /\b(?:Quran|Surah)\s+(?:Al-)?([A-Z][a-z-]+(?:\s+[A-Z][a-z-]+)*)\s*\((\d+):(\d+)\)/gi;
      const quranSimplePattern = /\b(Quran)\s+(\d+):(\d+)(?:[-–]\d+)?/gi;
      
      // Torah references
      const torahPattern = /\b(Bereshit|Shemot|Vayikra|Bamidbar|Devarim)\s+(\d+):(\d+)/gi;
      
      // Hindu references - handle "Bhagavad Gita 12:13-14" format
      const hinduPattern = /\b(Bhagavad\s+Gita)\s+(\d+):(\d+)(?:[-–]\d+)?/gi;
      
      // Buddhist references - handle "Sutta Nipata 1.8" format
      const buddhistPattern = /\b(Dhammapada|Tripitaka|Sutta\s+Nipata)\s+(\d+)[\.:]?(\d+)?/gi;

      let processedText = text;
      
      // Replace Bible references - handle both simple and complex formats
      processedText = processedText.replace(biblePattern, (match, book, chapter, verse) => {
        const chapterNum = parseInt(chapter);
        const verseNum = verse ? parseInt(verse) : 1;
        return `<span class="text-blue-500 hover:underline cursor-pointer" onclick="window.handleScriptureClick('bible', '${book}', ${chapterNum}, ${verseNum})">${match}</span>`;
      });
      
      // Replace Quran references with surah names
      processedText = processedText.replace(quranPattern, (match, surahName, chapter, verse) => {
        const surahMap: Record<string, string> = {
          "Kahf": "Al-Kahf (The Cave)",
          "Anbiya": "Al-Anbiya (The Prophets)",
          "Fatihah": "Al-Fatihah (The Opening)",
          "Baqarah": "Al-Baqarah (The Cow)",
          "Imran": "Al-Imran (The Family of Imran)",
          "Nisa": "An-Nisa (The Women)",
          "Maidah": "Al-Maidah (The Table)"
        };
        const fullSurahName = surahMap[surahName] || `Al-${surahName}`;
        return `<span class="text-blue-500 hover:underline cursor-pointer" onclick="window.handleScriptureClick('quran', '${fullSurahName}', ${chapter}, ${verse})">${match}</span>`;
      });
      
      // Replace simple Quran references
      processedText = processedText.replace(quranSimplePattern, (match, type, chapter, verse) => {
        console.log("Found Quran reference:", { match, type, chapter, verse });
        const surahMap: Record<number, string> = {
          1: "Al-Fatihah (The Opening)", 2: "Al-Baqarah (The Cow)", 3: "Al-Imran (The Family of Imran)",
          4: "An-Nisa (The Women)", 5: "Al-Maidah (The Table)", 6: "Al-An'am (The Cattle)",
          7: "Al-A'raf (The Heights)", 8: "Al-Anfal (The Spoils of War)", 9: "At-Tawbah (The Repentance)",
          10: "Yunus (Jonah)", 11: "Hud", 12: "Yusuf (Joseph)", 13: "Ar-Ra'd (The Thunder)",
          14: "Ibrahim (Abraham)", 15: "Al-Hijr", 16: "An-Nahl (The Bees)", 17: "Al-Isra (The Night Journey)",
          18: "Al-Kahf (The Cave)", 19: "Maryam (Mary)", 20: "Ta-Ha", 21: "Al-Anbiya (The Prophets)",
          22: "Al-Hajj (The Pilgrimage)", 23: "Al-Mu'minun (The Believers)", 24: "An-Nur (The Light)",
          25: "Al-Furqan (The Criterion)", 26: "Ash-Shu'ara (The Poets)", 27: "An-Naml (The Ants)",
          28: "Al-Qasas (The Stories)", 29: "Al-Ankabut (The Spider)", 30: "Ar-Rum (The Romans)",
          31: "Luqman", 32: "As-Sajda (The Prostration)", 33: "Al-Ahzab (The Clans)",
          34: "Saba (Sheba)", 35: "Fatir (Originator)", 36: "Ya-Sin (Ya Sin)", 112: "Al-Ikhlas (The Sincerity)"
        };
        const book = surahMap[parseInt(chapter)] || `Surah ${chapter}`;
        console.log("Mapped to book:", book);
        return `<span class="text-blue-500 hover:underline cursor-pointer" onclick="window.handleScriptureClick('quran', '${book}', 1, ${verse})">${match}</span>`;
      });
      
      // Replace Torah references
      processedText = processedText.replace(torahPattern, (match, book, chapter, verse) => {
        return `<span class="text-blue-500 hover:underline cursor-pointer" onclick="window.handleScriptureClick('torah', '${book}', ${chapter}, ${verse})">${match}</span>`;
      });
      
      // Replace Hindu references
      processedText = processedText.replace(hinduPattern, (match, type, chapter, verse) => {
        return `<span class="text-blue-500 hover:underline cursor-pointer" onclick="window.handleScriptureClick('hindu', 'Bhagavad Gita', ${chapter}, ${verse})">${match}</span>`;
      });
      
      // Replace Buddhist references
      processedText = processedText.replace(buddhistPattern, (match, book, chapter, verse) => {
        const verseNum = verse ? parseInt(verse) : 1;
        return `<span class="text-blue-500 hover:underline cursor-pointer" onclick="window.handleScriptureClick('buddhist', '${book}', ${chapter}, ${verseNum})">${match}</span>`;
      });
      
      return processedText;
    };

    const parsed = parseScriptureReferences(content);
    setProcessedContent(parsed);
  }, [content]);

  useEffect(() => {
    // Set up global handler for scripture clicks
    (window as any).handleScriptureClick = (religion: Religion, book: string, chapter: number, verse?: number) => {
      onScriptureClick(religion, book, chapter, verse);
    };
    
    return () => {
      // Clean up global handler
      delete (window as any).handleScriptureClick;
    };
  }, [onScriptureClick]);

  return (
    <div 
      className="text-sm leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere"
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}

interface BookmarkedMessage {
  id: string;
  text: string;
  timestamp: Date;
  context: {
    religion: Religion;
    book: string;
    chapter: number;
    verses?: Array<{ number: number; text: string }>;
  };
}

interface ChatPanelProps {
  sessionId: string;
  context: {
    religion: Religion | null;
    book: string;
    chapter: number;
  };
  externalMessage?: string;
  onExternalMessageProcessed?: () => void;
  onCopyOperation?: (isActive: boolean) => void;
  onNavigateToVerse?: (religion: Religion, book: string, chapter: number, verse?: number) => void;
}

export function ChatPanel({ sessionId, context, externalMessage, onExternalMessageProcessed, onCopyOperation, onNavigateToVerse }: ChatPanelProps) {
  const [newMessage, setNewMessage] = useState("");
  const [bookmarks, setBookmarks] = useState<BookmarkedMessage[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load bookmarks from localStorage on component mount
  useEffect(() => {
    const savedBookmarks = localStorage.getItem('scripture-bookmarks');
    if (savedBookmarks) {
      try {
        const parsedBookmarks = JSON.parse(savedBookmarks).map((bookmark: any) => ({
          ...bookmark,
          timestamp: new Date(bookmark.timestamp)
        }));
        setBookmarks(parsedBookmarks);
      } catch (error) {
        console.error('Error loading bookmarks:', error);
      }
    }
  }, []);

  // Save bookmarks to localStorage whenever bookmarks change
  useEffect(() => {
    localStorage.setItem('scripture-bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Get Quran chapter number based on surah name
  const getQuranChapterNumber = (bookName: string): number => {
    const quranMapping: Record<string, number> = {
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
    
    return quranMapping[bookName] || 1;
  };



  // Handle click on scripture reference
  const handleScriptureClick = (religion: Religion, book: string, chapter: number, verse?: number) => {
    console.log("Verse reference clicked:", { religion, chapter, verse });
    if (onNavigateToVerse) {
      onNavigateToVerse(religion, book, chapter, verse);
    }
  };

  const { data: messages, isLoading } = useQuery<ChatMessage[]>({
    queryKey: [`/api/chat/${sessionId}`],
    staleTime: 30 * 1000, // 30 seconds
  });

  // Bookmark functionality
  const bookmarkMessage = (message: ChatMessage) => {
    if (message.type === 'user') return; // Don't bookmark user messages
    
    console.log("Copy event, chat state:", { isBookmarking: true });
    
    // Signal that a copy operation is active
    if (onCopyOperation) {
      onCopyOperation(true);
    }
    
    const bookmark: BookmarkedMessage = {
      id: `bookmark-${Date.now()}`,
      text: message.content,
      timestamp: new Date(),
      context: {
        religion: context.religion!,
        book: context.book,
        chapter: context.chapter,
      }
    };
    
    setBookmarks(prev => [bookmark, ...prev]);
    console.log('Chat State: Bookmarked message:', bookmark);
    
    toast({
      title: "Response Bookmarked",
      description: "AI response saved to your bookmarks",
    });
    
    // Reset copy operation flag after a short delay
    setTimeout(() => {
      if (onCopyOperation) {
        onCopyOperation(false);
      }
    }, 1000);
  };

  // Remove bookmark
  const removeBookmark = (bookmarkId: string) => {
    setBookmarks(prev => prev.filter(bookmark => bookmark.id !== bookmarkId));
    console.log('Chat State: Removed bookmark:', bookmarkId);
  };

  // Clear all bookmarks
  const clearBookmarks = () => {
    setBookmarks([]);
    console.log('Chat State: Cleared all bookmarks');
    toast({
      title: "Bookmarks Cleared",
      description: "All bookmarks have been removed",
    });
  };



  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { message: string; sessionId: string; context: any }) => {
      const response = await apiRequest("POST", "/api/chat", messageData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/${sessionId}`] });
      setNewMessage("");
    },
    onError: (error) => {
      toast({
        title: "Error sending message",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    // Check if no book is selected and this is a general question
    const isGeneralQuestion = !context.book || context.book === "";
    const input = newMessage.toLowerCase();
    const hasSpecificVerseReference = input.includes('verse') || input.includes('chapter');
    
    console.log("Chat input state:", { 
      selectedBook: context.book, 
      inputValue: newMessage,
      isGeneralQuestion,
      hasSpecificVerseReference
    });
    
    // For general questions without verse references, request multi-religious perspective
    if (isGeneralQuestion && !hasSpecificVerseReference) {
      sendMessageMutation.mutate({
        message: newMessage,
        sessionId,
        context: {
          ...context,
          multiReligiousPerspective: true // Flag for backend to generate multi-religious response
        },
      });
    } else if (isGeneralQuestion && hasSpecificVerseReference) {
      // Handle case where user asks about verses but no book is selected
      // Create a special AI response directly without calling the backend
      const fallbackMessage = "Please select a book for context-specific answers or ask a general question!";
      
      // Add the fallback message to the chat directly
      queryClient.setQueryData([`/api/chat/${sessionId}`], (oldData: ChatMessage[] | undefined) => {
        const userMessage: ChatMessage = {
          id: Date.now(),
          sessionId,
          type: 'user',
          content: newMessage,
          context: context || null,
          timestamp: new Date(),
        };
        const aiMessage: ChatMessage = {
          id: Date.now() + 1,
          sessionId,
          type: 'ai',
          content: fallbackMessage,
          context: context || null,
          timestamp: new Date(),
        };
        return [...(oldData || []), userMessage, aiMessage];
      });
      
      setNewMessage("");
    } else {
      // Normal context-specific question
      sendMessageMutation.mutate({
        message: newMessage,
        sessionId,
        context,
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle external messages (from copy functionality)
  useEffect(() => {
    if (externalMessage && externalMessage.trim()) {
      setNewMessage(externalMessage);
      // Auto-send the external message
      sendMessageMutation.mutate({
        message: externalMessage,
        sessionId,
        context,
      });
      // Notify parent that message was processed
      if (onExternalMessageProcessed) {
        onExternalMessageProcessed();
      }
    }
  }, [externalMessage]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Debug logging for chat content height
    const chatContainer = messagesEndRef.current?.parentElement?.parentElement;
    if (chatContainer) {
      console.log("Chat content height:", chatContainer.scrollHeight);
    }
  }, [messages]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="h-full bg-white shadow-md border-l border-scripture-200 flex flex-col">
      {/* Header - Fixed Height */}
      <div className="flex-shrink-0 p-3 lg:p-4 border-b border-scripture-200 bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBookmarks(!showBookmarks)}
              className="text-xs border-blue-300 text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1"
            >
              <Bookmark className="h-3 w-3 mr-1" />
              Bookmarks ({bookmarks.length})
            </Button>
            {messages && messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  queryClient.setQueryData([`/api/chat/${sessionId}`], []);
                  toast({
                    title: "Chat Cleared",
                    description: "Chat history has been cleared",
                  });
                }}
                className="text-xs border-red-300 text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear History
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-scripture-600">
          {context.religion ? 
            (context.book ? 
              `Ask questions about ${context.religion === 'quran' ? 'Quran -' : ''} ${context.book}${context.religion === 'quran' ? ` (Chapter ${getQuranChapterNumber(context.book)})` : ` Chapter ${context.chapter}`}` :
              `Ask general questions about ${context.religion === 'quran' ? 'the Quran' : context.religion === 'bible' ? 'the Bible' : context.religion === 'torah' ? 'the Torah' : context.religion === 'hindu' ? 'the Bhagavad Gita' : 'Buddhist teachings'}`
            ) :
            ""
          }
        </p>
      </div>

      {/* Bookmarks Section - Fixed Height */}
      {showBookmarks && (
        <div className="flex-shrink-0 p-3 border-b border-scripture-200 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center">
              <BookmarkCheck className="w-4 h-4 mr-2 text-blue-600" />
              Bookmarked Responses
            </h3>
            <div className="flex items-center space-x-1">
              {bookmarks.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearBookmarks}
                  className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBookmarks(false)}
                className="text-gray-500 hover:text-gray-700 px-2 py-1"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="max-h-32 overflow-y-auto">
            {bookmarks.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">
                No bookmarks yet. Click the bookmark button next to AI responses to save them.
              </p>
            ) : (
              <div className="space-y-2">
                {bookmarks.map(bookmark => (
                  <div key={bookmark.id} className="p-2 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs text-gray-800 mb-1">
                          {bookmark.text.length > 80 ? 
                            `${bookmark.text.substring(0, 80)}...` : 
                            bookmark.text
                          }
                        </p>
                        <div className="text-xs text-gray-500">
                          {bookmark.context.religion} - {bookmark.context.book} Ch. {bookmark.context.chapter} • {formatTime(bookmark.timestamp.toISOString())}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBookmark(bookmark.id)}
                        className="text-red-500 hover:text-red-700 ml-2 h-5 w-5 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Messages - Scrollable Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-3">
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex space-x-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : messages && messages.length > 0 ? (
              messages.map((message: ChatMessage) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${
                    message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div className={`flex-1 max-w-[75%] ${
                    message.type === 'user' ? 'text-right' : 'text-left'
                  }`}>
                    <div className={`inline-block p-3 rounded-lg shadow-sm ${
                      message.type === 'user'
                        ? 'bg-gray-100 text-gray-800 border border-gray-200 rounded-br-sm'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
                    }`}>
                      {message.type === 'ai' && message.content.includes('From the Bible perspective:') ? (
                        // Multi-religious response formatting with clickable references
                        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {message.content.split('\n').map((line, index) => {
                            if (line.includes('**From the Bible perspective:**')) {
                              return (
                                <div key={index} className="mb-2">
                                  <div className="font-bold text-blue-700 border-t border-gray-200 pt-2">
                                    📖 Biblical Perspective
                                  </div>
                                  <ClickableMessage 
                                    content={line.replace('**From the Bible perspective:**', '').trim()}
                                    onScriptureClick={handleScriptureClick}
                                  />
                                </div>
                              );
                            }
                            if (line.includes('**From the Quran perspective:**')) {
                              return (
                                <div key={index} className="mb-2">
                                  <div className="font-bold text-green-700 border-t border-gray-200 pt-2">
                                    📜 Islamic Perspective
                                  </div>
                                  <ClickableMessage 
                                    content={line.replace('**From the Quran perspective:**', '').trim()}
                                    onScriptureClick={handleScriptureClick}
                                  />
                                </div>
                              );
                            }
                            if (line.includes('**From the Torah perspective:**')) {
                              return (
                                <div key={index} className="mb-2">
                                  <div className="font-bold text-purple-700 border-t border-gray-200 pt-2">
                                    ✡️ Jewish Perspective
                                  </div>
                                  <ClickableMessage 
                                    content={line.replace('**From the Torah perspective:**', '').trim()}
                                    onScriptureClick={handleScriptureClick}
                                  />
                                </div>
                              );
                            }
                            if (line.includes('**From the Bhagavad Gita perspective:**')) {
                              return (
                                <div key={index} className="mb-2">
                                  <div className="font-bold text-orange-700 border-t border-gray-200 pt-2">
                                    🕉️ Hindu Perspective
                                  </div>
                                  <ClickableMessage 
                                    content={line.replace('**From the Bhagavad Gita perspective:**', '').trim()}
                                    onScriptureClick={handleScriptureClick}
                                  />
                                </div>
                              );
                            }
                            if (line.includes('**From the Tripitaka perspective:**')) {
                              return (
                                <div key={index} className="mb-2">
                                  <div className="font-bold text-amber-700 border-t border-gray-200 pt-2">
                                    ☸️ Buddhist Perspective
                                  </div>
                                  <ClickableMessage 
                                    content={line.replace('**From the Tripitaka perspective:**', '').trim()}
                                    onScriptureClick={handleScriptureClick}
                                  />
                                </div>
                              );
                            }
                            if (line.trim() && !line.includes('**From the') && !line.includes('perspective:**')) {
                              return (
                                <ClickableMessage 
                                  key={index}
                                  content={line}
                                  onScriptureClick={handleScriptureClick}
                                />
                              );
                            }
                            return null;
                          })}
                        </div>
                      ) : (
                        // Regular response formatting with clickable scripture references
                        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          <ClickableMessage 
                            content={message.content}
                            onScriptureClick={handleScriptureClick}
                          />
                        </div>
                      )}
                    </div>
                    <div className={`flex items-center mt-1 ${
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    }`}>
                      <div className="text-xs text-scripture-500">
                        {formatTime(message.timestamp?.toString() || new Date().toISOString())}
                      </div>
                      {message.type !== 'user' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => bookmarkMessage(message)}
                          className="ml-2 h-6 w-6 p-0 text-gray-400 hover:text-yellow-500 transition-colors"
                          title="Bookmark this response"
                        >
                          <Bookmark className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-scripture-600">
                <Bot className="h-12 w-12 mx-auto mb-4 text-scripture-400" />
                <p className="text-sm">
                  {context.religion ? 
                    (context.book ? 
                      `Hello! I'm here to help you explore and understand the scriptures. Ask me anything about ${context.religion === 'quran' ? 'this surah' : 'this passage'}.` :
                      `Hello! I'm your AI Scripture Guide for ${context.religion === 'quran' ? 'the Quran' : context.religion === 'bible' ? 'the Bible' : context.religion === 'torah' ? 'the Torah' : context.religion === 'hindu' ? 'the Bhagavad Gita' : 'Buddhist teachings'}. Ask me general questions about this religious tradition or select a specific book for detailed study.`
                    ) :
                    "Welcome! I'm your AI Scripture Guide. Select a religious tradition to start our conversation about sacred writings."
                  }
                </p>
              </div>
            )}
            
            {/* Loading indicator */}
            {sendMessageMutation.isPending && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-scripture-200 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-scripture-700" />
                </div>
                <div className="bg-scripture-100 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-scripture-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-scripture-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                    <div className="w-2 h-2 bg-scripture-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Chat Input - Fixed at Bottom */}
      <div className="flex-shrink-0 p-3 border-t border-scripture-200 bg-gray-50">
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder={context.religion ? 
              (context.book ? 
                `Ask about ${context.religion === 'quran' ? 'this surah' : 'this passage'}...` :
                `Ask general questions about ${context.religion === 'quran' ? 'the Quran' : context.religion === 'bible' ? 'the Bible' : context.religion === 'torah' ? 'the Torah' : context.religion === 'hindu' ? 'the Bhagavad Gita' : 'Buddhist teachings'}...`
              ) :
              "Ask a general question or select a religious tradition for context..."
            }
            className="flex-1 text-sm"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              console.log("Chat input state:", { selectedBook: context.book, inputValue: e.target.value });
            }}
            onKeyPress={handleKeyPress}
            disabled={sendMessageMutation.isPending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-gray-400 mt-2">
          AI responses use authentic religious texts from verified APIs. Click the bookmark icon to save helpful responses.
        </p>
      </div>
    </div>
  );
}
