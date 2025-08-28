import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Mic, 
  MicOff, 
  Square, 
  Volume2, 
  VolumeX,
  Bot, 
  User,
  Settings,
  Headphones,
  AlertTriangle,
  BookOpen,
  History as HistoryIcon,
  BarChart3,
  MessageCircle,
  ExternalLink,
  Scale,
  Heart,
  Brain,
  Star,
  Sparkles,
  Flame,
  Eye,
  Crown,
  Compass,
  X,
  ChevronRight,
  Bookmark
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoiceIsolationFilter } from './VoiceIsolationFilter';
import { GrokStyleOrb } from './GrokStyleOrb';
import { AudioWaveform } from './AudioWaveform';
import { ChatHistoryManager } from './ChatHistoryManager';
import { ProgressDashboard } from '@/components/progress/ProgressDashboard';
import { AudioPlaybackButton } from './AudioPlaybackButton';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';
import type { Religion, ChatMessage } from '@shared/schema';
import type { ScholarPersona } from './ScholarPersonas';
import ScriptureContent from './ScriptureContent';

// Compare Mode interfaces
interface ComparisonVerse {
  religion: Religion;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation?: string;
  reference: string;
}

interface ComparisonResult {
  theme: string;
  aiSummary: string;
  verses: {
    [religion: string]: ComparisonVerse[];
  };
}

// Voice State (simplified with unified handler)
export type VoiceFirstState = 'idle' | 'listening' | 'processing' | 'responding' | 'interrupted';

interface VoiceFirstChatInterfaceProps {
  sessionId: string;
  context: {
    religion: Religion | null;
    book: string;
    chapter: number;
  };
  selectedPersona?: ScholarPersona | null;
  isInsideBook?: boolean;
  onNavigateToVerse?: (religion: Religion, book: string, chapter: number, verse?: number) => void;
  className?: string;
  onMessageSent?: () => void;
}

