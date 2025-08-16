import { useState, useEffect, useRef, useCallback } from "react";
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
  Volume2,
  VolumeX,
  Loader
} from "lucide-react";
import type { Religion, ChatMessage } from "@shared/schema";
import { VoiceFirstInterface } from "./VoiceFirstInterface";
import { GrokStyleOrb } from "./GrokStyleOrb";
import { MandalaOverlay } from "./MandalaOverlay";
import { useConversationManager, type ConversationManagerReturn } from "./ConversationManager";
import { useElevenLabsStreaming } from "@/hooks/useElevenLabsStreaming";
import { cn } from "@/lib/utils";

interface InsightChatProps {
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
  className?: string;
}

// Typing effect component for AI responses
function TypingIndicator({ isTyping }: { isTyping: boolean }) {
  if (!isTyping) return null;
  
  return (
    <div className="flex items-center gap-1 py-2">
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" />
        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce delay-100" />
        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce delay-200" />
      </div>
      <span className="text-xs text-teal-600 ml-2">Aura Archivist is thinking...</span>
    </div>
  );
}

// Enhanced message component with voice playback
function EnhancedMessageBubble({ 
  message, 
  index, 
  onBookmark,
  onVoicePlay,
  isVoicePlaying,
  isVoiceLoading,
  onVoiceStop,
  toast,
  onVerseClick
}: { 
  message: ChatMessage;
  index: number;
  onBookmark: (content: string) => void;
  onVoicePlay: (text: string) => void;
  isVoicePlaying: boolean;
  isVoiceLoading: boolean;
  onVoiceStop: () => void;
  toast: (options: { title: string; description: string; duration?: number }) => void;
  onVerseClick: (reference: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const needsTruncation = message.content.length > 300;
  const displayContent = isExpanded ? message.content : (needsTruncation ? message.content.slice(0, 300) + '...' : message.content);

  const parsePerspectiveContent = (content: string, perspectiveName: string) => {
    const lines = content.split('\n');
    let perspectiveContent = '';
    let foundPerspective = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.includes(`${perspectiveName} perspective:`)) {
        foundPerspective = true;
        perspectiveContent = trimmed.replace(new RegExp(`^-\\s*\\*\\*${perspectiveName} perspective:\\*\\*`), '').trim();
        continue;
      }
      
      if (foundPerspective) {
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

  const renderEnhancedResponse = (content: string) => {
    // Check for XML-style perspective tags or traditional perspective patterns
    const hasXMLPerspectives = /<perspective>(Christianity|Islam|Judaism|Hinduism|Buddhism)<\/perspective>/.test(content);
    const hasTraditionalPerspectives = content.includes('Biblical perspective') || 
                                      content.includes('Quranic perspective') ||
                                      content.includes('Torah perspective') ||
                                      content.includes('Hindu perspective') ||
                                      content.includes('Buddhist perspective');

    const hasMultiReligious = hasXMLPerspectives || hasTraditionalPerspectives;

    if (!hasMultiReligious) {
      // Function to make verse references clickable in regular responses
      const makeTextReferencesClickable = (text: string) => {
        const patterns = [
          // Bible: "John 3:16", "1 John 4:8", "Matthew 11:15"
          /\b(\d*\s*[A-Z][a-z]+)\s+(\d+):(\d+)\b/g,
          // Quran: "Surah Al-Ikhlas 112:1", "Quran 39:17-18"
          /\b(Surah\s+[A-Z][a-z-]+|Quran)\s+(\d+):(\d+)(?:-(\d+))?\b/g,
        ];
        
        let processedText = text;
        patterns.forEach(pattern => {
          processedText = processedText.replace(pattern, (match) => {
            return `<button class="inline-flex items-center gap-1 mx-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium hover:bg-blue-200 transition-colors cursor-pointer" onclick="window.handleVerseClick('${match}')" title="Click to navigate to ${match}">${match} <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></button>`;
          });
        });
        
        return processedText;
      };

      const processedContent = makeTextReferencesClickable(displayContent);
      
      return (
        <div 
          className="text-gray-800 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />
      );
    }

    // Parse XML-style perspectives
    if (hasXMLPerspectives) {
      const perspectiveRegex = /<perspective>(Christianity|Islam|Judaism|Hinduism|Buddhism)<\/perspective>([\s\S]*?)(?=<perspective>|$)/g;
      const matches = [];
      let match;
      while ((match = perspectiveRegex.exec(content)) !== null) {
        matches.push(match);
      }
      
      // Extract introduction (text before first perspective tag)
      const introMatch = content.match(/^([\s\S]*?)(?=<perspective>)/);
      const introduction = introMatch ? introMatch[1].trim() : '';

      const perspectiveMap = new Map();
      matches.forEach(match => {
        const [, religion, perspectiveText] = match;
        perspectiveMap.set(religion, perspectiveText.trim());
      });

      // Function to make verse references clickable
      const makeReferencesClickable = (text: string) => {
        // Regex patterns for different religious text references
        const patterns = [
          // Bible: "John 3:16", "1 John 4:8", "Matthew 11:15"
          /\b(\d*\s*[A-Z][a-z]+)\s+(\d+):(\d+)\b/g,
          // Quran: "Surah Al-Ikhlas 112:1", "Quran 39:17-18"
          /\b(Surah\s+[A-Z][a-z-]+|Quran)\s+(\d+):(\d+)(?:-(\d+))?\b/g,
          // Torah: "Deuteronomy 6:4"
          /\b([A-Z][a-z]+)\s+(\d+):(\d+)\b/g
        ];
        
        let processedText = text;
        patterns.forEach(pattern => {
          processedText = processedText.replace(pattern, (match) => {
            return `<span class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium cursor-pointer hover:bg-blue-200 transition-colors" title="Click to navigate to ${match}">${match} <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></span>`;
          });
        });
        
        return processedText;
      };

      const perspectives = [
        { key: 'Christianity', name: 'Christian', icon: Eye, bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-700', iconColor: 'text-blue-600' },
        { key: 'Islam', name: 'Islamic', icon: Heart, bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-700', iconColor: 'text-green-600' },
        { key: 'Judaism', name: 'Jewish', icon: Star, bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', textColor: 'text-indigo-700', iconColor: 'text-indigo-600' },
        { key: 'Hinduism', name: 'Hindu', icon: Zap, bgColor: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-700', iconColor: 'text-orange-600' },
        { key: 'Buddhism', name: 'Buddhist', icon: Flame, bgColor: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-700', iconColor: 'text-purple-600' },
      ];

      return (
        <div className="space-y-4">
          {introduction && (
            <div className="text-gray-800 text-sm leading-relaxed">
              {introduction}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {perspectives.map(({ key, name, icon: Icon, bgColor, borderColor, textColor, iconColor }) => {
              const perspectiveContent = perspectiveMap.get(key);
              if (!perspectiveContent) return null;
              
              return (
                <button
                  key={key}
                  className={`group flex items-center gap-1.5 px-3 py-2 ${bgColor} border ${borderColor} rounded-full hover:shadow-lg perspective-chip-transition`}
                  title={`Click to read ${name} perspective: ${perspectiveContent.substring(0, 100)}...`}
                  onClick={() => {
                    // Create a formatted version with clickable references
                    const formattedContent = makeReferencesClickable(perspectiveContent);
                    
                    // Create a custom toast with HTML content
                    const toastDiv = document.createElement('div');
                    toastDiv.innerHTML = `
                      <div class="space-y-3">
                        <h4 class="font-semibold text-sm">${name} Perspective</h4>
                        <div class="text-sm leading-relaxed" style="max-height: 200px; overflow-y: auto;">
                          ${formattedContent}
                        </div>
                      </div>
                    `;
                    
                    // Add click handlers for verse references
                    toastDiv.addEventListener('click', (e) => {
                      const target = e.target as HTMLElement;
                      if (target.classList.contains('cursor-pointer') && target.textContent) {
                        onVerseClick(target.textContent.trim());
                      }
                    });
                    
                    toast({
                      title: `${name} Perspective`,
                      description: perspectiveContent,
                      duration: 10000
                    });
                  }}
                >
                  <Icon className={`w-4 h-4 ${iconColor} group-hover:scale-110 transition-transform`} />
                  <span className={`text-sm font-medium ${textColor}`}>{name}</span>
                  <div className={`w-1.5 h-1.5 ${bgColor.replace('50', '400')} rounded-full opacity-60 group-hover:opacity-100 transition-opacity`} />
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    // Fallback for traditional perspective format
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
        <div className="text-gray-800 text-sm leading-relaxed">
          {introduction.trim()}
        </div>

        <div className="flex flex-wrap gap-2">
          {perspectives.map(({ key, name, icon: Icon, bgColor, borderColor, textColor, iconColor }) => {
            const perspectiveContent = parsePerspectiveContent(content, key);
            if (!perspectiveContent) return null;
            
            return (
              <button
                key={key}
                className={`flex items-center gap-1 px-2 py-1 ${bgColor} border ${borderColor} rounded-full hover:shadow-md transition-all duration-200 cursor-pointer`}
              >
                <Icon className={`w-3 h-3 ${iconColor}`} />
                <span className={`text-xs font-medium ${textColor}`}>{name}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex gap-3 animate-fadeIn" style={{ animationDelay: `${index * 50}ms` }}>
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
      <div className={`flex-1 relative ${
        message.type === 'user' 
          ? 'bg-gray-50 rounded-lg p-3' 
          : 'bg-white border border-gray-100 rounded-lg p-3 shadow-sm'
      }`}>
        {message.type === 'user' ? (
          <p className="text-gray-800 text-sm leading-relaxed">{message.content}</p>
        ) : (
          <div className="space-y-3">
            {renderEnhancedResponse(message.content)}
            
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log('🔊 Manual voice play requested for:', message.content.substring(0, 50) + '...');
                  onVoicePlay(message.content);
                }}
                disabled={isVoiceLoading}
                className="h-6 px-2 text-xs text-gray-500 hover:text-teal-600 hover:bg-teal-50"
                title={isVoiceLoading ? 'Loading audio...' : isVoicePlaying ? 'Audio is playing' : 'Click to listen to this response'}
              >
                {isVoiceLoading ? (
                  <Loader className="w-3 h-3 mr-1 animate-spin" />
                ) : isVoicePlaying ? (
                  <VolumeX className="w-3 h-3 mr-1" />
                ) : (
                  <Volume2 className="w-3 h-3 mr-1" />
                )}
                {isVoiceLoading ? 'Loading...' : isVoicePlaying ? 'Playing' : 'Listen'}
              </Button>
              {isVoicePlaying && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onVoiceStop}
                  className="h-6 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Square className="w-3 h-3 mr-1" />
                  Stop
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-gray-500 hover:text-teal-600 hover:bg-teal-50"
                onClick={() => onBookmark(message.content)}
              >
                <BookOpen className="w-3 h-3 mr-1" />
                Bookmark
              </Button>
            </div>
            
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
          </div>
        )}
      </div>
    </div>
  );
}

export function InsightChat({ 
  sessionId, 
  context, 
  externalMessage, 
  onExternalMessageProcessed,
  onCopyOperation,
  onNavigateToVerse,
  className = ""
}: InsightChatProps) {
  const { toast } = useToast();
  const messageEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Enhanced State Management
  const [currentMessage, setCurrentMessage] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [proactivePrompt, setProactivePrompt] = useState<string | null>(null);
  
  // Voice and conversation state
  const [orbState, setOrbState] = useState<'idle' | 'listening' | 'processing' | 'responding' | 'interrupted'>('idle');

  // ElevenLabs voice integration
  const {
    isPlaying: isVoicePlaying,
    isLoading: isVoiceLoading,
    playText,
    stopPlayback,
    isSupported: isVoiceSupported
  } = useElevenLabsStreaming({
    autoPlay: true,
    onStart: () => setOrbState('responding'),
    onEnd: () => setOrbState('idle'),
    onError: (error) => {
      console.error('Voice error:', error);
      toast({
        title: "Voice Error",
        description: error,
        variant: "destructive"
      });
    },
    onInterrupted: () => setOrbState('interrupted')
  });

  // Conversation Manager integration
  const conversationManager: ConversationManagerReturn = useConversationManager({
    sessionId,
    onProactivePrompt: (prompt) => {
      setProactivePrompt(prompt);
      // Auto-hide proactive prompt after 10 seconds
      setTimeout(() => setProactivePrompt(null), 10000);
    },
    onContextUpdate: (conversationState) => {
      console.log('Conversation context updated:', conversationState);
    },
    maxTurns: 8
  });

  // Fetch chat messages
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

  // Send message mutation with enhanced conversation handling
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      setIsTyping(true);
      setOrbState('processing');
      
      try {
        // Get conversation context for AI
        const conversationContext = conversationManager.getRecentContext();
        
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
              chapter: context.chapter || null,
              conversationHistory: conversationContext
            }
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      } finally {
        setIsTyping(false);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat', sessionId] });
      
      // Add to conversation manager
      const aiResponse = data.aiMessage?.content || '';
      if (aiResponse) {
        conversationManager.addTurn(currentMessage, aiResponse, context);
        
        // Auto-play voice response if supported
        if (isVoiceSupported && aiResponse.trim()) {
          setTimeout(() => {
            playText(aiResponse);
          }, 500);
        }
      }
      
      setCurrentMessage("");
      setOrbState('idle');
    },
    onError: (error: any) => {
      setIsTyping(false);
      setOrbState('idle');
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    }
  });

  // Handle voice interruption
  const handleVoiceInterruption = useCallback(() => {
    if (isVoicePlaying) {
      console.log('🛑 Voice interruption triggered - stopping AI voice');
      stopPlayback();
      setOrbState('interrupted');
      
      // Reset to idle after a brief moment
      setTimeout(() => {
        setOrbState('idle');
      }, 1000);
    }
  }, [isVoicePlaying, stopPlayback]);

  // Handle verse reference clicks
  const handleVerseReferenceClick = useCallback((reference: string) => {
    console.log('Verse reference clicked:', reference);
    
    // Parse the reference to extract religion, book, and verse info
    let religion: Religion | null = null;
    let book = '';
    let chapter = 1;
    let verse = 1;
    
    // Bible references: "John 3:16", "1 John 4:8"
    const bibleMatch = reference.match(/^(\d*\s*[A-Z][a-z]+)\s+(\d+):(\d+)$/);
    if (bibleMatch) {
      religion = 'christianity';
      book = bibleMatch[1].trim();
      chapter = parseInt(bibleMatch[2]);
      verse = parseInt(bibleMatch[3]);
    }
    
    // Quran references: "Surah Al-Ikhlas 112:1"
    const quranMatch = reference.match(/^(?:Surah\s+)?([A-Z][a-z-]+)\s+(\d+):(\d+)$/);
    if (quranMatch && reference.includes('Surah')) {
      religion = 'islam';
      book = `Al-${quranMatch[1].replace('Al-', '')}`;
      chapter = parseInt(quranMatch[2]);
      verse = parseInt(quranMatch[3]);
    }
    
    // Torah references: "Deuteronomy 6:4"
    const torahMatch = reference.match(/^([A-Z][a-z]+)\s+(\d+):(\d+)$/);
    if (torahMatch && !bibleMatch) {
      religion = 'judaism';
      book = torahMatch[1];
      chapter = parseInt(torahMatch[2]);
      verse = parseInt(torahMatch[3]);
    }
    
    if (religion && book && onNavigateToVerse) {
      onNavigateToVerse(religion, book, chapter, verse);
      toast({
        title: "Navigating to Verse",
        description: `Opening ${reference} in the scripture reader`,
        duration: 3000
      });
    } else {
      toast({
        title: "Reference Info",
        description: `Scripture reference: ${reference}`,
        duration: 4000
      });
    }
  }, [onNavigateToVerse, toast]);

  // Handle external message processing
  useEffect(() => {
    if (externalMessage && !sendMessageMutation.isPending) {
      setCurrentMessage(externalMessage);
      sendMessageMutation.mutate(externalMessage);
      onExternalMessageProcessed?.();
    }
  }, [externalMessage, sendMessageMutation, onExternalMessageProcessed]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Set up global verse click handler
  useEffect(() => {
    (window as any).handleVerseClick = handleVerseReferenceClick;
    return () => {
      delete (window as any).handleVerseClick;
    };
  }, [handleVerseReferenceClick]);
  
  // Bookmarking system
  const handleBookmark = useCallback((content: string) => {
    const bookmark = {
      id: Date.now().toString(),
      content,
      context,
      timestamp: Date.now()
    };
    
    const bookmarks = JSON.parse(localStorage.getItem('rellio-bookmarks') || '[]');
    bookmarks.push(bookmark);
    localStorage.setItem('rellio-bookmarks', JSON.stringify(bookmarks));
    
    toast({
      title: "Bookmarked!",
      description: "AI response saved to your bookmarks",
      variant: "default"
    });
  }, [context, toast]);

  // Get appropriate quick suggestions based on context
  const getQuickSuggestions = () => {
    const recentTurns = conversationManager.conversationState.turns.slice(-2);
    
    if (recentTurns.length > 0) {
      return conversationManager.generateFollowUp(recentTurns[recentTurns.length - 1]?.aiResponse || '');
    }
    
    if (!context.religion && !context.book) {
      return [
        "What is the meaning of love?",
        "How can I find inner peace?",
        "What is the purpose of life?",
        "How should I handle suffering?"
      ];
    }
    
    return [
      `Explain this chapter's main message`,
      `What does this teach about faith?`,
      `How does this apply to modern life?`,
      `Compare with other religious views`
    ];
  };

  return (
    <div className={cn("h-full flex flex-col bg-white", className)}>
      {/* Enhanced Header with Orb and Mandala Overlay */}
      <div className="relative px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-cyan-50 overflow-hidden">
        <MandalaOverlay className="absolute inset-0 opacity-5" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <GrokStyleOrb state={orbState} size="md" />
            <div>
              <h3 className="font-semibold text-sm text-gray-900">Universal Wisdom Explorer</h3>
              <p className="text-xs text-gray-500">Your spiritual guide for multi-faith wisdom</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              {messages.length} turns
            </Badge>
            {isVoiceSupported && (
              <Badge variant="outline" className="text-xs text-teal-600 border-teal-200">
                Voice AI
              </Badge>
            )}
            
            {/* History and Clear buttons */}
            {messages.length > 0 && (
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    // Toggle conversation history visibility or show in modal
                    toast({
                      title: "Conversation History",
                      description: `You have ${messages.length} messages in this session. Use the scroll area to review past messages.`,
                      duration: 4000
                    });
                  }}
                >
                  <History className="w-3 h-3 mr-1" />
                  History
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (confirm('Clear all conversation history? This action cannot be undone.')) {
                      // Clear messages by invalidating the query cache
                      queryClient.setQueryData(['/api/chat', sessionId], []);
                      conversationManager.conversationState.turns = [];
                      toast({
                        title: "Conversation Cleared",
                        description: "All messages have been removed from this session.",
                        duration: 3000
                      });
                    }
                  }}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Proactive Prompt Bar */}
      {proactivePrompt && (
        <div className="px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-800">{proactivePrompt}</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs border-purple-300 text-purple-700 hover:bg-purple-100"
                onClick={() => {
                  setCurrentMessage(proactivePrompt);
                  sendMessageMutation.mutate(proactivePrompt);
                  setProactivePrompt(null);
                }}
              >
                Ask This
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs text-purple-500"
                onClick={() => setProactivePrompt(null)}
              >
                ×
              </Button>
            </div>
          </div>
        </div>
      )}

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
              <h4 className="font-medium text-gray-900 mb-2">Welcome to Universal Wisdom Explorer</h4>
              <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
                Your conversational guide for exploring wisdom from multiple religious traditions with voice interaction
              </p>
              
              <div className="space-y-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Start a conversation</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {getQuickSuggestions().slice(0, 4).map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 border-teal-200 hover:border-teal-400 hover:bg-teal-50 hover:shadow-md transition-all duration-200"
                      onClick={() => {
                        setCurrentMessage(suggestion);
                        sendMessageMutation.mutate(suggestion);
                      }}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <EnhancedMessageBubble
                key={index}
                message={message}
                index={index}
                onBookmark={handleBookmark}
                onVoicePlay={playText}
                isVoicePlaying={isVoicePlaying}
                isVoiceLoading={isVoiceLoading}
                onVoiceStop={stopPlayback}
                toast={toast}
                onVerseClick={handleVerseReferenceClick}
              />
            ))
          )}
          
          {/* Typing indicator */}
          <TypingIndicator isTyping={isTyping} />
          
          <div ref={messageEndRef} />
        </div>
      </ScrollArea>

      {/* Enhanced Voice Input Interface */}
      <div className="border-t border-gray-100 p-4 bg-gradient-to-t from-gray-50 to-white">
        <VoiceFirstInterface
          onSubmit={(message) => {
            setCurrentMessage(message);
            sendMessageMutation.mutate(message);
          }}
          isStreaming={sendMessageMutation.isPending || isTyping}
          isInterrupted={orbState === 'interrupted'}
          onInterrupt={handleVoiceInterruption}
          placeholder="Speak or type your spiritual question..."
          disabled={sendMessageMutation.isPending}
          isAIResponding={isVoicePlaying || orbState === 'responding'}
        />
      </div>
    </div>
  );
}