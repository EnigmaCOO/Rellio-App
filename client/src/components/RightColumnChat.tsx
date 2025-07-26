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
  BookOpen
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Religion, ChatMessage } from "@shared/schema";

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
  const [processedContent, setProcessedContent] = useState<string>("");

  useEffect(() => {
    // Parse scripture references and make them clickable
    const parseScriptureReferences = (text: string) => {
      // Bible references
      const biblePattern = /\b(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Songs|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation)\s+(?:Chapter\s+)?(\d+)(?::(\d+))?/gi;
      
      // Quran references
      const quranPattern = /\b(Quran)\s+(\d+):(\d+)(?:[-–]\d+)?/gi;
      
      // Hindu references
      const hinduPattern = /\b(Bhagavad\s+Gita)\s+(\d+):(\d+)(?:[-–]\d+)?/gi;
      
      let processedText = text;
      
      // Replace patterns with clickable spans
      processedText = processedText.replace(biblePattern, (match, book, chapter, verse) => {
        return `<span class="scripture-link cursor-pointer text-blue-600 hover:text-blue-800 hover:underline font-medium bg-blue-50 px-1 rounded" data-religion="bible" data-book="${book}" data-chapter="${chapter}" data-verse="${verse || ''}">${match}</span>`;
      });
      
      processedText = processedText.replace(quranPattern, (match, source, chapter, verse) => {
        return `<span class="scripture-link cursor-pointer text-blue-600 hover:text-blue-800 hover:underline font-medium bg-blue-50 px-1 rounded" data-religion="quran" data-book="Quran" data-chapter="${chapter}" data-verse="${verse}">${match}</span>`;
      });
      
      processedText = processedText.replace(hinduPattern, (match, book, chapter, verse) => {
        return `<span class="scripture-link cursor-pointer text-blue-600 hover:text-blue-800 hover:underline font-medium bg-blue-50 px-1 rounded" data-religion="hindu" data-book="${book}" data-chapter="${chapter}" data-verse="${verse}">${match}</span>`;
      });
      
      return processedText;
    };

    setProcessedContent(parseScriptureReferences(content));
  }, [content]);

  useEffect(() => {
    // Add click listeners to scripture links
    const handleScriptureClick = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('scripture-link')) {
        const religion = target.dataset.religion as Religion;
        const book = target.dataset.book || '';
        const chapter = parseInt(target.dataset.chapter || '1', 10);
        const verse = target.dataset.verse ? parseInt(target.dataset.verse, 10) : undefined;
        
        onScriptureClick(religion, book, chapter, verse);
      }
    };

    document.addEventListener('click', handleScriptureClick);
    return () => document.removeEventListener('click', handleScriptureClick);
  }, [onScriptureClick]);

  return (
    <div 
      className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
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
      } : undefined;
      
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
    <div className="h-full flex flex-col bg-white">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-md">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Aura Archivist</h3>
              <p className="text-xs text-gray-500">
                {context.religion && context.book 
                  ? `${context.book} ${context.chapter}` 
                  : 'Your spiritual guide'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <Badge variant="secondary" className="text-xs">
              <History className="w-3 h-3 mr-1" />
              {messages.length}
            </Badge>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4 py-2" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messagesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3">
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
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-purple-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Welcome to Aura Archivist</h4>
              <p className="text-sm text-gray-500 mb-6">
                {context.religion && context.book 
                  ? `Ask questions about ${context.book}` 
                  : 'Start by asking a question about scripture'}
              </p>
              
              {/* Quick suggestions */}
              <div className="space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Quick suggestions</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {getQuickSuggestions().map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
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
              <div key={index} className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.type === 'user' 
                    ? 'bg-gray-200' 
                    : 'bg-gradient-to-br from-blue-500 to-purple-600'
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
                    : 'bg-white'
                }`}>
                  {message.type === 'user' ? (
                    <p className="text-gray-800 text-sm leading-relaxed">{message.content}</p>
                  ) : (
                    <div className="space-y-3">
                      <ClickableMessage 
                        content={message.content} 
                        onScriptureClick={handleNavigateToVerse}
                      />
                      {/* Perspective chips for AI responses */}
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI Insight
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          Just now
                        </Badge>
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

      {/* Sticky Input Area */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Ask about scripture..."
            className="flex-1 rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            disabled={sendMessageMutation.isPending || isStreaming}
          />
          <Button 
            type="submit" 
            size="sm" 
            disabled={!newMessage.trim() || sendMessageMutation.isPending || isStreaming}
            className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        
        {/* Quick suggestions below input */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
            {getQuickSuggestions().slice(0, 2).map((suggestion, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-gray-500 hover:text-gray-700"
                onClick={() => setNewMessage(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}