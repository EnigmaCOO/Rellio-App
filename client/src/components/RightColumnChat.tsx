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
  Zap,
  Play,
  Star,
  AlertCircle,
  RefreshCw
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
}

// Component for clickable messages with bookmark functionality
function ClickableMessage({ 
  content, 
  showBookmark = false, 
  onBookmark 
}: { 
  content: string; 
  showBookmark?: boolean; 
  onBookmark?: () => void; 
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayContent = isExpanded ? content : (content.length > 300 ? content.slice(0, 300) + '...' : content);
  const needsTruncation = content.length > 300;

  return (
    <div className="space-y-2">
      <p 
        className="text-gray-800 text-sm leading-relaxed cursor-default select-text"
        style={{ lineHeight: '1.6' }}
      >
        {displayContent}
      </p>
      
      <div className="flex items-center justify-between">
        {needsTruncation && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-teal-600 hover:text-teal-800 hover:bg-teal-50"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Show Less' : 'Read More'}
          </Button>
        )}
        
        {showBookmark && onBookmark && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-gray-500 hover:text-teal-600 hover:bg-teal-50"
            onClick={onBookmark}
          >
            <Bookmark className="w-3 h-3 mr-1" />
            Bookmark
          </Button>
        )}
      </div>
    </div>
  );
}

