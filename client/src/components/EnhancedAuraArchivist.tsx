import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Send, 
  Bot, 
  User, 
  History, 
  Bookmark,
  MessageCircle,
  Sparkles,
  Clock,
  BookOpen,
  Brain,
  Heart,
  Eye,
  Zap,
  Play,
  Star,
  Mic,
  MicOff,
  Square,
  Pause,
  Settings,
  ChevronUp,
  ChevronDown,
  Volume2,
  Crown,
  Scroll,
  Flame,
  Compass,
  X
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Religion, ChatMessage } from "@shared/schema";
import { AudioPlaybackButton } from "@/components/chat/AudioPlaybackButton";
import { VoiceInputControls } from "@/components/chat/VoiceInputControls";
import { GrokStyleVoiceInterface } from "@/components/chat/GrokStyleVoiceInterface";
import { ScholarPersonaSelector, type ScholarPersona, getPersonaForReligion, PersonaBadge } from "@/components/chat/ScholarPersonas";
import { PersonaCustomizer } from "@/components/chat/PersonaCustomizer";
import { ChatHistoryManager } from "@/components/chat/ChatHistoryManager";
import { VoiceFirstInterface } from "@/components/chat/VoiceFirstInterface";
import { GrokStyleOrb } from "@/components/chat/GrokStyleOrb";
import { MandalaOverlay } from "@/components/chat/MandalaOverlay";
import { SimpleVoiceTest } from "./SimpleVoiceTest";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Scripture Content Component with Clickable References
function ScriptureContent({ 
  content, 
  onNavigateToVerse 
}: { 
  content: string;
  onNavigateToVerse?: (religion: Religion, book: string, chapter: number, verse?: number) => void;
}) {
  const parseScriptureReferences = (text: string) => {
    // Enhanced scripture reference patterns with variants and multi-part support
    const patterns = [
      // Bible references with abbreviations and variants
      { 
        regex: /\b(Genesis|Gen\.?|Exodus|Ex\.?|Exod\.?|Leviticus|Lev\.?|Numbers|Num\.?|Deuteronomy|Deut\.?|Joshua|Josh\.?|Judges|Judg\.?|Ruth|1\s?Samuel|1\s?Sam\.?|2\s?Samuel|2\s?Sam\.?|1\s?Kings|1\s?Kgs\.?|2\s?Kings|2\s?Kgs\.?|1\s?Chronicles|1\s?Chr\.?|2\s?Chronicles|2\s?Chr\.?|Ezra|Nehemiah|Neh\.?|Esther|Esth\.?|Job|Psalms?|Pss?\.?|Proverbs|Prov\.?|Ecclesiastes|Eccl\.?|Song of Songs|Song|Isaiah|Isa\.?|Jeremiah|Jer\.?|Lamentations|Lam\.?|Ezekiel|Ezek\.?|Daniel|Dan\.?|Hosea|Hos\.?|Joel|Amos|Obadiah|Obad\.?|Jonah|Micah|Mic\.?|Nahum|Nah\.?|Habakkuk|Hab\.?|Zephaniah|Zeph\.?|Haggai|Hag\.?|Zechariah|Zech\.?|Malachi|Mal\.?|Matthew|Matt\.?|Mark|Luke|John|Acts|Romans|Rom\.?|1\s?Corinthians|1\s?Cor\.?|2\s?Corinthians|2\s?Cor\.?|Galatians|Gal\.?|Ephesians|Eph\.?|Philippians|Phil\.?|Colossians|Col\.?|1\s?Thessalonians|1\s?Thess\.?|2\s?Thessalonians|2\s?Thess\.?|1\s?Timothy|1\s?Tim\.?|2\s?Timothy|2\s?Tim\.?|Titus|Tit\.?|Philemon|Phlm\.?|Hebrews|Heb\.?|James|Jas\.?|1\s?Peter|1\s?Pet\.?|2\s?Peter|2\s?Pet\.?|1\s?John|2\s?John|3\s?John|Jude|Revelation|Rev\.?)\s+(\d+):(\d+)(?:[-–](\d+))?/gi, 
        religion: 'bible' as Religion 
      },
      // Quran references with comprehensive variants and multi-verse support
      { 
        regex: /\b(?:Quran|Qur'an|Qur'ān|Koran|Al-Quran|Al-Qur'an)\s+(\d+):(\d+)(?:[-–](\d+))?/gi, 
        religion: 'quran' as Religion 
      },
      // Surah references with name and number variations
      { 
        regex: /\b(?:Surah|Sura)\s+(?:Al-)?([A-Za-z-\s']+)\s*(?:\([\w\s]+\))?\s*(\d+):(\d+)(?:[-–](\d+))?/gi, 
        religion: 'quran' as Religion 
      },
      { 
        regex: /\b(Quran|Qur'an)\s+(\d+):(\d+)(?:-\d+)?/gi, 
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

  return (
    <div 
      className="prose prose-sm max-w-none leading-relaxed text-gray-900"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: parseScriptureReferences(content) }}
    />
  );
}

interface EnhancedAuraArchivistProps {
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

// Enhanced Message Component with Persona-Driven Responses
function ArchivistMessage({ 
  message, 
  persona, 
  onNavigateToVerse,
  onBookmark 
}: { 
  message: ChatMessage;
  persona: ScholarPersona | null;
  onNavigateToVerse?: (religion: Religion, book: string, chapter: number, verse?: number) => void;
  onBookmark?: (content: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayContent = isExpanded ? message.content : (message.content.length > 300 ? message.content.slice(0, 300) + '...' : message.content);
  const needsTruncation = message.content.length > 300;

  return (
    <div className="flex gap-3 animate-in fade-in duration-300">
      {/* Avatar with Persona Styling */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm",
        message.type === 'user' 
          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
          : persona 
            ? cn(persona.bgColor, 'border border-gray-200')
            : 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white'
      )}>
        {message.type === 'user' ? (
          <User className="h-4 w-4" />
        ) : persona ? (
          <persona.icon className={cn("h-4 w-4", persona.iconColor)} />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      
      {/* Message Content */}
      <div className="flex-1 space-y-2">
        {/* Persona Header for AI messages */}
        {message.type === 'ai' && persona && (
          <PersonaBadge persona={persona} />
        )}
        
        {/* Message Bubble */}
        <div className={cn(
          "p-3 rounded-xl shadow-sm transition-all",
          message.type === 'user' 
            ? 'bg-gray-100 text-gray-800 ml-auto max-w-[85%]' 
            : 'bg-white border border-gray-200 text-gray-800'
        )}>
          {message.type === 'user' ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
          ) : (
            <ScriptureContent 
              content={displayContent}
              onNavigateToVerse={onNavigateToVerse}
            />
          )}
          
          {/* Read More/Less for long messages */}
          {needsTruncation && message.type === 'ai' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-teal-600 hover:text-teal-800 hover:bg-teal-50 mt-2"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Show Less' : 'Read More'}
            </Button>
          )}
        </div>
        
        {/* Action Buttons for AI messages */}
        {message.type === 'ai' && (
          <div className="flex items-center gap-2">
            <AudioPlaybackButton 
              text={message.content}
              voiceId={persona?.elevenLabsVoice}
              voiceTone={persona?.voiceTone}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-gray-500 hover:text-teal-600 hover:bg-teal-50"
              onClick={() => onBookmark?.(message.content)}
            >
              <Bookmark className="w-3 h-3 mr-1" />
              Save
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function EnhancedAuraArchivist({
  sessionId,
  context,
  externalMessage,
  onExternalMessageProcessed,
  onCopyOperation,
  onNavigateToVerse
}: EnhancedAuraArchivistProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  // Enhanced State Management with Grok-like Features
  const [currentMessage, setCurrentMessage] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<ScholarPersona | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [isInterrupted, setIsInterrupted] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [isStreaming, setIsStreaming] = useState(false);
  const [orbState, setOrbState] = useState<'idle' | 'listening' | 'processing' | 'responding' | 'interrupted'>('idle');
  const [voiceMode, setVoiceMode] = useState(true); // Enable voice mode by default
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [customPersona, setCustomPersona] = useState<Partial<ScholarPersona> | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showPersonaBanner, setShowPersonaBanner] = useState(false);
  const [bannerTimeout, setBannerTimeout] = useState<NodeJS.Timeout | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{id: string, content: string, type: 'user' | 'ai', timestamp: number}>>([]);
  const [audioState, setAudioState] = useState<'idle' | 'listening' | 'processing' | 'responding' | 'interrupted'>('idle');
  // Removed duplicate voiceMode declaration

  // Load saved persona and custom settings from localStorage
  useEffect(() => {
    const savedPersonaId = localStorage.getItem('rellio-selected-persona');
    const savedCustomPersona = localStorage.getItem('rellio-custom-persona');
    
    if (savedCustomPersona) {
      try {
        const customData = JSON.parse(savedCustomPersona);
        setCustomPersona(customData);
      } catch (error) {
        console.error('Failed to load custom persona:', error);
      }
    }
    
    if (savedPersonaId && !selectedPersona) {
      if (savedPersonaId === 'user-custom' && customPersona) {
        // Custom personas are not supported in religion-specific mode
        console.log('Custom personas not available in religion-specific mode');
      } else {
        // Load religion-specific persona if appropriate
        const religionPersona = getPersonaForReligion(context.religion);
        if (religionPersona && religionPersona.id === savedPersonaId) {
          setSelectedPersona(religionPersona);
        }
      }
    }
  }, [customPersona, selectedPersona]);

  // Auto-select religion-specific persona when entering a religious text
  useEffect(() => {
    if (context.religion) {
      const religionPersona = getPersonaForReligion(context.religion);
      if (religionPersona && (!selectedPersona || selectedPersona.primaryReligion !== context.religion)) {
        setSelectedPersona(religionPersona);
        
        // Show banner for 3 seconds, then transform to button
        setShowPersonaBanner(true);
        
        // Clear existing timeout
        if (bannerTimeout) {
          clearTimeout(bannerTimeout);
        }
        
        // Set new timeout to collapse banner
        const timeout = setTimeout(() => {
          setShowPersonaBanner(false);
        }, 3000);
        setBannerTimeout(timeout);
        
        toast({
          title: "Spiritual Guide Available",
          description: `${religionPersona.name} is ready to guide you through ${context.religion === 'christianity' ? 'the Bible' : context.religion === 'islam' ? 'the Quran' : context.religion === 'judaism' ? 'the Torah' : context.religion === 'hinduism' ? 'Hindu scriptures' : 'Buddhist texts'}`,
          variant: "default"
        });
      }
    } else {
      // Clear persona when not in any religious text
      setSelectedPersona(null);
      setShowPersonaBanner(false);
      if (bannerTimeout) {
        clearTimeout(bannerTimeout);
        setBannerTimeout(null);
      }
    }
  }, [context.religion, toast]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (bannerTimeout) {
        clearTimeout(bannerTimeout);
      }
    };
  }, [bannerTimeout]);

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

  // Guest access tracking
  const { isGuest, user } = useAuth();
  const [guestQuestionCount, setGuestQuestionCount] = useState(0);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const GUEST_QUESTION_LIMIT = 4;

  // Load guest question count from localStorage
  useEffect(() => {
    if (isGuest) {
      const stored = localStorage.getItem('guestQuestionCount');
      if (stored) {
        setGuestQuestionCount(parseInt(stored, 10));
      }
    }
  }, [isGuest]);

  // Send message mutation with persona context
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { message: string; personaContext?: ScholarPersona }) => {
      // Check guest limits before sending
      if (isGuest && guestQuestionCount >= GUEST_QUESTION_LIMIT) {
        setShowSignupPrompt(true);
        throw new Error('Guest question limit reached. Please sign up for unlimited access.');
      }

      setIsStreaming(true);
      try {
        // Enhanced prompt with persona context
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
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat', currentSessionId] });
      setCurrentMessage("");
      setVoiceTranscript("");
      setAudioState('responding');
      
      // Track guest questions
      if (isGuest) {
        const newCount = guestQuestionCount + 1;
        setGuestQuestionCount(newCount);
        localStorage.setItem('guestQuestionCount', newCount.toString());
        
        // Show signup prompt if approaching limit
        if (newCount >= GUEST_QUESTION_LIMIT) {
          setShowSignupPrompt(true);
        }
      }
      
      // Add AI response to conversation history
      if (data?.aiMessage) {
        const newAiMessage = {
          id: Date.now().toString() + '_ai',
          content: data.aiMessage.content,
          type: 'ai' as const,
          timestamp: Date.now()
        };
        setConversationHistory(prev => [...prev, newAiMessage]);
      }
      
      setTimeout(() => setAudioState('idle'), 1000);
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
      sendMessageMutation.mutate({
        message: externalMessage,
        personaContext: selectedPersona || undefined
      });
      onExternalMessageProcessed?.();
    }
  }, [externalMessage, sendMessageMutation, onExternalMessageProcessed, selectedPersona]);

  // Auto-scroll to bottom
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (messageOverride?: string) => {
    const messageToSend = messageOverride || currentMessage || voiceTranscript;
    console.log('📤 handleSendMessage called with:', { messageOverride, currentMessage, voiceTranscript, messageToSend });
    
    if (!messageToSend.trim()) {
      console.log('❌ No message to send - empty or whitespace only');
      return;
    }
    
    console.log('✅ Sending message:', messageToSend);
    
    // Update conversation history for context retention
    const newUserMessage = {
      id: Date.now().toString(),
      content: messageToSend,
      type: 'user' as const,
      timestamp: Date.now()
    };
    
    setConversationHistory(prev => [...prev, newUserMessage]);
    setAudioState('processing');
    
    sendMessageMutation.mutate({
      message: messageToSend,
      personaContext: selectedPersona || undefined
    });
  };

  const handleVoiceTranscript = (transcript: string) => {
    setVoiceTranscript(transcript);
  };

  const handleVoiceSend = (transcript: string) => {
    handleSendMessage(transcript);
  };

  // Remove duplicate - using enhanced version below

  const handleNewSession = () => {
    const newSessionId = `session_${Date.now()}`;
    setCurrentSessionId(newSessionId);
    queryClient.invalidateQueries({ queryKey: ['/api/chat'] });
  };

  const handlePersonaSelect = (persona: ScholarPersona | null) => {
    setSelectedPersona(persona);
    
    // Save selection to localStorage
    if (persona) {
      localStorage.setItem('rellio-selected-persona', persona.id);
      
      // If custom persona, also save its data
      if (persona.id === 'user-custom' && customPersona) {
        localStorage.setItem('rellio-custom-persona', JSON.stringify(customPersona));
      }
      
      toast({
        title: "Scholar Guide Selected",
        description: `${persona.name} is now your spiritual companion`,
        variant: "default"
      });
    } else {
      localStorage.removeItem('rellio-selected-persona');
    }
  };

  const handleCustomPersonaSave = (customData: Partial<ScholarPersona>) => {
    setCustomPersona(customData);
    
    // Custom personas are not supported in religion-specific mode
    console.log('Custom persona creation not available in religion-specific mode');
    
    // Religion-specific personas cannot be customized
    toast({
      title: "Custom Personas Unavailable",
      description: "Use the dedicated spiritual guides for each religious tradition",
      variant: "default"
    });
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
    const updated = [bookmark, ...existing].slice(0, 50); // Keep max 50 bookmarks
    localStorage.setItem('rellio-bookmarks', JSON.stringify(updated));
    
    toast({
      title: "Wisdom Preserved",
      description: "Response saved to your spiritual collection",
      variant: "default"
    });
  };

  // Enhanced interruption with context retention
  const handleInterrupt = useCallback(() => {
    if (isStreaming) {
      console.log('🛑 Interrupting AI response with context retention');
      setIsStreaming(false);
      setIsInterrupted(true);
      setOrbState('interrupted');
      
      // Retain conversation context for seamless continuation
      const lastMessages = conversationHistory.slice(-3); // Keep last 3 for context
      
      toast({
        title: "Response Interrupted",
        description: "Context retained - continue your conversation",
        variant: "default"
      });
      
      setTimeout(() => {
        setIsInterrupted(false);
        setOrbState('idle');
      }, 2000);
    }
  }, [isStreaming, conversationHistory, toast]);

  // Enhanced persona switching based on context
  const getActivePersona = useCallback(() => {
    if (context.religion) {
      const religionPersona = getPersonaForReligion(context.religion);
      if (religionPersona) return religionPersona;
    }
    return selectedPersona; // Fallback to manually selected or default
  }, [context.religion, selectedPersona]);

  // Get contextual header text with dynamic persona
  const getHeaderText = () => {
    const activePersona = getActivePersona();
    if (context.religion && context.book) {
      return `${activePersona?.name || 'Universal Guide'} • ${context.book} Ch.${context.chapter}`;
    }
    if (context.religion) {
      return `${activePersona?.name || 'Spiritual Guide'} • ${context.religion}`;
    }
    return activePersona?.name || 'Universal Wisdom Explorer';
  };

  // Dynamic orb state management
  const getOrbColor = () => {
    switch(orbState) {
      case 'listening': return 'from-teal-400 to-cyan-500';
      case 'processing': return 'from-purple-400 to-indigo-500';
      case 'responding': return 'from-blue-400 to-purple-500';
      case 'interrupted': return 'from-red-400 to-orange-500';
      default: return 'from-teal-500 to-cyan-600';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Mandala Spiritual Overlay */}
      <MandalaOverlay opacity={0.08} />
      
      {/* Compact Header with Spiritual Gradient */}
      <div className="flex-shrink-0 relative bg-gradient-to-r from-purple-50 via-white to-yellow-50 border-b border-gray-100 p-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {/* Dynamic Grok-style Orb Indicator */}
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-all duration-300",
              `bg-gradient-to-br ${getOrbColor()}`,
              orbState === 'listening' && "animate-pulse scale-110",
              orbState === 'processing' && "animate-spin",
              orbState === 'responding' && "animate-pulse",
              orbState === 'interrupted' && "animate-bounce"
            )}>
              {orbState === 'listening' ? (
                <Mic className="h-3 w-3 text-white" />
              ) : orbState === 'processing' ? (
                <Brain className="h-3 w-3 text-white animate-pulse" />
              ) : orbState === 'responding' ? (
                <Volume2 className="h-3 w-3 text-white" />
              ) : orbState === 'interrupted' ? (
                <X className="h-3 w-3 text-white" />
              ) : (
                <Brain className="h-3 w-3 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Universal Wisdom Explorer</h2>
              <p className="text-xs text-gray-600">{getHeaderText()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Voice Mode Indicator */}
            <Badge 
              variant={voiceMode ? "default" : "secondary"} 
              className={cn(
                "text-xs",
                voiceMode ? "bg-teal-100 text-teal-800" : "bg-gray-100 text-gray-600"
              )}
            >
              {voiceMode ? "Voice Active" : "Text Mode"}
            </Badge>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-gray-500 hover:text-teal-600"
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-600 hover:text-gray-800"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Persona Information Banner or Compact Button */}
        {selectedPersona && showPersonaBanner ? (
          // Full banner that appears when persona first activates
          <div className="mb-2 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 animate-in fade-in duration-500">
            <div className="flex items-center gap-3">
              <selectedPersona.icon className={cn("h-6 w-6", selectedPersona.iconColor)} />
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-gray-900">{selectedPersona.name}</h3>
                <p className="text-xs text-gray-600">{selectedPersona.description}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPersonaBanner(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : selectedPersona ? (
          // Compact button that shows after banner disappears
          <div className="mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPersonaBanner(true)}
              className="w-full justify-start text-xs h-8 border-purple-200 bg-purple-50/50 hover:bg-purple-100 text-purple-800"
            >
              <selectedPersona.icon className={cn("h-3 w-3 mr-2", selectedPersona.iconColor)} />
              {selectedPersona.name} Active
              <ChevronDown className="h-3 w-3 ml-auto" />
            </Button>
          </div>
        ) : (
          // Message when no persona is active
          <div className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 text-center">
              Select a religious text to access your dedicated spiritual guide
            </p>
          </div>
        )}
      </div>

      {/* Maximized Messages Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-2">
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
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Welcome to Enlightened Discourse</h3>
              <p className="text-sm text-gray-600 mb-4 max-w-sm mx-auto">
                Begin your spiritual journey with voice or text. Our scholar guides await your questions.
              </p>
              
              {/* Quick Spiritual Prompts */}
              <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                {[
                  "What is the meaning of compassion?",
                  "How do I find inner peace?",
                  "Explain this verse's wisdom",
                  "Compare religious perspectives"
                ].map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendMessage(prompt)}
                    className="text-xs text-teal-600 border-teal-200 hover:bg-teal-50"
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <ArchivistMessage
                  key={message.id}
                  message={message}
                  persona={selectedPersona}
                  onNavigateToVerse={onNavigateToVerse}
                  onBookmark={handleBookmark}
                />
              ))}
              
              {/* Streaming indicator */}
              {isStreaming && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                    <p className="text-sm text-gray-600">
                      {selectedPersona?.name || 'Aura Archivist'} is contemplating your question...
                    </p>
                  </div>
                </div>
              )}
              
              <div ref={messageEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* EMERGENCY WORKING VOICE - BYPASSING REACT */}
      <div 
        className="p-6 border-t border-gray-200 bg-yellow-100"
        dangerouslySetInnerHTML={{
          __html: `
            <div style="max-width: 400px; margin: 0 auto;">
              <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; border: 1px solid #ddd;">
                <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">🔥 EMERGENCY VOICE TEST</h3>
                <p style="font-size: 14px; color: #666; margin-bottom: 20px;">This bypasses React - should work!</p>
                
                <button 
                  onclick="
                    alert('🚨 RAW HTML BUTTON CLICKED!');
                    console.log('🚨🚨🚨 RAW HTML BUTTON WORKS!');
                    
                    try {
                      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
                      if (!SpeechRecognition) {
                        alert('❌ No speech support - use Chrome/Edge');
                        return;
                      }
                      
                      const recognition = new SpeechRecognition();
                      recognition.continuous = false;
                      recognition.interimResults = false;
                      recognition.lang = 'en-US';
                      
                      recognition.onstart = () => {
                        alert('🎤 LISTENING - SAY SOMETHING NOW!');
                        console.log('✅ Speech recognition started');
                      };
                      
                      recognition.onresult = (event) => {
                        const transcript = event.results[0][0].transcript;
                        alert('You said: ' + transcript);
                        console.log('🎯 Transcript:', transcript);
                        
                        // Send message via global function
                        if (window.sendVoiceMessage) {
                          window.sendVoiceMessage(transcript);
                        }
                      };
                      
                      recognition.onerror = (event) => {
                        alert('Speech error: ' + event.error);
                        console.error('❌ Speech error:', event.error);
                      };
                      
                      recognition.start();
                    } catch (error) {
                      alert('Error: ' + error);
                      console.error('❌ Error:', error);
                    }
                  "
                  style="
                    background: #3b82f6; 
                    color: white; 
                    border: none; 
                    padding: 12px 24px; 
                    border-radius: 8px; 
                    font-size: 16px; 
                    cursor: pointer;
                    font-weight: bold;
                  "
                >
                  🎤 RAW HTML VOICE
                </button>
              </div>
            </div>
          `
        }}
      />

      {/* Text Input Fallback */}
      {!voiceMode && (
        <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 rounded-lg">
          <Input
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            placeholder={getActivePersona() ? `Ask ${getActivePersona()?.name} about spiritual wisdom...` : "Ask about spiritual wisdom..."}
            className="flex-1 border-none bg-transparent focus:ring-0"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!currentMessage.trim() || sendMessageMutation.isPending}
            size="sm"
            className="bg-teal-500 hover:bg-teal-600"
          >
            <Send className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setVoiceMode(true)}
            size="sm"
            variant="outline"
            className="border-teal-200 text-teal-600 hover:bg-teal-50"
          >
            <Mic className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Persona Customizer Modal */}
      <PersonaCustomizer
        isOpen={showCustomizer}
        onClose={() => setShowCustomizer(false)}
        onSave={handleCustomPersonaSave}
        currentCustomization={customPersona || undefined}
      />

      {/* Chat History Sidebar */}
      <ChatHistoryManager
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        currentSessionId={currentSessionId}
        currentMessages={messages}
        currentPersona={selectedPersona}
        currentContext={context}
        onLoadSession={(entry) => {
          // Load historical session
          setCurrentSessionId(entry.sessionId);
          setSelectedPersona(entry.persona || null);
          setShowHistory(false);
          
          // Update query cache with historical messages
          queryClient.setQueryData(['/api/chat', entry.sessionId], entry.messages);
          
          toast({
            title: "Session Loaded",
            description: `Restored conversation with ${entry.persona?.name || 'Aura Archivist'}`,
          });
        }}
      />

      {/* Guest Signup Prompt Dialog */}
      <Dialog open={showSignupPrompt} onOpenChange={setShowSignupPrompt}>
        <DialogContent className="bg-white rounded-2xl border-0 shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-gray-800">
              <Crown className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              Unlock Full Access
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              You've reached your free question limit ({GUEST_QUESTION_LIMIT} questions). 
              Create an account to continue your spiritual journey with unlimited access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-6">
            <Button 
              onClick={() => window.location.href = '/auth'}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-semibold h-12 rounded-xl"
            >
              Create Free Account
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowSignupPrompt(false)}
              className="w-full rounded-xl"
            >
              Maybe Later
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            Join thousands exploring spiritual wisdom with AI guidance
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function EnhancedAuraArchivistWrapper(props: any) {
  return <EnhancedAuraArchivist {...props} />;
}