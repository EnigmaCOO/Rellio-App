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
  Compass
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Religion, ChatMessage } from "@shared/schema";
import { AudioPlaybackButton } from "@/components/chat/AudioPlaybackButton";
import { VoiceInputControls } from "@/components/chat/VoiceInputControls";
import { ScholarPersonaSelector, type ScholarPersona, scholarPersonas, PersonaBadge } from "@/components/chat/ScholarPersonas";
import { PersonaCustomizer } from "@/components/chat/PersonaCustomizer";
import { ChatHistoryManager } from "@/components/chat/ChatHistoryManager";
import { VoiceFirstInterface } from "@/components/chat/VoiceFirstInterface";
import { GrokStyleOrb } from "@/components/chat/GrokStyleOrb";
import { MandalaOverlay } from "@/components/chat/MandalaOverlay";
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
    const patterns = [
      // Bible references
      { 
        regex: /\b(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Songs|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation)\s+(\d+):(\d+)(?:-\d+)?/gi, 
        religion: 'bible' as Religion 
      },
      // Quran references - comprehensive patterns
      { 
        regex: /\b(?:Quran|Qur'an|Qur'ān|Surah)\s+(?:Al-)?([A-Za-z-\s]+)\s*(?:\([\w\s]+\))?\s*(\d+):(\d+)(?:-\d+)?/gi, 
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
  
  // Enhanced State Management
  const [currentMessage, setCurrentMessage] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<ScholarPersona | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [isInterrupted, setIsInterrupted] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [isStreaming, setIsStreaming] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [customPersona, setCustomPersona] = useState<Partial<ScholarPersona> | null>(null);
  const [showHistory, setShowHistory] = useState(false);

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
        // Load custom persona
        const customScholarPersona: ScholarPersona = {
          ...scholarPersonas.find(p => p.id === 'user-custom')!,
          ...customPersona
        };
        setSelectedPersona(customScholarPersona);
      } else {
        // Load predefined persona
        const savedPersona = scholarPersonas.find(p => p.id === savedPersonaId);
        if (savedPersona) {
          setSelectedPersona(savedPersona);
        }
      }
    }
  }, [customPersona, selectedPersona]);

  // Auto-suggest persona based on context (only if no persona is selected)
  useEffect(() => {
    if (context.religion && !selectedPersona && !localStorage.getItem('rellio-selected-persona')) {
      // Auto-suggest based on religion
      let suggestedPersona: ScholarPersona | null = null;
      
      switch (context.religion) {
        case 'bible':
          suggestedPersona = scholarPersonas.find(p => p.id === 'historian-sage') || null;
          break;
        case 'quran':
          suggestedPersona = scholarPersonas.find(p => p.id === 'comparative-seeker') || null;
          break;
        case 'torah':
          suggestedPersona = scholarPersonas.find(p => p.id === 'philosopher-oracle') || null;
          break;
        case 'hindu':
          suggestedPersona = scholarPersonas.find(p => p.id === 'mystic-scholar') || null;
          break;
        case 'buddhist':
          suggestedPersona = scholarPersonas.find(p => p.id === 'mystic-scholar') || null;
          break;
        default:
          suggestedPersona = scholarPersonas.find(p => p.id === 'comparative-seeker') || null;
      }
      
      if (suggestedPersona) {
        setSelectedPersona(suggestedPersona);
        // Show toast suggestion
        toast({
          title: "Scholar Guide Suggested",
          description: `${suggestedPersona.name} is recommended for ${context.religion} studies`,
          variant: "default"
        });
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

  // Send message mutation with persona context
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { message: string; personaContext?: ScholarPersona }) => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat', currentSessionId] });
      setCurrentMessage("");
      setVoiceTranscript("");
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
    if (!messageToSend.trim()) return;
    
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

  const handleInterrupt = () => {
    setIsInterrupted(true);
    setIsStreaming(false);
    // Add visual feedback for interruption
    toast({
      title: "Response Interrupted",
      description: "You can now ask a new question",
      variant: "default"
    });
    setTimeout(() => setIsInterrupted(false), 2000);
  };

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
    
    // Create full custom persona
    const fullCustomPersona: ScholarPersona = {
      ...scholarPersonas.find(p => p.id === 'user-custom')!,
      ...customData
    };
    
    setSelectedPersona(fullCustomPersona);
    localStorage.setItem('rellio-custom-persona', JSON.stringify(customData));
    localStorage.setItem('rellio-selected-persona', 'user-custom');
    
    toast({
      title: "Personal Guide Customized",
      description: `${customData.name || 'Your guide'} has been personalized`,
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

  // Get contextual header text
  const getHeaderText = () => {
    if (context.religion && context.book) {
      return `Exploring ${context.book} Chapter ${context.chapter}`;
    }
    if (context.religion) {
      return `Spiritual Guide for ${context.religion}`;
    }
    return 'Universal Wisdom Explorer';
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Mandala Spiritual Overlay */}
      <MandalaOverlay opacity={0.08} />
      
      {/* Enhanced Header with Spiritual Gradient */}
      <div className="flex-shrink-0 relative bg-gradient-to-r from-purple-50 via-white to-yellow-50 border-b border-gray-100 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-md">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Aura Archivist</h2>
              <p className="text-xs text-gray-600">{getHeaderText()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
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

        {/* Scholar Persona Selector */}
        <ScholarPersonaSelector
          selectedPersona={selectedPersona}
          onPersonaSelect={handlePersonaSelect}
          context={context}
        />
        
        {/* Customization Button for User-Custom Persona */}
        {selectedPersona?.id === 'user-custom' && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2 text-xs"
            onClick={() => setShowCustomizer(true)}
          >
            <Settings className="h-3 w-3 mr-1" />
            Customize Your Guide
          </Button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-3">
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

      {/* Enhanced Input Area with Voice-First Design */}
      <div className="border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white p-3 space-y-2 flex-shrink-0">
        {/* Voice-First Interface */}
        <VoiceFirstInterface
          onSubmit={handleSendMessage}
          isStreaming={isStreaming}
          isInterrupted={isInterrupted}
          onInterrupt={handleInterrupt}
          placeholder={
            selectedPersona 
              ? `Ask ${selectedPersona.name} about spiritual wisdom...`
              : "Ask about spiritual wisdom..."
          }
          disabled={sendMessageMutation.isPending}
        />
        
        {/* Status Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Powered by ancient wisdom • {messages.length} messages • 
            {selectedPersona ? ` Guided by ${selectedPersona.name}` : ' Universal perspective'}
          </p>
        </div>
      </div>

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
            variant: "default"
          });
        }}
        onHighlightVerse={onNavigateToVerse as any}
      />
    </div>
  );
}