export function RightColumnChat({ 
  sessionId, 
  context, 
  externalMessage, 
  onExternalMessageProcessed,
  onCopyOperation 
}: RightColumnChatProps) {

  const messageEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Enhanced Response Renderer for Multi-Religious Content
  const renderEnhancedResponse = (content: string) => {
    // Check if this is a multi-religious response by looking for perspective indicators
    const hasMultiReligious = content.includes('Biblical perspective') || 
                              content.includes('Quranic perspective') ||
                              content.includes('Torah perspective') ||
                              content.includes('Hindu perspective') ||
                              content.includes('Buddhist perspective');

    if (!hasMultiReligious) {
      // Regular response with badges
      return (
        <div>
          <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap mb-3">
            {content}
          </div>
          
          {/* Multi-Religious Perspective Badges */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-full">
              <Eye className="w-3 h-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Biblical</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded-full">
              <Heart className="w-3 h-3 text-green-600" />
              <span className="text-xs font-medium text-green-700">Islamic</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 border border-orange-200 rounded-full">
              <Zap className="w-3 h-3 text-orange-600" />
              <span className="text-xs font-medium text-orange-700">Hindu</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 border border-purple-200 rounded-full">
              <Play className="w-3 h-3 text-purple-600" />
              <span className="text-xs font-medium text-purple-700">Buddhist</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-full">
              <Star className="w-3 h-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Torah</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-indigo-50 border border-indigo-200 rounded-full">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span className="text-xs font-medium text-indigo-700">Mystical</span>
            </div>
          </div>
        </div>
      );
    }

    // Parse multi-religious response
    const lines = content.split('\n');
    let currentSection = '';
    let introduction = '';
    let conclusion = '';
    const perspectives: { [key: string]: string } = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.includes('**Biblical perspective:**')) {
        currentSection = 'Biblical';
        perspectives[currentSection] = trimmed.replace('**Biblical perspective:**', '').trim();
      } else if (trimmed.includes('**Quranic perspective:**')) {
        currentSection = 'Islamic';
        perspectives[currentSection] = trimmed.replace('**Quranic perspective:**', '').trim();
      } else if (trimmed.includes('**Torah perspective:**')) {
        currentSection = 'Torah';
        perspectives[currentSection] = trimmed.replace('**Torah perspective:**', '').trim();
      } else if (trimmed.includes('**Hindu perspective:**')) {
        currentSection = 'Hindu';
        perspectives[currentSection] = trimmed.replace('**Hindu perspective:**', '').trim();
      } else if (trimmed.includes('**Buddhist perspective:**')) {
        currentSection = 'Buddhist';
        perspectives[currentSection] = trimmed.replace('**Buddhist perspective:**', '').trim();
      } else if (currentSection && trimmed) {
        perspectives[currentSection] += ' ' + trimmed;
      } else if (!currentSection && trimmed && !trimmed.includes('conclusion') && !trimmed.includes('In conclusion')) {
        introduction += trimmed + ' ';
      } else if (trimmed.includes('conclusion') || trimmed.includes('In conclusion')) {
        conclusion += trimmed + ' ';
        currentSection = ''; // Stop adding to perspectives
      } else if (!currentSection && conclusion) {
        conclusion += trimmed + ' ';
      }
    }

    return (
      <div className="space-y-3">
        {/* Introduction */}
        {introduction && (
          <div className="text-gray-800 text-sm leading-relaxed">
            {introduction.trim()}
          </div>
        )}

        {/* Religious Perspectives with colored badges */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-full">
            <Eye className="w-3 h-3 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Biblical</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded-full">
            <Heart className="w-3 h-3 text-green-600" />
            <span className="text-xs font-medium text-green-700">Islamic</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 border border-orange-200 rounded-full">
            <Zap className="w-3 h-3 text-orange-600" />
            <span className="text-xs font-medium text-orange-700">Hindu</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 border border-purple-200 rounded-full">
            <Play className="w-3 h-3 text-purple-600" />
            <span className="text-xs font-medium text-purple-700">Buddhist</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-full">
            <Star className="w-3 h-3 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Torah</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-indigo-50 border border-indigo-200 rounded-full">
            <Sparkles className="w-3 h-3 text-indigo-600" />
            <span className="text-xs font-medium text-indigo-700">Mystical</span>
          </div>
        </div>

        {/* Conclusion */}
        {conclusion && (
          <div className="text-gray-800 text-sm leading-relaxed">
            {conclusion.trim()}
          </div>
        )}
      </div>
    );
  };


  const queryClient = useQueryClient();
  
  // Enhanced UI states
  const [isStreaming, setIsStreaming] = useState(false);
  const [expandedPerspectives, setExpandedPerspectives] = useState(false);
  const [interruptedMessages, setInterruptedMessages] = useState<Set<string>>(new Set());

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/chat/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      return response.json();
    },
    enabled: !!sessionId
  });

  // Debug logging
  useEffect(() => {
    console.log('Messages data:', messages);
    console.log('Session ID:', sessionId);
    console.log('Is loading:', isLoading);
  }, [messages, sessionId, isLoading]);

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      setIsStreaming(true);
      try {
        const response = await fetch(`/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            message,
            context: {
              religion: context.religion || null,
              book: context.book || null,
              chapter: context.chapter || null
            }
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      } finally {
        setIsStreaming(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat', sessionId] });
    },
    onError: (error: any) => {
      setIsStreaming(false);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    }
  });

  // Handle external message processing
  useEffect(() => {
    if (externalMessage && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(externalMessage);
      onExternalMessageProcessed?.();
    }
  }, [externalMessage, sendMessageMutation, onExternalMessageProcessed]);

  // Enhanced bookmarking system with localStorage
  const [bookmarks, setBookmarks] = useState<Array<{
    id: string;
    content: string;
    context: { religion: string; book: string; chapter: number };
    timestamp: number;
  }>>([]);

  useEffect(() => {
    const saved = localStorage.getItem('rellio-bookmarks');
    if (saved) {
      setBookmarks(JSON.parse(saved));
    }
  }, []);

  const handleBookmark = (content: string, contextInfo: { religion: string; book: string; chapter: number }) => {
    const newBookmark = {
      id: Date.now().toString(),
      content,
      context: contextInfo,
      timestamp: Date.now()
    };
    
    const updated = [...bookmarks, newBookmark];
    setBookmarks(updated);
    localStorage.setItem('rellio-bookmarks', JSON.stringify(updated));
    
    toast({
      title: "Bookmarked!",
      description: "AI response saved to your bookmarks",
      variant: "default"
    });
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get appropriate quick suggestions based on context
  const getQuickSuggestions = () => {
    if (!context.religion && !context.book) {
      return [
        "What is the meaning of love?",
        "How can I find inner peace?",
        "What is the purpose of life?",
        "How should I handle suffering?"
      ];
    }
    
    if (context.religion && context.book) {
      return [
        `Explain this chapter's main message`,
        `What does this teach about faith?`,
        `How does this apply to modern life?`,
        `Compare with other religious views`
      ];
    }
    
    return [
      "Ask a spiritual question",
      "Explore religious teachings",
      "Compare different faiths",
      "Seek wisdom and guidance"
    ];
  };





  return (
    <div className="h-full flex flex-col bg-white">
      {/* Enhanced Header with Gradient Styling */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-cyan-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg shadow-sm">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-900">AI Scripture Guide</h3>
              <p className="text-xs text-gray-500">
                {context.religion && context.book 
                  ? `${context.religion} - ${context.book}` 
                  : "Multi-religious AI assistant"
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              {messages.length} messages
            </Badge>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {isLoading ? (
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
              <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-teal-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Welcome to AI Scripture Guide</h4>
              <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
                {context.religion && context.book 
                  ? `Ask questions about ${context.religion} - ${context.book}` 
                  : "Explore spiritual wisdom from multiple religious traditions"
                }
              </p>
              
              <div className="space-y-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Quick suggestions</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {getQuickSuggestions().map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 border-teal-200 hover:border-teal-400 hover:bg-teal-50 hover:shadow-md transition-all duration-200"
                      onClick={() => {
                        if (suggestion && !sendMessageMutation.isPending && !isStreaming) {
                          sendMessageMutation.mutate(suggestion.trim());
                        }
                      }}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message, index) => {
              const messageId = `${message.type}_${index}_${message.timestamp || Date.now()}`;
              const isInterrupted = interruptedMessages.has(messageId);
              
              return (
                <div key={index} className="flex gap-3 animate-fadeIn" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.type === 'user' 
                      ? 'bg-gray-200' 
                      : isInterrupted 
                        ? 'bg-gradient-to-br from-red-400 to-orange-500 shadow-lg animate-pulse' 
                        : 'bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="w-4 h-4 text-gray-600" />
                    ) : isInterrupted ? (
                      <AlertCircle className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className={`flex-1 relative ${
                    message.type === 'user' 
                      ? 'bg-gray-50 rounded-lg p-3' 
                      : isInterrupted
                        ? 'bg-red-50 border border-red-200 rounded-lg p-3 shadow-sm opacity-70'
                        : 'bg-white border border-gray-100 rounded-lg p-3 shadow-sm'
                  }`}>
                    {/* Interrupted message overlay */}
                    {isInterrupted && (
                      <div className="absolute top-2 right-2 flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">Interrupted</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs border-red-300 text-red-700 hover:bg-red-100"
                          onClick={() => {
                            // Resume functionality - resend the original question
                            const lastUserMessage = messages.filter(m => m.type === 'user').pop();
                            if (lastUserMessage) {
                              sendMessageMutation.mutate(lastUserMessage.content);
                              setInterruptedMessages(prev => {
                                const newSet = new Set(Array.from(prev));
                                newSet.delete(messageId);
                                return newSet;
                              });
                            }
                          }}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Resume
                        </Button>
                      </div>
                    )}
                    
                    {message.type === 'user' ? (
                      <p className="text-gray-800 text-sm leading-relaxed">{message.content}</p>
                    ) : (
                      <div className="space-y-3">
                        {/* Enhanced Multi-Religious Response Display */}
                        {renderEnhancedResponse(message.content)}
                        
                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-gray-500 hover:text-teal-600 hover:bg-teal-50"
                            onClick={() => {
                              handleBookmark(message.content, {
                                religion: context.religion || '',
                                book: context.book || '',
                                chapter: context.chapter || 0
                              });
                            }}
                          >
                            <Bookmark className="w-3 h-3 mr-1" />
                            Bookmark
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
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

      {/* Simple Text Input - Restored Original */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const message = formData.get('message') as string;
          if (message.trim() && !sendMessageMutation.isPending && !isStreaming) {
            sendMessageMutation.mutate(message.trim());
            e.currentTarget.reset();
          }
        }} className="flex gap-2">
          <Input
            name="message"
            placeholder={
              context.religion && context.book 
                ? `Ask questions about ${context.religion} - ${context.book}...` 
                : "Ask spiritual questions..."
            }
            disabled={sendMessageMutation.isPending || isStreaming}
            className="flex-1 text-sm"
          />
          <Button 
            type="submit" 
            size="sm"
            disabled={sendMessageMutation.isPending || isStreaming}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}