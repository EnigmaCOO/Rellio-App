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
import { ScholarPersonaSelector, type ScholarPersona, scholarPersonas } from "@/components/chat/ScholarPersonas";
import { ChatHistoryManager } from "@/components/chat/ChatHistoryManager";
import { MandalaOverlay } from "@/components/chat/MandalaOverlay";
import { cn } from "@/lib/utils";

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
  
  const parseScriptureReferences = (content: string) => {
    // Enhanced pattern matching for clickable scripture references
    const patterns = [
      { regex: /\b(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Songs|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation)\s+(\d+):(\d+)(?:-\d+)?/gi, religion: 'bible' as Religion },
      { regex: /\b(Quran|Qur'an)\s+(\d+):(\d+)(?:-\d+)?/gi, religion: 'quran' as Religion },
      { regex: /\b(Bhagavad\s+Gita)\s+(\d+):(\d+)(?:-\d+)?/gi, religion: 'hindu' as Religion }
    ];

    let processedContent = content;
    
    patterns.forEach(({ regex, religion }) => {
      processedContent = processedContent.replace(regex, (match, book, chapter, verse) => {
        return `<span class="scripture-ref cursor-pointer text-teal-600 hover:text-teal-800 hover:underline font-medium transition-colors" data-religion="${religion}" data-book="${book}" data-chapter="${chapter}" data-verse="${verse}">${match}</span>`;
      });
    });

    return processedContent;
  };

  const handleScriptureClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains('scripture-ref')) {
      const religion = target.dataset.religion as Religion;
      const book = target.dataset.book || '';
      const chapter = parseInt(target.dataset.chapter || '1', 10);
      const verse = target.dataset.verse ? parseInt(target.dataset.verse, 10) : undefined;
      
      onNavigateToVerse?.(religion, book, chapter, verse);
    }
  };

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
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={cn("text-xs", persona.textColor, persona.bgColor)}>
              {persona.name}
            </Badge>
            <span className="text-xs text-gray-500">{persona.title}</span>
          </div>
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
            <div 
              className="prose prose-sm max-w-none text-sm leading-relaxed cursor-pointer"
              dangerouslySetInnerHTML={{ __html: parseScriptureReferences(displayContent) }}
              onClick={handleScriptureClick}
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

  // Auto-select persona based on context
  useEffect(() => {
    if (context.religion && !selectedPersona) {
      const contextPersona = scholarPersonas.find(p => p.primaryReligion === context.religion);
      if (contextPersona) {
        setSelectedPersona(contextPersona);
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
    <Card className={cn(
      "bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 relative",
      isExpanded ? 'h-[70vh]' : 'h-[45vh]'
    )}>
      {/* Mandala Spiritual Overlay */}
      <MandalaOverlay opacity={0.08} />
      
      {/* Enhanced Header with Spiritual Gradient */}
      <div className="relative bg-gradient-to-r from-purple-50 via-white to-yellow-50 border-b border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-md">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Aura Archivist</h2>
              <p className="text-xs text-gray-600">{getHeaderText()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ChatHistoryManager
              currentSessionId={currentSessionId}
              onSessionSelect={setCurrentSessionId}
              onNewSession={handleNewSession}
              context={context}
            />
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
          onPersonaSelect={setSelectedPersona}
          context={context}
        />
      </div>

      {/* Messages Area */}
      <div className="flex-1 relative">
        <ScrollArea className="h-full p-4">
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
        </ScrollArea>
      </div>

      {/* Enhanced Input Area with Voice-First Design */}
      <div className="border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 space-y-3">
        {/* Voice Input Controls */}
        <VoiceInputControls
          onTranscript={handleVoiceTranscript}
          onSend={handleVoiceSend}
          disabled={sendMessageMutation.isPending}
          isStreaming={isStreaming}
          onInterrupt={handleInterrupt}
        />
        
        {/* Text Input Fallback */}
        <div className="flex gap-2">
          <Input
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder={
              selectedPersona 
                ? `Ask ${selectedPersona.name} about spiritual wisdom...`
                : "Ask about spiritual wisdom..."
            }
            className="flex-1 border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
            disabled={sendMessageMutation.isPending}
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!currentMessage.trim() || sendMessageMutation.isPending}
            className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-xl px-4 shadow-md hover:shadow-lg transition-all"
          >
            {sendMessageMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Status Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Powered by ancient wisdom • {messages.length} messages • 
            {selectedPersona ? ` Guided by ${selectedPersona.name}` : ' Universal perspective'}
          </p>
        </div>
      </div>
    </Card>
  );
}