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
  Bookmark,
  GitCompare,
  Sparkles,
  Mic,
  MicOff,
  Square,
  Volume2,
  Save,
  Settings,
  Trash2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Religion, ChatMessage } from "@shared/schema";
import { AudioPlaybackButton } from "@/components/chat/AudioPlaybackButton";
import { type ScholarPersona, getPersonaForReligion } from "@/components/chat/ScholarPersonas";
import { ChatHistoryManager } from "@/components/chat/ChatHistoryManager";
// SimpleVoiceInterface removed - using integrated voice in main chat interface
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Speech Recognition types now handled by consolidated VoiceModeHandler

// Perspective colors for multi-religious responses
const PERSPECTIVE_COLORS = {
  'Christianity': {
    border: 'border-gray-200',
    bg: 'bg-gray-50',
    glow: '',
    text: 'text-gray-800',
    glowClass: ''
  },
  'Islam': {
    border: 'border-gray-200',
    bg: 'bg-gray-50',
    glow: '',
    text: 'text-gray-800',
    glowClass: ''
  },
  'Judaism': {
    border: 'border-gray-200',
    bg: 'bg-gray-50',
    glow: '',
    text: 'text-gray-800',
    glowClass: ''
  },
  'Hinduism': {
    border: 'border-gray-200',
    bg: 'bg-gray-50',
    glow: '',
    text: 'text-gray-800',
    glowClass: ''
  },
  'Buddhism': {
    border: 'border-gray-200',
    bg: 'bg-gray-50',
    glow: '',
    text: 'text-gray-800',
    glowClass: ''
  }
};

