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
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Religion, ChatMessage } from "@shared/schema";

import { HistoryPanel } from "./HistoryPanel";
import { CompareGrid } from "./CompareGrid";

interface ClickableMessageProps {
  content: string;
  onScriptureClick: (religion: Religion, book: string, chapter: number, verse?: number) => void;
}

interface IlluminVerseChatProps {
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

function ClickableMessage({ content, onScriptureClick }: ClickableMessageProps) {
  const [processedContent, setProcessedContent] = useState<string>("");

  useEffect(() => {
    const parseScriptureReferences = (text: string) => {
      const biblePattern = /\b(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Songs|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation)\s+(?:Chapter\s+)?(\d+)(?::(\d+))?/gi;
      const quranPattern = /\b(Quran)\s+(\d+):(\d+)(?:[-–]\d+)?/gi;
      const hinduPattern = /\b(Bhagavad\s+Gita)\s+(\d+):(\d+)(?:[-–]\d+)?/gi;

      let processedText = text;
      processedText = processedText.replace(biblePattern, (match, book, chapter, verse) => {
        return `<span class="scripture-link cursor-pointer text-gray-700 hover:underline font-medium" data-religion="bible" data-book="${book}" data-chapter="${chapter}" data-verse="${verse || ''}">${match}</span>`;
      });
      processedText = processedText.replace(quranPattern, (match, _source, chapter, verse) => {
        return `<span class="scripture-link cursor-pointer text-gray-700 hover:underline font-medium" data-religion="quran" data-book="Quran" data-chapter="${chapter}" data-verse="${verse}">${match}</span>`;
      });
      processedText = processedText.replace(hinduPattern, (match, book, chapter, verse) => {
        return `<span class="scripture-link cursor-pointer text-gray-700 hover:underline font-medium" data-religion="hindu" data-book="${book}" data-chapter="${chapter}" data-verse="${verse}">${match}</span>`;
      });

      return processedText;
    };

    setProcessedContent(parseScriptureReferences(content));
  }, [content]);

  useEffect(() => {
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
      className="prose prose-sm max-w-none prose-invert"
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}

export function IlluminVerseChat({
  sessionId,
  context,
  externalMessage = "",
  onExternalMessageProcessed,
  onCopyOperation,
  onNavigateToVerse
}: IlluminVerseChatProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [newMessage, setNewMessage] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [bookmarkCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const quickSuggestions = [
    "Compare with Genesis 1:1",
    "Define 'mercy'",
    "Random Topic",
    "What does this mean?",
    "Historical context"
  ];

  const { data: messages, isLoading } = useQuery<ChatMessage[]>({
    queryKey: [`/api/chat/${sessionId}`],
    staleTime: 30 * 1000,
  });

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

  useEffect(() => {
    if (externalMessage && externalMessage.trim()) {
      setNewMessage(externalMessage);
      handleSendMessage(externalMessage);
      onExternalMessageProcessed?.();
    }
  }, [externalMessage]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = (messageOverride?: string) => {
    const messageToSend = messageOverride || newMessage;
    if (!messageToSend.trim()) return;

    const isGeneralQuestion = !context.book || context.book === "";
    const input = messageToSend.toLowerCase();
    const hasSpecificVerseReference = input.includes('verse') || input.includes('chapter');

    if (isGeneralQuestion && !hasSpecificVerseReference) {
      sendMessageMutation.mutate({
        message: messageToSend,
        sessionId,
        context: { ...context, multiReligiousPerspective: true },
      });
    } else {
      sendMessageMutation.mutate({ message: messageToSend, sessionId, context });
    }

    if (!messageOverride) setNewMessage("");
  };

  const handleScriptureClick = (religion: Religion, book: string, chapter: number, verse?: number) => {
    onNavigateToVerse?.(religion, book, chapter, verse);
  };

  const handleQuickSuggestion = (suggestion: string) => {
    setNewMessage(suggestion);
    handleSendMessage(suggestion);
  };

  const extractPerspectives = (content: string) => {
    const perspectives = [];
    if (content.includes("Bible") || content.includes("Biblical")) perspectives.push("Biblical");
    if (content.includes("Quran") || content.includes("Islamic")) perspectives.push("Islamic");
    if (content.includes("Torah") || content.includes("Jewish")) perspectives.push("Jewish");
    if (content.includes("Bhagavad") || content.includes("Hindu")) perspectives.push("Hindu");
    if (content.includes("Buddhism") || content.includes("Buddhist")) perspectives.push("Buddhist");
    return perspectives;
  };

  return (
    <Card className={`rounded-xl shadow-sm overflow-hidden transition-all duration-300 border border-gray-200 ${
      isExpanded ? 'h-[60vh]' : 'h-[30vh]'
    } flex flex-col`}>
      {/* Sticky Header */}
      <div className="p-4 border-b border-gray-100 flex-shrink-0 sticky top-0 z-10" style={{ background: '#ffffff' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Aura Archivist</h2>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen(true)}
              className="border-gray-200 hover:bg-gray-50"
              style={{ color: 'var(--text-secondary)' }}
            >
              <History className="h-4 w-4 mr-1" />
              History
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompareMode(!compareMode)}
              className={`border-gray-200 hover:bg-gray-50 ${compareMode ? 'bg-gray-100 border-gray-400' : ''}`}
              style={{ color: 'var(--text-secondary)' }}
            >
              <Grid3X3 className="h-4 w-4 mr-1" />
              Compare
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="border-gray-200 hover:bg-gray-50"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Bookmark className="h-4 w-4 mr-1" />
              {bookmarkCount}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="border-gray-200 hover:bg-gray-50"
              style={{ color: 'var(--text-secondary)' }}
              title={isExpanded ? "Collapse Chat" : "Expand Chat"}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Compare Grid */}
      {compareMode && (
        <CompareGrid isActive={compareMode} onClose={() => setCompareMode(false)} />
      )}

      {/* Conversation Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="h-full p-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : messages && messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="flex justify-start animate-in fade-in duration-200"
                >
                  <div className={`flex max-w-[85%] gap-3 ${message.type !== 'user' ? 'w-full' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.type === 'user'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {message.type === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>

                    <div className="flex-1">
                      <div className={`p-3 rounded-lg text-sm ${
                        message.type === 'user'
                          ? 'bg-gray-50 border border-gray-200'
                          : 'bg-gray-50 border border-gray-100'
                      }`} style={{ color: 'var(--text-primary)' }}>
                        {message.type === 'user' ? (
                          <p>{message.content}</p>
                        ) : (
                          <ClickableMessage
                            content={message.content}
                            onScriptureClick={handleScriptureClick}
                          />
                        )}
                      </div>

                      {message.type === 'ai' && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {extractPerspectives(message.content).map((perspective) => (
                            <Badge
                              key={perspective}
                              variant="secondary"
                              className="text-xs bg-gray-100 text-gray-600 border-gray-300"
                            >
                              {perspective}
                            </Badge>
                          ))}
                          {extractPerspectives(message.content).length > 0 && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-gray-100 border-gray-200"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              More...
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Welcome to Aura Archivist</p>
              <p className="text-sm">Ask questions about scriptures or explore comparative religious insights.</p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Sticky Footer */}
      <div className="flex-shrink-0 border-t border-gray-100" style={{ background: '#ffffff' }}>
        {/* Quick Suggestions */}
        <div className="px-4 py-2 border-b border-gray-100">
          <div className="flex flex-wrap gap-2">
            {quickSuggestions.map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                onClick={() => handleQuickSuggestion(suggestion)}
                className="text-xs border-gray-300 hover:bg-gray-100 text-gray-600"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Ask a new question..."
              className="flex-1 h-10 rounded-lg border-gray-200 bg-white focus:border-gray-400 focus:ring-gray-200"
              style={{ color: 'var(--text-primary)' }}
              disabled={sendMessageMutation.isPending}
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              className="h-10 w-10 rounded-lg flex items-center justify-center transition-all hover:scale-105"
              style={{ background: '#0a0a0a', color: '#ffffff' }}
            >
              {sendMessageMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        sessionId={sessionId}
      />
    </Card>
  );
}