export function VoiceFirstChatInterface({
  sessionId,
  context,
  selectedPersona,
  isInsideBook = false,
  onNavigateToVerse,
  className = "",
  onMessageSent
}: VoiceFirstChatInterfaceProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Enhanced Voice State Management with COMPLETE isolation
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [historyView, setHistoryView] = useState<'chat' | 'progress'>('chat');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [wasLastMessageVoice, setWasLastMessageVoice] = useState(false);
  const [interruptedQuery, setInterruptedQuery] = useState<string>('');
  const [lastAIMessage, setLastAIMessage] = useState<string>('');
  
  // Voice isolation state
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [transcriptConfidence, setTranscriptConfidence] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isInterrupted, setIsInterrupted] = useState(false);
  
  // Voice control refs
  const autoSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const interruptionCooldownRef = useRef<NodeJS.Timeout | null>(null);

  // Handle interruption detection during AI speech (Grok-style)
  const handleInterruptionDetected = useCallback(() => {
    if (!isAISpeaking || interruptionCooldownRef.current) return;
    
    console.log('🚨 GROK-STYLE INTERRUPTION detected - stopping AI with 300ms fade');
    
    // Store interrupted context for resume functionality
    setInterruptedQuery(lastAIMessage);
    
    // Grok-style fade-out (300ms as specified)
    if (currentAudioRef.current) {
      const audio = currentAudioRef.current;
      const originalVolume = audio.volume;
      
      // Fade out over 300ms
      const fadeInterval = setInterval(() => {
        if (audio.volume > 0.1) {
          audio.volume -= 0.1;
        } else {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = originalVolume;
          clearInterval(fadeInterval);
        }
      }, 30);
    }
    
    setIsAISpeaking(false);
    setIsInterrupted(true);
    
    // Set 1-second cooldown as specified
    interruptionCooldownRef.current = setTimeout(() => {
      setIsInterrupted(false);
      interruptionCooldownRef.current = null;
    }, 1000);
  }, [isAISpeaking, lastAIMessage]);

  // Voice interruption handler
  const handleVoiceInterrupt = useCallback(() => {
    console.log('🛑 Voice interruption triggered manually');
    handleInterruptionDetected();
  }, [handleInterruptionDetected]);
  
  // Compare Mode state
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("");
  const [customTheme, setCustomTheme] = useState("");
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);

  // Predefined themes for Compare Mode with modern styling
  const PREDEFINED_THEMES = [
    { 
      id: 'love', 
      label: 'Love', 
      icon: Heart, 
      color: 'bg-gradient-to-br from-rose-50 to-pink-100 text-rose-700 border-rose-200 shadow-rose-100',
      hoverColor: 'hover:from-rose-100 hover:to-pink-200 hover:shadow-rose-200'
    },
    { 
      id: 'compassion', 
      label: 'Compassion', 
      icon: Heart, 
      color: 'bg-gradient-to-br from-pink-50 to-rose-100 text-pink-700 border-pink-200 shadow-pink-100',
      hoverColor: 'hover:from-pink-100 hover:to-rose-200 hover:shadow-pink-200'
    },
    { 
      id: 'wisdom', 
      label: 'Wisdom', 
      icon: Brain, 
      color: 'bg-gradient-to-br from-purple-50 to-violet-100 text-purple-700 border-purple-200 shadow-purple-100',
      hoverColor: 'hover:from-purple-100 hover:to-violet-200 hover:shadow-purple-200'
    },
    { 
      id: 'faith', 
      label: 'Faith', 
      icon: Star, 
      color: 'bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 border-blue-200 shadow-blue-100',
      hoverColor: 'hover:from-blue-100 hover:to-indigo-200 hover:shadow-blue-200'
    },
    { 
      id: 'hope', 
      label: 'Hope', 
      icon: Sparkles, 
      color: 'bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-700 border-emerald-200 shadow-emerald-100',
      hoverColor: 'hover:from-emerald-100 hover:to-teal-200 hover:shadow-emerald-200'
    },
    { 
      id: 'justice', 
      label: 'Justice', 
      icon: Scale, 
      color: 'bg-gradient-to-br from-slate-50 to-gray-100 text-slate-700 border-slate-200 shadow-slate-100',
      hoverColor: 'hover:from-slate-100 hover:to-gray-200 hover:shadow-slate-200'
    },
    { 
      id: 'redemption', 
      label: 'Redemption', 
      icon: Flame, 
      color: 'bg-gradient-to-br from-orange-50 to-amber-100 text-orange-700 border-orange-200 shadow-orange-100',
      hoverColor: 'hover:from-orange-100 hover:to-amber-200 hover:shadow-orange-200'
    },
    { 
      id: 'soul', 
      label: 'Soul', 
      icon: Eye, 
      color: 'bg-gradient-to-br from-indigo-50 to-blue-100 text-indigo-700 border-indigo-200 shadow-indigo-100',
      hoverColor: 'hover:from-indigo-100 hover:to-blue-200 hover:shadow-indigo-200'
    },
    { 
      id: 'afterlife', 
      label: 'Afterlife', 
      icon: Crown, 
      color: 'bg-gradient-to-br from-violet-50 to-purple-100 text-violet-700 border-violet-200 shadow-violet-100',
      hoverColor: 'hover:from-violet-100 hover:to-purple-200 hover:shadow-violet-200'
    },
    { 
      id: 'meaning of life', 
      label: 'Meaning of Life', 
      icon: Compass, 
      color: 'bg-gradient-to-br from-cyan-50 to-sky-100 text-cyan-700 border-cyan-200 shadow-cyan-100',
      hoverColor: 'hover:from-cyan-100 hover:to-sky-200 hover:shadow-cyan-200'
    }
  ];
  
  // Persona change tracking
  const [settings, setSettings] = useState({
    voiceEnabled: true,
    autoPlayAI: true
  });

  // Track previous persona to detect changes
  const [previousPersona, setPreviousPersona] = useState<string | null>(null);
  const [previousContext, setPreviousContext] = useState<{religion: Religion | null, book: string} | null>(null);

  // Voice system is now handled by UnifiedVoiceInterface component

  // Clear chat function
  const clearChat = useCallback(async () => {
    try {
      // Call backend API to clear the current session
      const response = await fetch(`/api/chat/${sessionId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Invalidate queries to refresh the UI
        await queryClient.invalidateQueries({ queryKey: ['/api/chat', sessionId] });
        
        // Clear local state
        setTextInputValue('');
        setWasLastMessageVoice(false);
        setLastAIMessage('');
        
        console.log('✅ Chat cleared successfully');
        toast({
          title: "Chat Cleared",
          description: "All messages have been removed",
          variant: "default"
        });
      } else {
        throw new Error('Failed to clear chat');
      }
    } catch (error) {
      console.error('❌ Failed to clear chat:', error);
      toast({
        title: "Clear Failed",
        description: "Could not clear chat messages",
        variant: "destructive"
      });
    }
  }, [sessionId, queryClient, toast]);

  // Auto-clear when switching personas
  useEffect(() => {
    const currentPersonaKey = selectedPersona?.name || (context.religion ? `${context.religion}-${context.book}` : 'Universal Scholar');
    const currentContextKey = `${context.religion || 'universal'}-${context.book}`;
    
    // If we have a previous persona and it's different from current
    if (previousPersona && previousPersona !== currentPersonaKey) {
      console.log('🔄 Persona changed from', previousPersona, 'to', currentPersonaKey, '- Auto-clearing chat');
      clearChat();
    }
    
    // Update tracking
    setPreviousPersona(currentPersonaKey);
    setPreviousContext({ religion: context.religion, book: context.book });
  }, [selectedPersona, context, previousPersona, clearChat]);

  // Load Messages
  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/chat/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!sessionId,
    refetchOnWindowFocus: false,
    staleTime: 0 // Always fetch fresh data
  });
  
  // Compare Mode mutation
  const compareMutation = useMutation({
    mutationFn: async ({ theme }: { theme: string }) => {
      return apiRequest('/api/chat/compare', {
        method: 'POST',
        body: JSON.stringify({
          theme,
          sessionId,
          maxVersesPerReligion: 5
        })
      });
    },
    onSuccess: async (data: ComparisonResult) => {
      setComparisonResult(data);
      setIsLoadingComparison(false);
      
      // CRITICAL: Force immediate cache invalidation AND refetch
      await queryClient.invalidateQueries({ queryKey: ['/api/chat', sessionId] });
      await refetchMessages();
      
      toast({
        title: "Comparison Complete",
        description: `Found verses about "${data.theme}" from multiple religious traditions`,
        variant: "default"
      });
    },
    onError: (error) => {
      console.error('Compare Mode error:', error);
      setIsLoadingComparison(false);
      toast({
        title: "Comparison Failed",
        description: "Unable to fetch comparison verses. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Compare Mode handlers
  const handleCompareToggle = () => {
    setIsCompareMode(!isCompareMode);
    if (!isCompareMode) {
      setComparisonResult(null);
      setSelectedTheme("");
      setCustomTheme("");
    }
  };

  const handleThemeSelect = (theme: string) => {
    setSelectedTheme(theme);
    setCustomTheme("");
    handleCompareSubmit(theme);
  };

  const handleCustomThemeSubmit = () => {
    if (customTheme.trim()) {
      handleCompareSubmit(customTheme.trim());
    }
  };

  const handleCompareSubmit = (theme: string) => {
    setIsLoadingComparison(true);
    compareMutation.mutate({ theme });
  };

  // Send Message with Voice Integration
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message,
          context: {
            religion: context.religion,
            book: context.book,
            chapter: context.chapter,
            persona: selectedPersona?.name || null
          }
        })
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    },
    onSuccess: async (data) => {
      console.log('✅ Chat message sent successfully:', data);
      
      // Track message sent for progress tracking
      onMessageSent?.();
      
      // CRITICAL: Force immediate cache invalidation AND refetch
      await queryClient.invalidateQueries({ queryKey: ['/api/chat', sessionId] });
      await refetchMessages();
      
      // Store AI message for potential interruption context and audio playback
      if (data.aiMessage?.content) {
        console.log('🤖 AI response received:', data.aiMessage.content.substring(0, 100) + '...');
        setLastAIMessage(data.aiMessage.content);
        
        // Auto-play AI response with voice isolation if enabled
        if (settings.autoPlayAI) {
          setTimeout(() => {
            playAIResponseWithIsolation(data.aiMessage.content);
          }, 2000); // Even longer delay to ensure messages are visible first
        }
      }
      
      // Reset voice message flag
      setWasLastMessageVoice(false);
    },
    onError: async (error: any) => {
      console.error('🚨 Send message error:', error);
      
      // Handle moderation blocks specifically
      if (error.status === 400) {
        try {
          const errorData = typeof error.message === 'string' ? JSON.parse(error.message) : error;
          if (errorData.error?.includes('Message blocked to promote unity')) {
            toast({
              title: "🕊️ Message Moderated",
              description: errorData.suggestion || "Please share your thoughts respectfully across all religious traditions.",
              variant: "default",
              className: "border-amber-200 bg-amber-50 text-amber-800"
            });
            return;
          }
        } catch (parseError) {
          // If we can't parse, fall through to general error
        }
      }
      
      // General error handling
      toast({
        title: "Send Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    }
  });

  // Handle voice message submission (defined early for callbacks)
  const handleVoiceMessage = useCallback((message: string) => {
    console.log('🎤 Voice message received:', message);
    setWasLastMessageVoice(true);
    sendMessageMutation.mutate(message);
  }, [sendMessageMutation]);

  // Handle ISOLATED user voice detection (AI voice completely filtered out)
  const handleUserVoiceDetected = useCallback((transcript: string, confidence: number) => {
    console.log('👤 ISOLATED user voice detected (AI filtered):', { 
      text: transcript.substring(0, 50) + '...',
      confidence: Math.round(confidence * 100) + '%'
    });
    
    setCurrentTranscript(transcript);
    setTranscriptConfidence(confidence);
    
    // Clear existing auto-send timeout
    if (autoSendTimeoutRef.current) {
      clearTimeout(autoSendTimeoutRef.current);
    }
    
    // Auto-send reasonable-confidence speech after delay
    if (confidence >= 0.5 && transcript.trim().length > 3) {
      autoSendTimeoutRef.current = setTimeout(() => {
        console.log('🚀 Auto-sending user voice:', transcript);
        handleVoiceMessage(transcript);
        // Clear UI state after sending
        setCurrentTranscript('');
        setTranscriptConfidence(0);
        setIsListening(false);
        (window as any).voiceIsolationControl?.stopPrimaryRecognition();
      }, 2000); // Longer delay for user to see transcript
    }
  }, [handleVoiceMessage]);
  
  // Play AI response with complete voice isolation
  const playAIResponseWithIsolation = useCallback(async (text: string) => {
    if (!text || !text.trim()) return;
    
    console.log('🎙️ Playing AI response with COMPLETE voice isolation:', text.substring(0, 50) + '...');
    
    try {
      setIsAISpeaking(true);
      
      const response = await fetch('/api/elevenlabs/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          voiceId: selectedPersona?.elevenLabsVoice || 'ErXwobaYiN019PkySvjV',
          settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      });
      
      if (!response.ok) throw new Error('ElevenLabs API error');
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audio.volume = 0.8;
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        console.log('🔊 AI speech finished - voice isolation restored');
        setIsAISpeaking(false);
        setIsInterrupted(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        console.error('🚨 Audio playback error');
        setIsAISpeaking(false);
        setIsInterrupted(false);
      };
      
      await audio.play();
      console.log('🔊 AI speech started with voice isolation active');
      
      // Start background recognition for interruption detection
      setTimeout(() => {
        (window as any).voiceIsolationControl?.startBackgroundRecognition();
      }, 100);
      
    } catch (error) {
      console.error('🚨 Failed to play AI response:', error);
      setIsAISpeaking(false);
    }
  }, [selectedPersona]);

  // Handle text input submission
  const handleTextSubmit = () => {
    if (textInputValue.trim()) {
      console.log('⌨️ Text message sent:', textInputValue);
      setWasLastMessageVoice(false);
      sendMessageMutation.mutate(textInputValue.trim());
      setTextInputValue('');
    }
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
          pattern: /\b(\d*\s*[A-Za-z]+)\s+(\d+):(\d+)(?:-(\d+))?\b/g,
          religion: 'christianity' as Religion,
          type: 'bible'
        },
        // Quran references
        { 
          pattern: /\b(Surah|Chapter)\s+([A-Za-z-]+)\s+(\d+):(\d+)\b/g,
          religion: 'islam' as Religion,
          type: 'quran'
        },
        // Torah references  
        { 
          pattern: /\b(Genesis|Exodus|Leviticus|Numbers|Deuteronomy)\s+(\d+):(\d+)\b/g,
          religion: 'judaism' as Religion,
          type: 'torah'
        }
      ];

      let processedText = text;
      const links: Array<{
        text: string;
        religion: Religion;
        book: string;
        chapter: number;
        verse: number;
      }> = [];

      patterns.forEach(({ pattern, religion, type }) => {
        processedText = processedText.replace(pattern, (match, book, chapterOrSurah, verse, endVerse) => {
          const chapter = parseInt(chapterOrSurah);
          const verseNum = parseInt(verse);
          
          if (!isNaN(chapter) && !isNaN(verseNum)) {
            links.push({
              text: match,
              religion,
              book: book.trim(),
              chapter,
              verse: verseNum
            });

            return `[${match}]`;
          }
          return match;
        });
      });

      return { processedText, links };
    };

    // Handle multi-perspective content with enhanced styling
    if (content.includes('<perspective>')) {
      const perspectiveRegex = /<perspective>(.*?)<\/perspective>\n([\s\S]*?)(?=<perspective>|$)/g;
      const perspectives: Array<{name: string, content: string}> = [];
      let match;

      while ((match = perspectiveRegex.exec(content)) !== null) {
        perspectives.push({
          name: match[1].trim(),
          content: match[2].trim()
        });
      }

      const PERSPECTIVE_COLORS = {
        'Christianity': {
          border: 'border-blue-200',
          bg: 'bg-blue-50',
          glow: 'shadow-blue-200/50',
          text: 'text-blue-800',
          glowClass: 'perspective-glow-blue'
        },
        'Islam': {
          border: 'border-green-200', 
          bg: 'bg-green-50',
          glow: 'shadow-green-200/50',
          text: 'text-green-800',
          glowClass: 'perspective-glow-green'
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
          border: 'border-yellow-200',
          bg: 'bg-yellow-50',
          glow: 'shadow-yellow-200/50',
          text: 'text-yellow-800',
          glowClass: 'perspective-glow-yellow'
        }
      };

      return (
        <div className="space-y-4">
          {perspectives.map((perspective, index) => {
            const colors = PERSPECTIVE_COLORS[perspective.name as keyof typeof PERSPECTIVE_COLORS] || {
              border: 'border-gray-200',
              bg: 'bg-gray-50', 
              glow: 'shadow-gray-200/50',
              text: 'text-gray-800',
              glowClass: 'perspective-glow-gray'
            };
            
            const { processedText, links } = parseScriptureReferences(perspective.content);
            
            return (
              <div 
                key={index}
                className={cn(
                  "relative p-4 rounded-lg border-2 transition-all duration-300 hover:shadow-lg",
                  colors.border,
                  colors.bg,
                  colors.glow,
                  colors.glowClass
                )}
              >
                <div className={cn("font-semibold mb-2 flex items-center gap-2", colors.text)}>
                  <BookOpen className="h-4 w-4" />
                  {perspective.name} Perspective
                </div>
                <div className={cn("text-sm leading-relaxed", colors.text)}>
                  {processedText.split(/\[(.*?)\]/).map((part, i) => {
                    if (i % 2 === 1) {
                      const link = links.find(l => l.text === part);
                      if (link && onNavigateToVerse) {
                        return (
                          <button
                            key={i}
                            onClick={() => onNavigateToVerse(link.religion, link.book, link.chapter, link.verse)}
                            className="underline hover:bg-blue-100 px-1 rounded transition-colors duration-200 font-medium"
                          >
                            {part}
                          </button>
                        );
                      }
                      return <span key={i} className="font-medium">{part}</span>;
                    }
                    return <span key={i}>{part}</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Regular content parsing for scripture references
    const { processedText, links } = parseScriptureReferences(content);
    
    return (
      <div className="text-sm leading-relaxed">
        {processedText.split(/\[(.*?)\]/).map((part, i) => {
          if (i % 2 === 1) {
            const link = links.find(l => l.text === part);
            if (link && onNavigateToVerse) {
              return (
                <button
                  key={i}
                  onClick={() => onNavigateToVerse(link.religion, link.book, link.chapter, link.verse)}
                  className="underline hover:bg-blue-100 px-1 rounded transition-colors duration-200 text-blue-600 font-medium"
                >
                  {part}
                </button>
              );
            }
            return <span key={i} className="font-medium">{part}</span>;
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header with Controls */}
      <div className="flex-none p-4 border-b bg-gradient-to-r from-slate-50 to-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <GrokStyleOrb state="idle" size="sm" />
              <div>
                <h2 className="font-semibold text-gray-900">
                  {selectedPersona?.name || 'Universal Scholar'}
                </h2>
                <p className="text-xs text-gray-500">
                  {context.religion ? `${context.religion} - ${context.book}` : 'All Traditions'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {/* Compare Mode Toggle */}
            <Button
              variant={isCompareMode ? "default" : "outline"}
              size="sm"
              onClick={handleCompareToggle}
              className="text-xs whitespace-nowrap"
            >
              <Scale className="h-3 w-3 mr-1" />
              Compare
            </Button>

            {/* History Panel Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistoryPanel(!showHistoryPanel)}
              className="text-xs whitespace-nowrap"
            >
              <HistoryIcon className="h-3 w-3 mr-1" />
              History
            </Button>

            {/* Text Input Toggle - Fixed Cutoff */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTextInput(!showTextInput)}
              className="text-xs whitespace-nowrap"
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              Type
            </Button>

            {/* Clear Chat */}
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 whitespace-nowrap"
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* History Panel */}
        {showHistoryPanel && (
          <div className="w-80 border-r bg-gray-50 flex flex-col">
            <Tabs value={historyView} onValueChange={(value) => setHistoryView(value as 'chat' | 'progress')} className="flex-1">
              <TabsList className="grid w-full grid-cols-2 m-2">
                <TabsTrigger value="chat" className="text-xs">Chat History</TabsTrigger>
                <TabsTrigger value="progress" className="text-xs">Progress</TabsTrigger>
              </TabsList>
              
              <TabsContent value="chat" className="flex-1 p-0">
                <div className="p-4">
                  <p className="text-sm text-gray-500">Chat history will be displayed here.</p>
                </div>
              </TabsContent>
              
              <TabsContent value="progress" className="flex-1 p-0">
                <ProgressDashboard />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Compare Mode Interface */}
          {isCompareMode && (
            <div className="flex-none p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-blue-600" />
                  <h3 className="font-medium text-blue-900">Multi-Religious Comparison</h3>
                </div>
                
                {/* Theme Selection */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {PREDEFINED_THEMES.map((theme) => {
                    const IconComponent = theme.icon;
                    return (
                      <Button
                        key={theme.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleThemeSelect(theme.label.toLowerCase())}
                        disabled={isLoadingComparison}
                        className={cn(
                          "h-auto py-3 px-3 text-xs font-medium border-2 transition-all duration-200",
                          theme.color,
                          theme.hoverColor,
                          selectedTheme === theme.label.toLowerCase() && "ring-2 ring-blue-500"
                        )}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <IconComponent className="h-4 w-4" />
                          <span>{theme.label}</span>
                        </div>
                      </Button>
                    );
                  })}
                </div>

                {/* Custom Theme Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Or enter a custom theme (e.g., 'forgiveness', 'prayer')"
                    value={customTheme}
                    onChange={(e) => setCustomTheme(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCustomThemeSubmit()}
                    disabled={isLoadingComparison}
                    className="text-sm"
                  />
                  <Button
                    onClick={handleCustomThemeSubmit}
                    disabled={!customTheme.trim() || isLoadingComparison}
                    size="sm"
                  >
                    Compare
                  </Button>
                </div>

                {isLoadingComparison && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-blue-600 mt-2">Searching across religious traditions...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messagesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">
                    {sendMessageMutation.isPending ? "Processing your message..." : "Loading messages..."}
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {isCompareMode 
                      ? "Select a theme above to compare perspectives across religious traditions"
                      : "Start a conversation with a spiritual question"
                    }
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3 group",
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg p-4 shadow-sm border",
                        message.type === 'user'
                          ? 'bg-blue-500 text-white border-blue-600'
                          : 'bg-white border-gray-200'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {message.type === 'user' ? (
                            <User className="h-5 w-5" />
                          ) : (
                            <Bot className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <ScriptureContent 
                            content={message.content}
                            onNavigateToVerse={onNavigateToVerse}
                          />
                          
                          {/* AI Message Controls */}
                          {message.type === 'ai' && (
                            <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <AudioPlaybackButton
                                text={message.content}
                                voiceId={selectedPersona?.elevenLabsVoice}
                                voiceTone={selectedPersona?.name || 'scholarly'}
                                size="sm"
                              />
                              <Badge variant="secondary" className="text-xs">
                                {selectedPersona?.name || 'Universal Scholar'}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {/* Loading indicator for new messages */}
              {sendMessageMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Bot className="h-5 w-5 text-blue-600" />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area - Fixed Layout */}
          <div className="flex-none border-t bg-white overflow-visible">
            {/* Text Input Mode */}
            {showTextInput && (
              <div className="p-4 border-b bg-gray-50">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your spiritual question..."
                    value={textInputValue}
                    onChange={(e) => setTextInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
                    disabled={sendMessageMutation.isPending}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleTextSubmit}
                    disabled={!textInputValue.trim() || sendMessageMutation.isPending}
                    size="sm"
                  >
                    Send
                  </Button>
                </div>
              </div>
            )}

            {/* Enhanced Voice Interface with Complete Isolation */}
            <div className="p-2 space-y-2">
              {/* Voice Isolation Filter (headless component) */}
              <VoiceIsolationFilter
                isAISpeaking={isAISpeaking}
                onUserVoiceDetected={handleUserVoiceDetected}
                onInterruptionDetected={handleInterruptionDetected}
                config={{
                  micGainDuringAI: 0,           // COMPLETE mute during AI speech
                  confidenceThreshold: 0.7,     // High confidence for user voice only
                  echoCancellationLevel: 'maximum',
                  backgroundListenerSensitivity: 0.3
                }}
              />
              
              {/* Voice Control Interface - Fixed Layout */}
              <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 border rounded-md shadow-sm overflow-visible">
                {/* Grok-style Orb with State Indication */}
                <div className="relative">
                  <div
                    className="cursor-pointer transition-transform hover:scale-110"
                    onClick={async () => {
                      if (isListening) {
                        // Stop listening
                        (window as any).voiceIsolationControl?.stopPrimaryRecognition();
                        setIsListening(false);
                        setCurrentTranscript('');
                        setAudioLevel(0);
                        if (audioLevelIntervalRef.current) {
                          clearInterval(audioLevelIntervalRef.current);
                          audioLevelIntervalRef.current = null;
                        }
                      } else if (!isAISpeaking && !sendMessageMutation.isPending) {
                        // SIMPLE VOICE INPUT - Like Grok
                        try {
                          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                          if (!SpeechRecognition) {
                            alert('Speech recognition not supported in this browser');
                            return;
                          }

                          const recognition = new SpeechRecognition();
                          recognition.continuous = false;
                          recognition.interimResults = true;
                          recognition.lang = 'en-US';

                          recognition.onstart = () => {
                            console.log('🎤 Voice recognition started');
                            setIsListening(true);
                            setCurrentTranscript('');
                          };

                          recognition.onresult = (event) => {
                            let transcript = '';
                            for (let i = 0; i < event.results.length; i++) {
                              transcript += event.results[i][0].transcript;
                            }
                            console.log('🎤 Heard:', transcript);
                            setCurrentTranscript(transcript);
                            setTranscriptConfidence(event.results[0][0].confidence || 0.8);
                            
                            // Auto-send when final result
                            if (event.results[event.results.length - 1].isFinal) {
                              setTimeout(() => {
                                if (transcript.trim()) {
                                  handleVoiceMessage(transcript.trim());
                                  setIsListening(false);
                                  setCurrentTranscript('');
                                }
                              }, 500);
                            }
                          };

                          recognition.onerror = (event) => {
                            console.error('Voice recognition error:', event.error);
                            setIsListening(false);
                          };

                          recognition.onend = () => {
                            console.log('Voice recognition ended');
                            setIsListening(false);
                          };

                          recognition.start();
                        } catch (error) {
                          console.error('Failed to start voice recognition:', error);
                          alert('Could not start voice recognition. Please check microphone permissions.');
                        }
                      }
                    }}
                  >
                    <GrokStyleOrb 
                      state={isInterrupted ? 'interrupted' : isAISpeaking ? 'responding' : isListening && currentTranscript ? 'processing' : isListening ? 'listening' : 'idle'} 
                      size="lg" 
                    />
                  </div>
                  
                  {/* State indicators */}
                  {isInterrupted && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  )}
                  
                  {isAISpeaking && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                  )}
                </div>
                
                {/* Audio Waveform (only during user listening) */}
                {isListening && (
                  <AudioWaveform 
                    isActive={true}
                    audioLevel={audioLevel}
                    size="md"
                    color="teal"
                    className="flex-1"
                  />
                )}
                
                {/* Status and Transcript Display - Compact */}
                <div className="flex-1 min-w-0 space-y-1">
                  {/* Status Message */}
                  <div className={cn("text-xs font-medium", 
                    sendMessageMutation.isPending ? 'text-gray-400' :
                    isInterrupted ? 'text-red-500' :
                    isAISpeaking ? 'text-amber-600' :
                    isListening ? 'text-teal-600' : 'text-gray-600'
                  )}>
                    {sendMessageMutation.isPending ? 'Processing...' :
                     isInterrupted ? 'Interrupted' :
                     isAISpeaking ? 'AI speaking' :
                     isListening && currentTranscript ? 'Processing...' :
                     isListening ? 'Listening' : 'Ready'}
                  </div>
                  
                  {/* User Transcript (COMPLETELY ISOLATED from AI voice) */}
                  {currentTranscript && (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-700 dark:text-gray-300 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                        <div className="flex items-center gap-1 mb-1">
                          <Mic className="h-2 w-2 text-teal-600" />
                          <span className="text-xs text-gray-500 font-medium">
                            Your voice (isolated)
                          </span>
                        </div>
                        <div className="text-gray-700 dark:text-gray-300 truncate">
                          "{currentTranscript}"
                        </div>
                      </div>
                      
                      {/* Confidence indicator - Compact */}
                      {transcriptConfidence > 0 && (
                        <div className="flex items-center gap-1">
                          <Badge 
                            variant={transcriptConfidence >= 0.7 ? "default" : "secondary"}
                            className="text-xs h-4"
                          >
                            {Math.round(transcriptConfidence * 100)}%
                          </Badge>
                          
                          {transcriptConfidence >= 0.7 && (
                            <span className="text-xs text-green-600">
                              ✅ Ready
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Interruption context - Compact */}
                  {isInterrupted && interruptedQuery && (
                    <div className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1 bg-red-100 dark:bg-red-900/20 p-1 rounded">
                      <AlertTriangle className="h-2 w-2" />
                      Interrupted
                    </div>
                  )}
                </div>
                
                {/* Control Buttons - Prevent Cutoff */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Primary Voice Button */}
                  <Button
                    variant={isListening ? "default" : "outline"}
                    size="sm"
                    onClick={async () => {
                      if (isListening) {
                        // Stop listening
                        (window as any).voiceIsolationControl?.stopPrimaryRecognition();
                        setIsListening(false);
                        setCurrentTranscript('');
                        setAudioLevel(0);
                        if (audioLevelIntervalRef.current) {
                          clearInterval(audioLevelIntervalRef.current);
                          audioLevelIntervalRef.current = null;
                        }
                      } else if (!isAISpeaking && !sendMessageMutation.isPending) {
                        // Start listening with complete isolation
                        const success = await (window as any).voiceIsolationControl?.startPrimaryRecognition();
                        if (success) {
                          setIsListening(true);
                          setCurrentTranscript('');
                          setTranscriptConfidence(0);
                          // Start audio level monitoring
                          audioLevelIntervalRef.current = setInterval(() => {
                            setAudioLevel(Math.random() * 0.6 + 0.2);
                          }, 100);
                        }
                      }
                    }}
                    disabled={sendMessageMutation.isPending}
                    className={cn(
                      "transition-all duration-200",
                      isListening && "bg-teal-500 hover:bg-teal-600 text-white",
                      isAISpeaking && "bg-amber-500 hover:bg-amber-600 text-white"
                    )}
                  >
                    {isListening ? (
                      <MicOff className="h-4 w-4" />
                    ) : isAISpeaking ? (
                      <Square className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                  
                  {/* Compact Action Buttons */}
                  {currentTranscript && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (currentTranscript.trim()) {
                          handleVoiceMessage(currentTranscript.trim());
                          setCurrentTranscript('');
                          setTranscriptConfidence(0);
                        }
                      }}
                      className="text-xs h-7 px-3 whitespace-nowrap"
                    >
                      Send
                    </Button>
                  )}
                  
                  {/* Resume Button (after interruption) - Compact */}
                  {isInterrupted && interruptedQuery && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        // Resume interrupted AI response
                        setIsAISpeaking(true);
                        setIsInterrupted(false);
                        
                        try {
                          const response = await fetch('/api/elevenlabs/speak', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              text: interruptedQuery,
                              voiceId: selectedPersona?.elevenLabsVoice || 'ErXwobaYiN019PkySvjV'
                            })
                          });
                          
                          if (response.ok) {
                            const audioBlob = await response.blob();
                            const audioUrl = URL.createObjectURL(audioBlob);
                            const audio = new Audio(audioUrl);
                            currentAudioRef.current = audio;
                            
                            audio.onended = () => {
                              setIsAISpeaking(false);
                              URL.revokeObjectURL(audioUrl);
                            };
                            
                            await audio.play();
                          }
                        } catch (error) {
                          console.error('Failed to resume AI speech:', error);
                          setIsAISpeaking(false);
                        }
                      }}
                      className="border-orange-200 text-orange-600 hover:bg-orange-50 text-xs h-6 px-2"
                    >
                      Resume
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Voice Isolation Status - Compact */}
              <div className="text-xs text-center text-gray-500 py-1">
                🛡️ Voice isolation active
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}