import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  Bot, 
  User, 
  History, 
  Grid3X3, 
  Bookmark,
  MessageCircle,
  Sparkles,
  Clock,
  BookOpen,
  Flame,
  Scale,
  Brain,
  Heart,
  Eye,
  Zap
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Religion, ChatMessage } from "@shared/schema";
import { VoiceInputButton } from "./chat/VoiceInputButton";
import { AudioPlaybackButton } from "./chat/AudioPlaybackButton";

interface RightColumnChatProps {
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

interface ClickableMessageProps {
  content: string;
  onScriptureClick: (religion: Religion, book: string, chapter: number, verse?: number) => void;
}

function ClickableMessage({ content, onScriptureClick }: ClickableMessageProps) {
  const [processedSections, setProcessedSections] = useState<Array<{
    type: 'intro' | 'perspective' | 'conclusion';
    religion?: string;
    title?: string;
    text: string;
    icon?: string;
    color?: string;
  }>>([]);

  useEffect(() => {
    // Check if this is a multi-religious response
    const isMultiReligious = content.includes('From the Bible perspective:') || 
                            content.includes('From the Quran perspective:') ||
                            content.includes('From the Torah perspective:');

    if (isMultiReligious) {
      // Parse multi-religious response into structured sections
      const sections = [];
      const lines = content.split('\n').filter(line => line.trim());
      
      let currentSection = { type: 'intro' as const, text: '' };
      
      for (const line of lines) {
        // Check for religious perspective headers
        if (line.includes('From the Bible perspective:')) {
          if (currentSection.text) sections.push(currentSection);
          currentSection = {
            type: 'perspective' as const,
            religion: 'bible',
            title: 'Biblical Perspective',
            text: '',
            icon: '📖',
            color: 'blue'
          };
        } else if (line.includes('From the Quran perspective:')) {
          if (currentSection.text) sections.push(currentSection);
          currentSection = {
            type: 'perspective' as const,
            religion: 'quran',
            title: 'Islamic Perspective',
            text: '',
            icon: '🌙',
            color: 'emerald'
          };
        } else if (line.includes('From the Torah perspective:')) {
          if (currentSection.text) sections.push(currentSection);
          currentSection = {
            type: 'perspective' as const,
            religion: 'torah',
            title: 'Torah Perspective',
            text: '',
            icon: '✡️',
            color: 'amber'
          };
        } else if (line.includes('From the Bhagavad Gita perspective:')) {
          if (currentSection.text) sections.push(currentSection);
          currentSection = {
            type: 'perspective' as const,
            religion: 'hindu',
            title: 'Hindu Perspective',
            text: '',
            icon: '🕉️',
            color: 'orange'
          };
        } else if (line.includes('From the Tripitaka perspective:')) {
          if (currentSection.text) sections.push(currentSection);
          currentSection = {
            type: 'perspective' as const,
            religion: 'buddhist',
            title: 'Buddhist Perspective',
            text: '',
            icon: '☸️',
            color: 'purple'
          };
        } else if (line.toLowerCase().includes('in conclusion') || line.toLowerCase().includes('these religious traditions')) {
          if (currentSection.text) sections.push(currentSection);
          currentSection = {
            type: 'conclusion' as const,
            text: line
          };
        } else {
          // Add content to current section, clean up markdown
          const cleanLine = line.replace(/^\*\*.*?\*\*/g, '').replace(/^-\s+\*\*.*?\*\*/g, '').trim();
          if (cleanLine) {
            if (currentSection.text) currentSection.text += ' ';
            currentSection.text += cleanLine;
          }
        }
      }
      
      if (currentSection.text) sections.push(currentSection);
      setProcessedSections(sections);
    } else {
      // Single response - treat as simple content
      setProcessedSections([{ type: 'intro', text: content }]);
    }
  }, [content]);

  const processScriptureReferences = (text: string) => {
    // Enhanced scripture reference parsing
    const patterns = [
      { 
        regex: /\b(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Songs|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation)\s+(\d+):(\d+)(?:[-–](\d+))?/gi,
        religion: 'bible',
        color: 'blue'
      },
      { 
        regex: /\b(?:Quran|Surah)\s+(\d+):(\d+)(?:[-–](\d+))?/gi,
        religion: 'quran',
        color: 'emerald',
        bookName: 'Quran'
      },
      { 
        regex: /\b(Ecclesiastes|Bereshit|Shemot|Vayikra|Bamidbar|Devarim)\s+(\d+):(\d+)/gi,
        religion: 'torah',
        color: 'amber'
      },
      { 
        regex: /\b(Bhagavad\s+Gita)\s+(\d+)[\.:]\s*(\d+)/gi,
        religion: 'hindu',
        color: 'orange'
      },
      { 
        regex: /\b(Dhammapada|Tripitaka)\s+(\d+)/gi,
        religion: 'buddhist',
        color: 'purple'
      }
    ];

    let processedText = text;

    patterns.forEach(({ regex, religion, color, bookName }) => {
      processedText = processedText.replace(regex, (match, ...groups) => {
        const [book, chapter, verse] = groups.filter(g => g !== undefined);
        const finalBook = bookName || book;
        
        return `<span class="scripture-link cursor-pointer text-${color}-600 hover:text-${color}-800 hover:underline font-semibold bg-${color}-100 px-2 py-1 rounded-md border border-${color}-200 inline-block my-1" data-religion="${religion}" data-book="${finalBook}" data-chapter="${chapter}" data-verse="${verse || ''}">${match}</span>`;
      });
    });

    return processedText;
  };

  const handleScriptureClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains('scripture-link')) {
      const religion = target.dataset.religion as Religion;
      const book = target.dataset.book || '';
      const chapter = parseInt(target.dataset.chapter || '1', 10);
      const verse = target.dataset.verse ? parseInt(target.dataset.verse, 10) : undefined;
      
      onScriptureClick(religion, book, chapter, verse);
    }
  };

  // Check if this is a multi-religious response
  const isMultiReligious = processedSections.some(section => section.type === 'perspective');

  if (!isMultiReligious) {
    // Use simple formatting for single-perspective responses
    return (
      <div 
        className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
        onClick={handleScriptureClick}
        dangerouslySetInnerHTML={{ __html: processScriptureReferences(processedSections[0]?.text || content) }}
      />
    );
  }

  return (
    <div className="space-y-4" onClick={handleScriptureClick}>
      {processedSections.map((section, index) => (
        <div key={index}>
          {section.type === 'intro' && (
            <div className="text-gray-700 leading-relaxed mb-4 p-3 bg-gray-50 rounded-lg border-l-4 border-gray-300">
              <div dangerouslySetInnerHTML={{ __html: processScriptureReferences(section.text) }} />
            </div>
          )}
          
          {section.type === 'perspective' && (
            <div className={`border-l-4 border-${section.color}-400 bg-${section.color}-50 p-4 rounded-lg shadow-sm`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{section.icon}</span>
                <h4 className={`font-semibold text-${section.color}-800 text-sm`}>{section.title}</h4>
              </div>
              <div 
                className={`text-${section.color}-700 leading-relaxed text-sm`}
                dangerouslySetInnerHTML={{ __html: processScriptureReferences(section.text) }}
              />
            </div>
          )}
          
          {section.type === 'conclusion' && (
            <div className="text-gray-700 leading-relaxed mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-l-4 border-purple-400 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">💫</span>
                <h4 className="font-semibold text-purple-800 text-sm">Summary</h4>
              </div>
              <div 
                className="text-purple-700 text-sm"
                dangerouslySetInnerHTML={{ __html: processScriptureReferences(section.text) }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function RightColumnChat({
  sessionId,
  context,
  externalMessage = "",
  onExternalMessageProcessed,
  onCopyOperation,
  onNavigateToVerse
}: RightColumnChatProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  // Component state
  const [newMessage, setNewMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [userStreak, setUserStreak] = useState(3); // Mock streak data
  const [showHistory, setShowHistory] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(5); // Mock bookmark count
  const [expandedPerspectives, setExpandedPerspectives] = useState(false);

  // Load chat messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: [`/api/chat/${sessionId}`],
    staleTime: 0,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      setIsStreaming(true);
      
      // Prepare context to match schema requirements
      const requestContext = context.religion ? {
        religion: context.religion,
        book: context.book || null,
        chapter: context.chapter || null,
        multiReligiousPerspective: false
      } : {
        religion: null,
        book: null,
        chapter: null,
        multiReligiousPerspective: true
      };
      
      console.log('Sending chat request:', { message, sessionId, context: requestContext });
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, sessionId, context: requestContext })
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Chat API error:', errorData);
        throw new Error(errorData.error || 'Failed to send message');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/${sessionId}`] });
      setNewMessage("");
      setIsStreaming(false);
    },
    onError: (error) => {
      console.error('Chat error:', error);
      toast({
        title: "Error sending message",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      setIsStreaming(false);
    }
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle external messages
  useEffect(() => {
    if (externalMessage) {
      sendMessageMutation.mutate(externalMessage);
      onExternalMessageProcessed?.();
    }
  }, [externalMessage]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && !sendMessageMutation.isPending && !isStreaming) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const handleNavigateToVerse = (religion: Religion, book: string, chapter: number, verse?: number) => {
    onNavigateToVerse?.(religion, book, chapter, verse);
    toast({
      title: "Navigating to verse",
      description: `${book} ${chapter}${verse ? `:${verse}` : ''}`,
    });
  };

  // Quick suggestion chips
  const getQuickSuggestions = () => {
    if (!context.religion || !context.book) {
      return [
        "Tell me about today's verse",
        "Compare religious perspectives",
        "Explain a scripture concept",
      ];
    }
    return [
      `Explain ${context.book} ${context.chapter}`,
      "Historical context",
      "Modern application",
    ];
  };

  return (
    <div className="h-full flex flex-col bg-white relative">
      {/* Mystical gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 to-yellow-300/10 pointer-events-none z-0" />
      <div className="absolute inset-0 opacity-5 pointer-events-none z-0" style={{
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent('<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" stroke-width="0.5"/><circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="0.3"/><circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="0.2"/><path d="M30,50 Q50,30 70,50 Q50,70 30,50" fill="none" stroke="currentColor" stroke-width="0.3"/><path d="M50,30 Q70,50 50,70 Q30,50 50,30" fill="none" stroke="currentColor" stroke-width="0.3"/></svg>')}")`,
        backgroundSize: '200px 200px',
        backgroundRepeat: 'repeat'
      }} />
      
      {/* Enhanced Sticky Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 p-4 z-20">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            {/* Glowing teal logo */}
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center shadow-lg shadow-teal-500/30">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Aura Archivist</h3>
              <p className="text-xs italic text-gray-500">Your spiritual guide</p>
            </div>
          </div>
        </div>
        
        {/* Control Pills Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Streak Badge */}
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 hover:shadow-lg hover:shadow-green-500/20 transition-all duration-200 cursor-default">
            <Flame className="w-3 h-3 mr-1" />
            Day {userStreak} Streak 🔥
          </Badge>
          
          {/* History Toggle */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 hover:shadow-lg hover:shadow-blue-500/20 hover:border-blue-300 transition-all duration-200"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="w-3 h-3 mr-1" />
            History
          </Button>
          
          {/* Compare Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 hover:shadow-lg hover:shadow-purple-500/20 hover:border-purple-300 transition-all duration-200"
            onClick={() => setCompareMode(!compareMode)}
          >
            <Scale className="w-3 h-3 mr-1" />
            Compare
          </Button>
          
          {/* Bookmarks Count */}
          <Badge variant="outline" className="hover:shadow-lg hover:shadow-amber-500/20 transition-all duration-200 cursor-pointer">
            <Bookmark className="w-3 h-3 mr-1" />
            {bookmarkCount}
          </Badge>
          
          {/* Message Count */}
          <Badge variant="secondary" className="text-xs ml-auto">
            <MessageCircle className="w-3 h-3 mr-1" />
            {messages.length}
          </Badge>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4 py-2 relative z-10" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messagesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                <Sparkles className="w-8 h-8 text-teal-600" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-400/20 to-cyan-400/20 animate-pulse" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Welcome to Aura Archivist</h4>
              <p className="text-sm text-gray-500 mb-6">
                {context.religion && context.book 
                  ? `Ask questions about ${context.book}` 
                  : 'Start by asking a question about scripture'}
              </p>
              
              {/* Enhanced Quick suggestions */}
              <div className="space-y-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Quick suggestions</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {getQuickSuggestions().map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 border-teal-200 hover:border-teal-400 hover:bg-teal-50 hover:shadow-md transition-all duration-200"
                      onClick={() => setNewMessage(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className="flex gap-3 animate-fadeIn" style={{ animationDelay: `${index * 50}ms` }}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.type === 'user' 
                    ? 'bg-gray-200' 
                    : 'bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg'
                }`}>
                  {message.type === 'user' ? (
                    <User className="w-4 h-4 text-gray-600" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className={`flex-1 ${
                  message.type === 'user' 
                    ? 'bg-gray-50 rounded-lg p-3' 
                    : 'bg-white border border-gray-100 rounded-lg p-3 shadow-sm'
                }`}>
                  {message.type === 'user' ? (
                    <p className="text-gray-800 text-sm leading-relaxed">{message.content}</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <ClickableMessage 
                            content={message.content} 
                            onScriptureClick={handleNavigateToVerse}
                          />
                        </div>
                        {/* Audio playback button */}
                        <AudioPlaybackButton 
                          text={message.content}
                          className="flex-shrink-0"
                        />
                      </div>
                      
                      {/* Enhanced Perspective chips for AI responses */}
                      <div className="flex flex-wrap gap-1 items-center">
                        <Badge variant="outline" className="text-xs border-teal-200 text-teal-700 bg-teal-50">
                          <Eye className="w-3 h-3 mr-1" />
                          Biblical
                        </Badge>
                        <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-700 bg-emerald-50">
                          <Heart className="w-3 h-3 mr-1" />
                          Islamic
                        </Badge>
                        <Badge variant="outline" className="text-xs border-orange-200 text-orange-700 bg-orange-50">
                          <Brain className="w-3 h-3 mr-1" />
                          Hindu
                        </Badge>
                        <Badge variant="outline" className="text-xs border-purple-200 text-purple-700 bg-purple-50">
                          <Zap className="w-3 h-3 mr-1" />
                          Buddhist
                        </Badge>
                        {!expandedPerspectives && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
                            onClick={() => setExpandedPerspectives(true)}
                          >
                            More...
                          </Button>
                        )}
                        {expandedPerspectives && (
                          <>
                            <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
                              Torah
                            </Badge>
                            <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50">
                              Mystical
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-75" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150" />
                  </div>
                  <span className="text-sm text-gray-500">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messageEndRef} />
        </div>
      </ScrollArea>

      {/* Enhanced Quick Suggestions Row */}
      {messages.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 relative z-10">
          <div className="flex flex-wrap gap-2">
            {getQuickSuggestions().map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs h-7 border-teal-200 hover:border-teal-400 hover:bg-teal-50 hover:shadow-md transition-all duration-200"
                onClick={() => setNewMessage(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Sticky Input Area */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 relative z-10">
        <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ask about scripture..."
              className="rounded-full border-gray-300 focus:border-teal-500 focus:ring-teal-500 pr-12"
              disabled={sendMessageMutation.isPending || isStreaming}
            />
            {/* Voice input button inside input */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <VoiceInputButton
                onTranscription={(text) => {
                  console.log('📝 Voice transcription received:', text);
                  setNewMessage(text);
                }}
                disabled={sendMessageMutation.isPending || isStreaming}
              />
            </div>
          </div>
          
          <Button 
            type="submit" 
            size="sm" 
            disabled={!newMessage.trim() || sendMessageMutation.isPending || isStreaming}
            className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-4 h-10 shadow-lg transition-all duration-200 hover:shadow-xl"
          >
            {sendMessageMutation.isPending || isStreaming ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}