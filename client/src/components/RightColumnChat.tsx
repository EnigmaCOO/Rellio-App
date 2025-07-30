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
  RefreshCw,
  Mic,
  MicOff,
  Square,
  Pause,
  Settings,
  ChevronUp,
  ChevronDown,
  Volume2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Religion, ChatMessage } from "@shared/schema";
import { AudioPlaybackButton } from "@/components/chat/AudioPlaybackButton";
import { VoiceInputControls } from "@/components/chat/VoiceInputControls";
import { ScholarPersonaSelector, type ScholarPersona, scholarPersonas } from "@/components/chat/ScholarPersonas";
import { ChatHistoryManager } from "@/components/chat/ChatHistoryManager";
import { MandalaOverlay } from "@/components/chat/MandalaOverlay";
import { cn } from "@/lib/utils";

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
  onCopyOperation,
  onNavigateToVerse 
}: RightColumnChatProps) {

  const messageEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Enhanced State Management
  const [currentMessage, setCurrentMessage] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<ScholarPersona | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [isInterrupted, setIsInterrupted] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [isStreaming, setIsStreaming] = useState(false);

  // Enhanced Response Renderer with Clickable Perspectives
  const [expandedPerspective, setExpandedPerspective] = useState<string | null>(null);

  const parsePerspectiveContent = (content: string, perspectiveName: string) => {
    const lines = content.split('\n');
    let perspectiveContent = '';
    let foundPerspective = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.includes(`${perspectiveName} perspective:`)) {
        foundPerspective = true;
        // Extract content after the perspective header
        perspectiveContent = trimmed.replace(new RegExp(`^-\\s*\\*\\*${perspectiveName} perspective:\\*\\*`), '').trim();
        continue;
      }
      
      if (foundPerspective) {
        // Stop if we hit another perspective or conclusion
        if (trimmed.includes('perspective:') || trimmed.toLowerCase().includes('in conclusion')) {
          break;
        }
        if (trimmed.length > 0) {
          perspectiveContent += ' ' + trimmed;
        }
      }
    }
    
    return perspectiveContent.trim();
  };

  const extractReferences = (text: string) => {
    // Extract biblical/scripture references like "Philippians 4:6-7", "Surah Ar-Ra'd (13:28)", etc.
    const referencePattern = /(\w+\s+\d+:\d+(?:-\d+)?|\w+\s+\d+,\s+Verse\s+\d+|Surah\s+[\w-]+\s+\(\d+:\d+\)|Chapter\s+\d+,\s+Verse\s+\d+)/g;
    const references = text.match(referencePattern) || [];
    return references;
  };

  const renderEnhancedResponse = (content: string) => {
    // Check if this is a multi-religious response
    const hasMultiReligious = content.includes('Biblical perspective') || 
                              content.includes('Quranic perspective') ||
                              content.includes('Torah perspective') ||
                              content.includes('Hindu perspective') ||
                              content.includes('Buddhist perspective');

    if (!hasMultiReligious) {
      return (
        <div>
          <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap mb-3">
            {content}
          </div>
        </div>
      );
    }

    // Parse multi-religious response and extract introduction
    const lines = content.split('\n');
    let introduction = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.includes('perspective:') && !trimmed.startsWith('-') && !trimmed.toLowerCase().includes('conclusion') && trimmed.length > 0) {
        introduction += trimmed + ' ';
      }
      if (trimmed.includes('perspective:')) break;
    }

    const perspectives = [
      { key: 'Biblical', name: 'Biblical', icon: Eye, bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-700', iconColor: 'text-blue-600' },
      { key: 'Quranic', name: 'Islamic', icon: Heart, bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-700', iconColor: 'text-green-600' },
      { key: 'Hindu', name: 'Hindu', icon: Zap, bgColor: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-700', iconColor: 'text-orange-600' },
      { key: 'Buddhist', name: 'Buddhist', icon: Play, bgColor: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-700', iconColor: 'text-purple-600' },
      { key: 'Torah', name: 'Torah', icon: Star, bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-700', iconColor: 'text-blue-600' },
    ];
    
    return (
      <div className="space-y-3">
        {/* Clean introduction text */}
        <div className="text-gray-800 text-sm leading-relaxed">
          {introduction.trim()}
        </div>

        {/* Clickable colored perspective badges */}
        <div className="flex flex-wrap gap-2">
          {perspectives.map(({ key, name, icon: Icon, bgColor, borderColor, textColor, iconColor }) => {
            const perspectiveContent = parsePerspectiveContent(content, key);
            if (!perspectiveContent) return null;
            
            return (
              <button
                key={key}
                onClick={() => setExpandedPerspective(expandedPerspective === key ? null : key)}
                className={`flex items-center gap-1 px-2 py-1 ${bgColor} border ${borderColor} rounded-full hover:shadow-md transition-all duration-200 cursor-pointer ${
                  expandedPerspective === key ? 'ring-2 ring-offset-1 ring-blue-500' : ''
                }`}
              >
                <Icon className={`w-3 h-3 ${iconColor}`} />
                <span className={`text-xs font-medium ${textColor}`}>{name}</span>
              </button>
            );
          })}
        </div>

        {/* Expanded perspective content */}
        {expandedPerspective && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              {(() => {
                const perspective = perspectives.find(p => p.key === expandedPerspective);
                if (!perspective) return null;
                const Icon = perspective.icon;
                return (
                  <>
                    <Icon className={`w-4 h-4 ${perspective.iconColor}`} />
                    <h4 className={`font-medium ${perspective.textColor}`}>{perspective.name} Perspective</h4>
                  </>
                );
              })()}
            </div>
            
            {(() => {
              const perspectiveContent = parsePerspectiveContent(content, expandedPerspective);
              const references = extractReferences(perspectiveContent);
              
              return (
                <div className="space-y-3">
                  <div className="text-gray-800 text-sm leading-relaxed">
                    {perspectiveContent}
                  </div>
                  
                  {references.length > 0 && (
                    <div className="border-t border-gray-200 pt-3">
                      <h5 className="text-xs font-medium text-gray-600 mb-2">References:</h5>
                      <div className="flex flex-wrap gap-2">
                        {references.map((ref, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 bg-white border border-gray-300 rounded-md text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
                          >
                            {ref}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };


  const queryClient = useQueryClient();
  
  // Enhanced UI states  
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
              <h3 className="font-semibold text-sm text-gray-900">Aura Archivist</h3>
              <p className="text-xs text-gray-500">Your spiritual guide</p>
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
              <h4 className="font-medium text-gray-900 mb-2">Welcome to Aura Archivist</h4>
              <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
                Your spiritual guide for exploring wisdom from multiple religious traditions
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
                          <AudioPlaybackButton 
                            text={message.content}
                            className="h-6 px-2 text-xs text-gray-500 hover:text-teal-600 hover:bg-teal-50"
                            size="sm"
                          />
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
            placeholder="Ask about scripture..."
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