// Scripture Content Component with Clickable References and Multi-Perspective Support
function ScriptureContent({ 
  content, 
  onNavigateToVerse 
}: { 
  content: string;
  onNavigateToVerse?: (religion: Religion, book: string, chapter: number, verse?: number) => void;
}) {
  const parseScriptureReferences = (text: string) => {
    const patterns = [
      // Bible references
      { 
        regex: /\b(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Songs|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation)\s+(\d+):(\d+)(?:-\d+)?/gi, 
        religion: 'bible' as Religion 
      },
      // Quran references - comprehensive patterns
      { 
        regex: /\b(?:Quran|Qur'an|Qur'ān|Surah)\s+(?:Al-)?([A-Za-z-\s'()]+)\s*(?:\([\w\s]+\))?\s*(\d+):(\d+)(?:-\d+)?/gi, 
        religion: 'quran' as Religion 
      },
      { 
        regex: /\b(Quran|Qur'an)\s+(\d+):(\d+)(?:-\d+)?/gi, 
        religion: 'quran' as Religion 
      },
      // Quran Surah names with parenthetical descriptions (e.g., "Al-Anbiya (The Prophets) 1:2")
      {
        regex: /\b(Al-[A-Za-z-]+(?:\s+\([^)]+\))?)\s+(\d+):(\d+)(?:-\d+)?/gi,
        religion: 'quran' as Religion
      },
      // Additional Quran Surah patterns
      {
        regex: /\b(An-[A-Za-z-]+(?:\s+\([^)]+\))?)\s+(\d+):(\d+)(?:-\d+)?/gi,
        religion: 'quran' as Religion
      },
      {
        regex: /\b(As-[A-Za-z-]+(?:\s+\([^)]+\))?)\s+(\d+):(\d+)(?:-\d+)?/gi,
        religion: 'quran' as Religion
      },
      // Hindu references
      { 
        regex: /\b(Bhagavad\s+Gita)\s+(\d+):(\d+)(?:-\d+)?/gi, 
        religion: 'hindu' as Religion 
      },
      // Torah references
      { 
        regex: /\b(Bereshit|Shemot|Vayikra|Bamidbar|Devarim)\s+(\d+):(\d+)(?:-\d+)?/gi, 
        religion: 'torah' as Religion 
      }
    ];

    let processedText = text;
    
    patterns.forEach(({ regex, religion }) => {
      processedText = processedText.replace(regex, (match, bookOrSurah, chapter, verse) => {
        const referenceId = `ref-${Math.random().toString(36).substr(2, 9)}`;
        return `<span 
          id="${referenceId}"
          class="scripture-ref cursor-pointer text-gray-700 hover:text-gray-900 hover:underline font-medium transition-colors bg-gray-50 px-1 py-0.5 rounded border border-gray-200" 
          data-religion="${religion}" 
          data-book="${bookOrSurah}" 
          data-chapter="${chapter}" 
          data-verse="${verse}"
          title="Click to navigate to ${match}"
        >${match}</span>`;
      });
    });

    return processedText;
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains('scripture-ref')) {
      event.preventDefault();
      const religion = target.dataset.religion as Religion;
      const book = target.dataset.book || '';
      const chapter = parseInt(target.dataset.chapter || '1', 10);
      const verse = target.dataset.verse ? parseInt(target.dataset.verse, 10) : undefined;
      
      if (onNavigateToVerse && religion && book && chapter) {
        console.log('🔗 Navigating to scripture:', { religion, book, chapter, verse });
        onNavigateToVerse(religion, book, chapter, verse);
      }
    }
  };

  // Check if content contains multi-perspective tags
  const hasMultiPerspectives = content.includes('<perspective>');

  if (hasMultiPerspectives) {
    // Parse multi-perspective content
    const perspectiveRegex = /<perspective>(.*?)<\/perspective>([\s\S]*?)(?=<perspective>|$)/gi;
    const perspectives: Array<{ name: string; content: string }> = [];
    let match;

    while ((match = perspectiveRegex.exec(content)) !== null) {
      const name = match[1].trim();
      const perspectiveContent = match[2].trim();
      perspectives.push({ name, content: perspectiveContent });
    }

    return (
      <div className="space-y-6">
        {perspectives.map((perspective, index) => {
          const colors = PERSPECTIVE_COLORS[perspective.name as keyof typeof PERSPECTIVE_COLORS];
          if (!colors) return null;

          const processedContent = parseScriptureReferences(perspective.content);

          return (
            <div
              key={index}
              className={cn(
                "rounded-lg border-2 p-4 transition-all duration-300 shadow-lg",
                colors.border,
                colors.bg,
                colors.glow,
                colors.glowClass
              )}
              onClick={handleClick}
            >
              <h4 className={cn(
                "font-semibold text-lg mb-3 flex items-center gap-2",
                colors.text
              )}>
                <Sparkles className="w-4 h-4" />
                {perspective.name}
              </h4>
              <div 
                className={cn(
                  "prose prose-sm max-w-none leading-relaxed",
                  colors.text
                )}
                dangerouslySetInnerHTML={{ __html: processedContent }}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // Regular single-perspective content
  return (
    <div 
      className="prose prose-sm max-w-none leading-relaxed text-gray-900"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: parseScriptureReferences(content) }}
    />
  );
}

// Enhanced Voice Orb Component
interface VoiceOrbProps {
  isListening: boolean;
  isProcessing: boolean;
  onClick: () => void;
  onStop: () => void;
  disabled?: boolean;
}

function VoiceOrb({ 
  isListening, 
  isProcessing, 
  onClick, 
  onStop, 
  disabled = false 
}: VoiceOrbProps) {
  const getOrbState = () => {
    if (isProcessing) return 'processing';
    if (isListening) return 'recording';
    return 'idle';
  };

  const getOrbClasses = () => {
    const baseClasses = cn(
      "w-12 h-12 rounded-full transition-all duration-300 relative overflow-hidden",
      "flex items-center justify-center cursor-pointer",
      "border-2 shadow-lg",
      disabled && "opacity-50 cursor-not-allowed"
    );

    const state = getOrbState();
    
    switch (state) {
      case 'idle':
        return cn(
          baseClasses,
          "bg-gray-900",
          "border-gray-700 text-white",
          "hover:bg-gray-700",
          ""
        );
      
      case 'recording':
        return cn(
          baseClasses,
          "bg-gray-700",
          "border-gray-500 text-white",
          "animate-pulse"
        );
      
      case 'processing':
        return cn(
          baseClasses,
          "bg-gray-600",
          "border-gray-400 text-white",
          "animate-pulse"
        );
      
      default:
        return baseClasses;
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        className={getOrbClasses()}
        onClick={isListening ? onStop : onClick}
        disabled={disabled}
        aria-label={isListening ? "Stop recording" : "Start voice input"}
      >
        {isProcessing ? (
          <div className="w-5 h-5 border-2 border-gray-200 border-t-transparent rounded-full animate-spin" />
        ) : isListening ? (
          <Square className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
      
      {isListening && (
        <div className="text-xs text-gray-700 font-medium">
          Recording...
        </div>
      )}
    </div>
  );
}

// Suggestion Chip Component
interface SuggestionChipProps {
  text: string;
  onClick: (text: string) => void;
}

function SuggestionChip({ text, onClick }: SuggestionChipProps) {
  return (
    <button
      className={cn(
        "px-5 py-2.5 rounded-full text-sm font-medium",
        "border border-gray-200 text-gray-700",
        "bg-white hover:bg-gray-50",
        "transition-all duration-300 transform hover:scale-105",
        "hover:border-gray-300 hover:shadow-sm shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2",
        
      )}
      onClick={() => onClick(text)}
    >
      {text}
    </button>
  );
}

// Enhanced Message Bubble Component
interface MessageBubbleProps {
  message: ChatMessage;
  persona?: ScholarPersona | null;
  onSave?: () => void;
  onNavigateToVerse?: (religion: Religion, book: string, chapter: number, verse?: number) => void;
}

function MessageBubble({ message, persona, onSave, onNavigateToVerse }: MessageBubbleProps) {
  const isUser = message.type === 'user';
  
  return (
    <div className={cn(
      "flex gap-3 mb-4",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isUser 
          ? "bg-gray-900 text-white"
          : "bg-gray-900 text-white"
      )}>
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>
      
      {/* Message Content */}
      <div className={cn(
        "flex-1 max-w-[80%]",
        isUser ? "flex flex-col items-end" : "flex flex-col items-start"
      )}>
        {/* Message Bubble */}
        <div className={cn(
          "px-4 py-3 rounded-2xl shadow-sm transition-all duration-200",
          "hover:shadow-md border border-transparent hover:border-gray-200",
          isUser 
            ? "bg-gray-100 text-gray-800 rounded-br-md"
            : "bg-white text-gray-800 border-gray-200 rounded-bl-md"
        )}>
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          ) : (
            <ScriptureContent 
              content={message.content}
              onNavigateToVerse={onNavigateToVerse}
            />
          )}
        </div>
        
        {/* Action Buttons for AI messages */}
        {!isUser && (
          <div className="flex items-center gap-2 mt-2">
            <AudioPlaybackButton 
              text={message.content}
              voiceId={persona?.elevenLabsVoice}
              voiceTone={persona?.voiceTone}
              size="sm"
              className="text-gray-500 hover:text-gray-700"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              onClick={onSave}
            >
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Main Enhanced Chat Component
interface EnhancedAuraArchivistCardProps {
  sessionId: string;
  context: {
    religion: Religion | null;
    book: string;
    chapter: number;
  };
  externalMessage?: string;
  onExternalMessageProcessed?: () => void;
  onNavigateToVerse?: (religion: Religion, book: string, chapter: number, verse?: number) => void;
}

export function EnhancedAuraArchivistCard({
  sessionId,
  context,
  externalMessage,
  onExternalMessageProcessed,
  onNavigateToVerse
}: EnhancedAuraArchivistCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [currentMessage, setCurrentMessage] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<ScholarPersona | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Voice input state - Enhanced voice mode
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceInterrupted, setVoiceInterrupted] = useState(false);

  // Suggestion chips
  const suggestionChips = [
    "What is the meaning of compassion?",
    "How do I find inner peace?",
    "Explain the concept of divine love",
    "What is the purpose of suffering?",
    "How can I practice forgiveness?"
  ];

  // Enhanced voice interruption handler
  const handleVoiceInterruption = () => {
    console.log('🚨 Voice interruption triggered - stopping AI response');
    setVoiceInterrupted(true);
    setIsStreaming(false);
    setIsProcessing(false);
    
    // Show user feedback
    toast({
      title: "Response Interrupted",
      description: "You can continue the conversation or ask a new question",
      variant: "default"
    });
    
    // Reset interruption state after a moment
    setTimeout(() => setVoiceInterrupted(false), 2000);
  };

  // Enhanced voice message handler
  const handleVoiceMessage = (message: string) => {
    console.log('🎤 Voice message received:', message);
    handleSendMessage(message);
  };

  // Auto-select religion-specific persona
  useEffect(() => {
    if (context.religion) {
      const religionPersona = getPersonaForReligion(context.religion);
      if (religionPersona && (!selectedPersona || selectedPersona.primaryReligion !== context.religion)) {
        setSelectedPersona(religionPersona);
        console.log(`🎭 Persona activated: ${religionPersona.name} for ${context.religion}`);
        toast({
          title: `${religionPersona.name} Activated`,
          description: `Your ${religionPersona.title} is now guiding your spiritual journey`,
          variant: "default"
        });
      }
    } else {
      // Reset to universal persona when no specific religion
      if (selectedPersona && selectedPersona.primaryReligion) {
        setSelectedPersona(null);
        console.log('🎭 Persona reset to universal');
      }
    }
  }, [context.religion, selectedPersona, toast]);

  // Load messages
  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat', currentSessionId],
    queryFn: async () => {
      const response = await fetch(`/api/chat/${currentSessionId}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!currentSessionId
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { message: string; personaContext?: ScholarPersona }) => {
      setIsStreaming(true);
      setIsProcessing(true);
      
      try {
        const enhancedMessage = messageData.personaContext 
          ? `${messageData.personaContext.systemPrompt}\n\nUser question: ${messageData.message}`
          : messageData.message;

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSessionId,
            message: messageData.message, // Use original message, not enhanced
            context: {
              religion: context.religion,
              book: context.book,
              chapter: context.chapter,
              persona: messageData.personaContext?.name || selectedPersona?.name || null
            }
          })
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      } finally {
        setIsStreaming(false);
        setIsProcessing(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat', currentSessionId] });
      setCurrentMessage("");
    },
    onError: (error: any) => {
      setIsStreaming(false);
      setIsProcessing(false);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    }
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle external message
  useEffect(() => {
    if (externalMessage && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate({
        message: externalMessage,
        personaContext: selectedPersona || undefined
      });
      onExternalMessageProcessed?.();
    }
  }, [externalMessage, sendMessageMutation, onExternalMessageProcessed, selectedPersona]);

  // Voice input is now handled by the EnhancedVoiceInterface component

  // Message handlers
  const handleSendMessage = (messageOverride?: string) => {
    const messageToSend = messageOverride || currentMessage;
    if (!messageToSend.trim()) return;
    
    console.log('🎭 Sending message with persona:', selectedPersona?.name);
    console.log('📍 Context:', { religion: context.religion, book: context.book, chapter: context.chapter });
    
    sendMessageMutation.mutate({
      message: messageToSend,
      personaContext: selectedPersona || undefined
    });
  };

  const handleSuggestionClick = (suggestion: string) => {
    setCurrentMessage(suggestion);
    handleSendMessage(suggestion);
  };

  const handleBookmark = (content: string) => {
    const bookmark = {
      id: Date.now().toString(),
      content,
      context: {
        religion: context.religion || 'general',
        book: context.book,
        chapter: context.chapter
      },
      persona: selectedPersona?.name || 'Aura Archivist',
      timestamp: Date.now()
    };
    
    const existing = JSON.parse(localStorage.getItem('rellio-bookmarks') || '[]');
    const updated = [bookmark, ...existing].slice(0, 50);
    localStorage.setItem('rellio-bookmarks', JSON.stringify(updated));
    
    toast({
      title: "Wisdom Preserved",
      description: "Response saved to your spiritual collection",
      variant: "default"
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Clear chat handler
  const handleClearChat = () => {
    // Generate a new session ID to effectively clear the chat
    const newSessionId = `session_${Date.now()}`;
    setCurrentSessionId(newSessionId);
    setCurrentMessage("");
    // Voice transcript is now handled by EnhancedVoiceInterface
    
    // Invalidate current session queries to force refresh
    queryClient.invalidateQueries({ queryKey: ['/api/chat', currentSessionId] });
    
    toast({
      title: "Chat Cleared",
      description: "Started a fresh conversation",
      variant: "default"
    });
  };

  return (
    <Card className="w-full h-full bg-white shadow-lg rounded-xl overflow-hidden flex flex-col">
      {/* Title Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shadow-sm",
            selectedPersona 
              ? "bg-gray-900"
              : "bg-gray-900"
          )}>
            {selectedPersona ? (
              <selectedPersona.icon className="w-4 h-4 text-white" />
            ) : (
              <Sparkles className="w-4 h-4 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {selectedPersona ? selectedPersona.name : "Aura Archivist"}
            </h2>
            <p className="text-xs text-gray-600">
              {selectedPersona ? selectedPersona.title : "Universal Wisdom Explorer"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="text-gray-500 hover:text-gray-700 h-7 w-7 p-0"
            title="Chat History"
          >
            <History className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            className="text-gray-500 hover:text-gray-700 h-7 w-7 p-0"
            title="Clear Chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700 h-7 w-7 p-0"
            title="Compare Perspectives"
          >
            <GitCompare className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700 h-7 w-7 p-0"
            title="Bookmarks"
          >
            <Bookmark className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Voice Orb */}
      <div className="flex justify-center py-2 bg-white flex-shrink-0">
      </div>

      {/* Messages Area - Expands to fill available space */}
      <div className="flex-1 overflow-hidden bg-white">
        <ScrollArea className="h-full px-4">
          {isLoading ? (
            <div className="space-y-4 py-4">
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
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              {/* Enhanced Welcome Section */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Welcome to Enlightened Discourse
                </h3>
                <p className="text-gray-600 max-w-sm leading-relaxed">
                  Ask questions about spirituality, wisdom traditions, and sacred texts. 
                  Discover insights from multiple religious and philosophical perspectives.
                </p>
              </div>
              
              {/* Enhanced Suggestion Chips */}
              <div className="flex flex-wrap gap-3 justify-center max-w-lg">
                {suggestionChips.slice(0, 3).map((suggestion) => (
                  <SuggestionChip
                    key={suggestion}
                    text={suggestion}
                    onClick={handleSuggestionClick}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-4 min-h-full">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  persona={selectedPersona}
                  onSave={() => handleBookmark(message.content)}
                  onNavigateToVerse={onNavigateToVerse}
                />
              ))}
              {isStreaming && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Note: Voice functionality is now integrated in the main VoiceFirstChatInterface */}
      {/* Enhanced chat interface handles both voice and text input */}

      {/* Chat History Manager */}
      {showHistory && (
        <ChatHistoryManager
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          currentSessionId={currentSessionId}
          currentMessages={messages}
          currentPersona={selectedPersona}
          currentContext={context}
          onLoadSession={(entry) => {
            setCurrentSessionId(entry.sessionId);
            setShowHistory(false);
            toast({
              title: "Session Restored",
              description: `Loaded conversation with ${entry.persona?.name || 'Aura Archivist'}`,
              variant: "default"
            });
          }}
          onHighlightVerse={onNavigateToVerse as any}
        />
      )}
    </Card>
  );
}