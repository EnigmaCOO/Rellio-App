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
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

// Perspective colors for multi-religious responses
const PERSPECTIVE_COLORS = {
  'Christianity': {
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    glow: 'shadow-blue-200/50',
    text: 'text-blue-800',
    glowClass: 'perspective-glow-blue'
  },
  'Islam': {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    glow: 'shadow-emerald-200/50',
    text: 'text-emerald-800',
    glowClass: 'perspective-glow-emerald'
  },
  'Judaism': {
    border: 'border-purple-200',
    bg: 'bg-purple-50',
    glow: 'shadow-purple-200/50',
    text: 'text-purple-800',
    glowClass: 'perspective-glow-purple'
  },
  'Hinduism': {
    border: 'border-orange-200',
    bg: 'bg-orange-50',
    glow: 'shadow-orange-200/50',
    text: 'text-orange-800',
    glowClass: 'perspective-glow-orange'
  },
  'Buddhism': {
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    glow: 'shadow-amber-200/50',
    text: 'text-amber-800',
    glowClass: 'perspective-glow-amber'
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
          class="scripture-ref cursor-pointer text-teal-600 hover:text-teal-800 hover:underline font-medium transition-colors bg-teal-50 px-1 py-0.5 rounded border border-teal-200" 
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
      "w-16 h-16 rounded-full transition-all duration-300 relative overflow-hidden",
      "flex items-center justify-center cursor-pointer",
      "border-2 shadow-lg",
      disabled && "opacity-50 cursor-not-allowed"
    );

    const state = getOrbState();
    
    switch (state) {
      case 'idle':
        return cn(
          baseClasses,
          "bg-gradient-to-br from-teal-400 to-teal-600",
          "border-teal-300 text-white",
          "hover:from-teal-500 hover:to-teal-700",
          "animate-orb-glow"
        );
      
      case 'recording':
        return cn(
          baseClasses,
          "bg-gradient-to-br from-red-500 to-red-600",
          "border-red-400 text-white",
          "animate-recording-pulse"
        );
      
      case 'processing':
        return cn(
          baseClasses,
          "bg-gradient-to-br from-purple-500 to-purple-600",
          "border-purple-400 text-white",
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
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : isListening ? (
          <Square className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </button>
      
      {isListening && (
        <div className="text-xs text-red-600 font-medium animate-pulse">
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
        "px-4 py-2 rounded-full text-sm",
        "border-2 border-teal-200 text-teal-700",
        "bg-white hover:bg-teal-50",
        "transition-all duration-200",
        "hover:border-teal-300 hover:shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
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
          ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
          : "bg-gradient-to-br from-teal-500 to-teal-600 text-white"
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
          "hover:shadow-md border border-transparent hover:border-teal-200",
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
              className="text-gray-500 hover:text-teal-600"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-gray-500 hover:text-teal-600 hover:bg-teal-50"
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
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // State management
  const [currentMessage, setCurrentMessage] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<ScholarPersona | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);

  // Suggestion chips
  const suggestionChips = [
    "What is the meaning of compassion?",
    "How do I find inner peace?",
    "Explain the concept of divine love",
    "What is the purpose of suffering?",
    "How can I practice forgiveness?"
  ];

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      if (SpeechRecognition) {
        setIsVoiceSupported(true);
        const recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
          setIsListening(true);
          console.log('🎤 Voice recognition started');
        };
        
        recognition.onresult = (event) => {
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            }
          }
          
          if (finalTranscript) {
            setVoiceTranscript(finalTranscript.trim());
            setCurrentMessage(finalTranscript.trim());
            console.log('🎤 Final transcript:', finalTranscript);
          }
        };
        
        recognition.onerror = (event) => {
          console.error('🎤 Speech recognition error:', event.error);
          setIsListening(false);
          toast({
            title: "Voice Input Error",
            description: "Please try again or use text input",
            variant: "destructive"
          });
        };
        
        recognition.onend = () => {
          setIsListening(false);
          console.log('🎤 Voice recognition ended');
        };
        
        recognitionRef.current = recognition;
      }
    }
  }, [toast]);

  // Auto-select religion-specific persona
  useEffect(() => {
    if (context.religion) {
      const religionPersona = getPersonaForReligion(context.religion);
      if (religionPersona && (!selectedPersona || selectedPersona.primaryReligion !== context.religion)) {
        setSelectedPersona(religionPersona);
      }
    }
  }, [context.religion, selectedPersona]);

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
            message: enhancedMessage,
            context: {
              religion: context.religion,
              book: context.book,
              chapter: context.chapter,
              persona: messageData.personaContext?.name || null
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
      setVoiceTranscript("");
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

  // Voice input handlers
  const handleVoiceStart = () => {
    if (!isVoiceSupported || !recognitionRef.current) {
      toast({
        title: "Voice Not Supported",
        description: "Please use text input instead",
        variant: "destructive"
      });
      return;
    }
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      toast({
        title: "Voice Input Error",
        description: "Failed to start voice recognition",
        variant: "destructive"
      });
    }
  };

  const handleVoiceStop = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  // Message handlers
  const handleSendMessage = (messageOverride?: string) => {
    const messageToSend = messageOverride || currentMessage;
    if (!messageToSend.trim()) return;
    
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
    setVoiceTranscript("");
    
    // Invalidate current session queries to force refresh
    queryClient.invalidateQueries({ queryKey: ['/api/chat', currentSessionId] });
    
    toast({
      title: "Chat Cleared",
      description: "Started a fresh conversation",
      variant: "default"
    });
  };

  return (
    <Card className="w-full bg-white shadow-lg rounded-xl overflow-hidden">
      {/* Title Bar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Aura Archivist</h2>
            <p className="text-sm text-gray-600">Universal Wisdom Explorer</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="text-gray-500 hover:text-teal-600"
            title="Chat History"
          >
            <History className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            className="text-gray-500 hover:text-red-600"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-teal-600"
            title="Compare Perspectives"
          >
            <GitCompare className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-teal-600"
            title="Bookmarks"
          >
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Voice Orb */}
      <div className="flex justify-center py-6 bg-gradient-to-b from-gray-50 to-white">
        <VoiceOrb
          isListening={isListening}
          isProcessing={isProcessing}
          onClick={handleVoiceStart}
          onStop={handleVoiceStop}
          disabled={isStreaming}
        />
      </div>

      {/* Messages Area */}
      <div className="flex-1 h-96 overflow-hidden">
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
            <div className="flex flex-col items-center justify-center py-8 text-center">
              {/* Welcome Section */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Welcome to Enlightened Discourse
                </h3>
                <p className="text-sm text-gray-600 max-w-md">
                  Ask questions about spirituality, wisdom traditions, and sacred texts. 
                  I'm here to provide insights from various religious and philosophical perspectives.
                </p>
              </div>
              
              {/* Suggestion Chips */}
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
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
            <div className="py-4 space-y-1">
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
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:0.2s]" />
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

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <Input
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask your question..."
            className="flex-1 rounded-full border-gray-300 focus:border-teal-500 focus:ring-teal-500"
            disabled={isStreaming}
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!currentMessage.trim() || isStreaming}
            className="rounded-full w-10 h-10 p-0 bg-teal-500 hover:bg-teal-600 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

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