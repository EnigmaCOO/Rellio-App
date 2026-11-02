import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { VoiceErrorBoundary } from './VoiceErrorBoundary';
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
// Removed useElevenLabsStreaming - now using VoiceModeHandler's reliable TTS
import { AudioWaveform } from './AudioWaveform';
import { VoiceTalkBackHandler } from './VoiceTalkBackHandler';
import { ChatHistoryManager } from './ChatHistoryManager';
import { ProgressDashboard } from '@/components/progress/ProgressDashboard';
import { AudioPlaybackButton } from './AudioPlaybackButton';
import { Input } from '@/components/ui/input';
import { useVoiceModeHandler } from './VoiceModeHandler';
import { usePersonaSceneBridge } from '@/hooks/usePersonaSceneBridge';
import { apiRequest } from '@/lib/queryClient';
import { track } from '@/lib/analytics';
import type { Religion, ChatMessage } from '@shared/schema';
import type { ScholarPersona } from './ScholarPersonas';

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
  coverage?: {
    requestedTraditions: string[];
    evidencedTraditions: string[];
    missingTraditions: string[];
    failedTraditions?: string[];
  };
  verses: {
    [religion: string]: ComparisonVerse[];
  };
}

// Enhanced Voice State Management
export type VoiceFirstState = 'idle' | 'listening' | 'processing' | 'responding' | 'interrupted' | 'ai_speaking';

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

// Voice Recognition Types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

function VoiceFirstChatInterfaceInner({
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

  // Simplified State Management
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [wasLastMessageVoice, setWasLastMessageVoice] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [historyView, setHistoryView] = useState<'chat' | 'progress'>('chat');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [lastAIMessage, setLastAIMessage] = useState<string>('');
  const sceneLastAIMessageRef = useRef<string>('');

  // Voice recognition support states
  const [lastVoiceActivity, setLastVoiceActivity] = useState(0);
  const [isAISpeaking, setIsAISpeaking] = useState(false); // Tracks if AI is currently speaking
  const [isTalkingBack, setIsTalkingBack] = useState(false); // Tracks if AI is in a talk-back state
  const [inputIsolated, setInputIsolated] = useState(false); // Locks input during AI speech
  const [isAudioIsolated, setIsAudioIsolated] = useState(false); // Mutes mic during AI speech
  const [isProcessingVoice, setIsProcessingVoice] = useState<boolean>(false); // Tracks if voice processing is active
  const [hasError, setHasError] = useState(false); // Tracks if voice system has encountered an error

  // Post-interruption state tracking for auto-send functionality
  const [isPostInterruption, setIsPostInterruption] = useState(false); // Tracks if we're in post-interruption voice mode
  const [interruptionCooldown, setInterruptionCooldown] = useState(false); // Prevents loops after interruption
  
  const {
    triggerPose,
    syncVoiceState: syncSceneVoiceState,
    syncTranscript: syncSceneTranscript,
    pushChatEvent,
    activeVerse,
  } = usePersonaSceneBridge();
  const versePromptOptions = useMemo(() => {
    if (!activeVerse) return [] as Array<{ id: string; label: string; prompt: string }>;
    const reference = `${activeVerse.book} ${activeVerse.chapter}:${activeVerse.verse}`;
    return [
      {
        id: 'context',
        label: 'Context',
        prompt: `Share the historical and spiritual context behind ${reference}.`,
      },
      {
        id: 'apply',
        label: 'Apply',
        prompt: `How can I apply the wisdom from ${reference} in modern life?`,
      },
      {
        id: 'compare',
        label: 'Compare',
        prompt: `Compare ${reference} with insights from another tradition to deepen understanding.`,
      },
    ];
  }, [activeVerse]);
  
  // ARIA-LIVE STATUS UPDATES: For accessibility and screen readers
  const [voiceStatus, setVoiceStatus] = useState<string>(''); // Screen reader announcements
  const [interruptionStatus, setInterruptionStatus] = useState<string>(''); // Interruption feedback

  // 3D CHARACTER ANIMATION CALLBACKS: Now wired into persona scene bridge
  const onSpeakAnimation = useCallback((personaName: string) => {
    console.log('🎭 Persona viewport: speak animation for', personaName);
    triggerPose('speaking', { energy: 0.28, textSnippet: personaName, speaker: 'ai' });
  }, [triggerPose]);

  const onInterruptAnimation = useCallback((personaName: string) => {
    console.log('🎭 Persona viewport: interrupt animation for', personaName);
    triggerPose('interrupted', { energy: 0.2, textSnippet: personaName });
  }, [triggerPose]);

  const onIdleAnimation = useCallback((personaName: string) => {
    console.log('🎭 Persona viewport: idle animation for', personaName);
    triggerPose('idle', { energy: 0.08, textSnippet: personaName });
  }, [triggerPose]);

  // VoiceModeHandler's reliable TTS - mapped after voiceHandlerResult is available

  // Settings and persona change tracking
  const [settings, setSettings] = useState({
    autoSendDelay: 800, // Faster auto-send for better voice UX
    confidenceThreshold: 0.6, // Lower threshold for better auto-send
    voiceEnabled: true,
    autoPlayAI: true, // Re-enabled with server-side deduplication protection
    interruptionSensitivity: 0.2, // Very sensitive for interruption testing
    volume: 0.8
  });

  // Use the VoiceModeHandler with GROK-STYLE manual control
  const voiceHandlerResult = useVoiceModeHandler({
    onTranscript: (text, isInterim) => {
      console.log('📝 GROK MODE: Voice transcript:', text, 'isInterim:', isInterim);
      setIsProcessingVoice(text.length > 0 && isInterim);
      // Update text input with live transcript so user can see and edit it
      setTextInputValue(text);
      syncSceneTranscript(text, { isInterim, speaker: 'user' });
      // CRITICAL: Mark that voice input is being used - set flag immediately
      if (text.length > 0 && !isInterim) {
        setWasLastMessageVoice(true);
        console.log('🎤 VOICE INPUT COMPLETE: Setting wasLastMessageVoice = true');
      }
    },
    onAutoSend: (text) => {
      // Auto-send for voice messages with 1.5s delay
      if (text.trim().length > 0) {
        console.log('🎤 AUTO-SEND: Sending voice message:', text);
        setWasLastMessageVoice(true);
        setIsProcessingVoice(false);
        setTextInputValue(text);
        syncSceneTranscript(text, { isInterim: false, speaker: 'user' });
        handleSendMessage(text);
      }
    },
    onStateChange: (state) => {
      console.log('🎤 Voice state changed:', state);
      syncSceneVoiceState(state as any);
      
      // LEGEND LABS UI FEEDBACK: Enhanced state change with interruption support
      if (state === 'interrupted') {
        console.log('🚨 LEGEND LABS: Interruption detected - showing user feedback');
        
        // Show interruption toast with Legend Labs styling
        toast({
          title: "🎤 Interrupted—Listening...",
          description: "Continue speaking, I'm listening",
          duration: 2000,
          className: "bg-gray-50 border-gray-200 text-gray-800"
        });
        
        // ARIA-live announcement for screen readers
        setInterruptionStatus("AI interrupted. Now listening for your response.");
        setVoiceStatus("Listening after interruption");
        
        // 3D Character animation callback
        const currentPersona = selectedPersona?.name || 'Universal Scholar';
        onInterruptAnimation(currentPersona);
        
        // Clear interruption status after announcement
        setTimeout(() => {
          setInterruptionStatus("");
        }, 3000);
        
      } else if (state === 'speaking') {
        console.log('🔊 AI TTS started - enabling interruption detection');
        setIsAISpeaking(true);
        setPlayingMessageId(messages[messages.length - 1]?.id || null);
        
        // ARIA-live update and 3D character animation
        setVoiceStatus("AI is speaking");
        const currentPersona = selectedPersona?.name || 'Universal Scholar';
        onSpeakAnimation(currentPersona);
        
      } else if (state === 'listening') {
        setVoiceStatus("Listening for your voice");
        
      } else if (state === 'idle') {
        setVoiceStatus("");
        const currentPersona = selectedPersona?.name || 'Universal Scholar';
        onIdleAnimation(currentPersona);
      }
    },
    onInterrupt: () => {
      console.log('🚨 LEGEND LABS: Interruption callback triggered');
      
      // Enhanced interruption handling with visual feedback
      setWasLastMessageVoice(true);
      setIsPostInterruption(true);
      setInterruptionCooldown(true);
      
      // Reset cooldown after 1.5s (matches auto-send timing)
      setTimeout(() => {
        setInterruptionCooldown(false);
      }, 1500);
      
      // ARIA-live update for accessibility
      setVoiceStatus("Interrupted - now listening for your response");
    },
    disabled: false,
    isAIResponding: isAISpeaking,
    autoSendDelay: 1500, // 1.5s auto-send delay
    confidenceThreshold: 0.7, // Reasonable confidence threshold
    voiceId: selectedPersona?.elevenLabsVoice || 'ErXwobaYiN019PkySvjV',
    preventAutoSend: false // Enable auto-send for voice messages
  });

  const {
    isListening,
    currentTranscript,
    confidence,
    voiceState,
    audioLevel,
    startListening,
    stopListening,
    toggleListening,
    isSupported,
    hasPermission,
    interruptAI,
    playText,
    stopPlayback,
    isPlaying: voiceIsPlaying,
    isLoading: voiceIsLoading,
    volume: voiceVolume,
    setVolume: setVoiceVolume
  } = voiceHandlerResult;

  // Map VoiceModeHandler's TTS to the expected interface
  const {
    isPlaying: isAIPlaying,
    isLoading: isAILoading,
    playText: playAIText,
    stopPlayback: stopAIPlayback,
    volume: aiVolume,
    setVolume: setAIVolume
  } = {
    isPlaying: voiceIsPlaying,
    isLoading: voiceIsLoading,
    playText: playText,
    stopPlayback: stopPlayback,
    volume: voiceVolume,
    setVolume: setVoiceVolume
  };

  // Compare Mode state
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("");
  const [customTheme, setCustomTheme] = useState("");
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);
  const [savedInsightIds, setSavedInsightIds] = useState<Set<number>>(new Set());

  // Save insight as a note attached to current chapter
  const saveInsightMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: number; content: string }) => {
      return await apiRequest("POST", "/api/v1/notes", {
        religion: context.religion ?? "christianity",
        book: context.book || "Genesis",
        chapter: context.chapter || 1,
        verse: 1,
        text: `[Sage] ${content.slice(0, 600)}`,
        verseText: null,
      });
    },
    onSuccess: (_data, variables) => {
      setSavedInsightIds(prev => new Set([...prev, variables.messageId]));
      queryClient.invalidateQueries({ queryKey: ["/api/v1/notes"] });
      track("insight_saved", { religion: context.religion, book: context.book, chapter: context.chapter });
      toast({ title: "Insight saved", description: "Find it in Me › Notes", duration: 2000 });
    },
    onError: () => {
      toast({ title: "Couldn't save insight", variant: "destructive", duration: 2000 });
    }
  });

  // Predefined themes for Compare Mode with modern styling
  const PREDEFINED_THEMES = [
    {
      id: 'love', label: 'Love', icon: Heart,
      color: 'text-gray-500 border-gray-300',
      hoverColor: 'hover:border-gray-400',
      accent: '#f5f5f5'
    },
    {
      id: 'compassion', label: 'Compassion', icon: Heart,
      color: 'text-gray-500 border-gray-300',
      hoverColor: 'hover:border-gray-400',
      accent: '#f5f5f5'
    },
    {
      id: 'wisdom', label: 'Wisdom', icon: Brain,
      color: 'text-gray-500 border-gray-300',
      hoverColor: 'hover:border-gray-400',
      accent: '#f5f5f5'
    },
    {
      id: 'faith', label: 'Faith', icon: Star,
      color: 'text-gray-500 border-gray-300',
      hoverColor: 'hover:border-gray-400',
      accent: '#f5f5f5'
    },
    {
      id: 'hope', label: 'Hope', icon: Sparkles,
      color: 'text-gray-500 border-gray-300',
      hoverColor: 'hover:border-gray-400',
      accent: '#f5f5f5'
    },
    {
      id: 'justice', label: 'Justice', icon: Scale,
      color: 'text-slate-300 border-slate-700/40',
      hoverColor: 'hover:border-slate-400/60',
      accent: '#f5f5f5'
    },
    {
      id: 'redemption', label: 'Redemption', icon: Flame,
      color: 'text-gray-500 border-gray-300',
      hoverColor: 'hover:border-gray-400',
      accent: '#f5f5f5'
    },
    {
      id: 'soul', label: 'Soul', icon: Eye,
      color: 'text-gray-500 border-gray-300',
      hoverColor: 'hover:border-gray-400',
      accent: '#f5f5f5'
    },
    {
      id: 'afterlife', label: 'Afterlife', icon: Crown,
      color: 'text-gray-500 border-gray-300',
      hoverColor: 'hover:border-gray-400',
      accent: '#f5f5f5'
    },
    {
      id: 'meaning of life', label: 'Meaning of Life', icon: Compass,
      color: 'text-gray-500 border-gray-300',
      hoverColor: 'hover:border-gray-400',
      accent: '#f5f5f5'
    }
  ];

  // Speech Recognition Setup
  const recognitionRef = useRef<any>(null);
  const autoSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const backgroundRecognitionRef = useRef<any>(null); // Ref for background recognition instance

  // Removed duplicate - using existing isAudioIsolated from line 135
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const elevenLabsStreamRef = useRef<any>(null); // This ref seems unused currently


  // Track previous persona to detect changes
  const [previousPersona, setPreviousPersona] = useState<string | null>(null);
  const [previousContext, setPreviousContext] = useState<{ religion: Religion | null, book: string } | null>(null);


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
    const currentPersonaKey = selectedPersona?.name || (context.religion ? `${context.religion}-${context.book}` : 'Universal Wisdom');
    const currentContextKey = `${context.religion || 'universal'}-${context.book}`;

    // If we have a previous persona and it's different from current
    if (previousPersona && previousPersona !== currentPersonaKey) {
      console.log('🔄 Persona changed from', previousPersona, 'to', currentPersonaKey, '- Auto-clearing chat');
      // Wrap async call to prevent unhandled promise rejection
      clearChat().catch(error => {
        console.error('❌ Failed to auto-clear chat on persona change:', error);
      });
    }

    // Update tracking
    setPreviousPersona(currentPersonaKey);
    setPreviousContext({ religion: context.religion, book: context.book });
  }, [selectedPersona, context, previousPersona, clearChat]);

  // Individual Message Audio Controls
  const playMessageAudio = useCallback(async (message: ChatMessage) => {
    if (playingMessageId === message.id) {
      // Stop current playback
      stopAIPlayback();
      setPlayingMessageId(null);
      return;
    }

    // Stop any current playback
    if (playingMessageId) {
      stopAIPlayback();
    }

    setPlayingMessageId(message.id);
    console.log('🎙️ Playing message audio with <500ms latency:', message.content.substring(0, 50) + '...');

    try {
      await playAIText(message.content);
    } catch (error) {
      console.error('🚨 Failed to play message audio:', error);
      setPlayingMessageId(null);
    }
  }, [playingMessageId, playAIText, stopAIPlayback]);

  const toggleAutoPlay = useCallback(() => {
    setAutoPlayEnabled(!autoPlayEnabled);
    toast({
      title: autoPlayEnabled ? "Auto-play Disabled" : "Auto-play Enabled",
      description: autoPlayEnabled
        ? "AI responses will no longer auto-play"
        : "AI responses will auto-play with voice",
      variant: "default"
    });
  }, [autoPlayEnabled, toast]);

  // Load Messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/chat/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!sessionId
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
    onSuccess: (data: ComparisonResult) => {
      setComparisonResult(data);
      setIsLoadingComparison(false);
      queryClient.invalidateQueries({ queryKey: ['/api/chat', sessionId] });
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

  // Send Message with Enhanced Voice Integration
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
      try {
        // Analytics: response received
        track("ai_response_received", { religion: context.religion, book: context.book, chapter: context.chapter });

        // Track message sent for progress tracking
        onMessageSent?.();

        // Invalidate query to refresh messages
        await queryClient.invalidateQueries({ queryKey: ['/api/chat', sessionId] });

        console.log('✅ Message sent successfully, voice flag:', wasLastMessageVoice);

        // Clear voice processing state to allow auto-play
        setIsProcessingVoice(false);

        // ENHANCED: Force auto-play for voice messages immediately
        if (wasLastMessageVoice) {
          console.log('🎤 VOICE MESSAGE SENT: Auto-play will be triggered');
        }

        // Note: Auto-play is now handled by the useEffect watching shouldAutoPlay
        // This prevents duplicate playback attempts
      } catch (error) {
        console.error('❌ Error in onSuccess handler:', error);
      }
    },
    onError: (error: any) => {
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
              className: "border-gray-200 bg-gray-50 text-gray-800"
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

  // Consolidated send message function (moved up to fix hoisting issue)
  const handleSendMessage = useCallback((message: string) => {
    if (!message.trim()) return;

    // ENHANCED: More reliable voice detection for Grok-like experience
    const isCurrentlyVoiceInput = textInputValue.length > 0 && (
      isListening ||
      voiceState === 'processing' ||
      currentTranscript.trim() === textInputValue.trim() ||
      wasLastMessageVoice
    );

    if (isCurrentlyVoiceInput) {
      setWasLastMessageVoice(true);
      console.log('🎤 VOICE MESSAGE CONFIRMED: Setting wasLastMessageVoice = true');
    }

    console.log('📤 SENDING MESSAGE - wasLastMessageVoice:', wasLastMessageVoice || isCurrentlyVoiceInput);
    console.log('📤 Sending message:', message);
    pushChatEvent({
      type: 'user',
      text: message,
      energy: isCurrentlyVoiceInput ? 0.24 : 0.16,
    });
    syncSceneTranscript(message, { isInterim: false, speaker: 'user' });
    sendMessageMutation.mutate(message);

    // Clear text input if using text mode
    if (showTextInput) {
      setTextInputValue('');
    }
  }, [sendMessageMutation, showTextInput, isListening, voiceState, textInputValue, currentTranscript, wasLastMessageVoice, pushChatEvent, syncSceneTranscript]);

  const handleVersePrompt = useCallback((prompt: string) => {
    if (!prompt.trim()) return;
    if (inputIsolated) {
      toast({
        title: 'AI speaking',
        description: 'Interrupt the response or wait until it finishes to ask a new verse question.',
        variant: 'default',
      });
      return;
    }
    setShowTextInput(false);
    setWasLastMessageVoice(false);
    setTextInputValue('');
    handleSendMessage(prompt);
  }, [handleSendMessage, inputIsolated, toast]);

  // Speech input is now handled by VoiceModeHandler

  // Initialize Audio Context with Echo Cancellation for Level Detection
  const initializeAudioContext = useCallback(async () => {
    try {
      // AGGRESSIVE echo cancellation to prevent AI audio feedback
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false, // Disable auto gain to prevent AI audio amplification
          channelCount: 1,
          sampleRate: 16000, // Lower sample rate for better echo cancellation
          sampleSize: 16
        }
      });
      streamRef.current = stream;
      // hasPermission is managed by voice handler

      console.log('🎤 Audio stream initialized with echo cancellation');

      // Enhanced Audio Context with Isolation Controls
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      const destination = audioContext.createMediaStreamDestination();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      // Audio routing: microphone -> gainNode -> analyser
      // gainNode allows us to COMPLETELY mute mic during AI playback
      microphone.connect(gainNode);
      gainNode.connect(analyser);
      gainNode.connect(destination);

      // CRITICAL: Start with microphone unmuted for normal operation
      gainNode.gain.value = 1;
      console.log('🎤 Microphone initialized and ready');

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      gainNodeRef.current = gainNode;
      destinationRef.current = destination;

      console.log('🎤 Enhanced audio context with isolation controls ready');
      console.log('🎤 DEBUGGING: Audio context initialized, starting audio monitoring...');

      // Start audio level monitoring
      const monitorAudioLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);

          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

          // DEBUG: Log every few seconds to show monitoring is working
          if (Date.now() % 3000 < 50) { // Log roughly every 3 seconds
            console.log(`🎤 MONITORING: Audio level: ${average}, isAISpeaking: ${isAISpeaking}, voiceState: ${voiceState}`);
          }

          // DEBUG: Log audio levels continuously when AI is speaking for troubleshooting
          if (isAISpeaking && average > 0) {
            console.log(`🔊 DEBUG: Audio level: ${average}, AI speaking: ${isAISpeaking}, Voice state: ${voiceState}, Threshold: 25`);
          }

          // Enhanced interruption detection (backup to voice recognition)
          if ((voiceState === 'speaking' || isAISpeaking) && average > 25) { // Lowered threshold for easier interruption
            console.log('🚨 AUDIO-LEVEL INTERRUPTION! High audio detected during AI speech');
            console.log(`🔊 Audio level: ${average}, Threshold: 25`);

            // Trigger interruption
            if (stopAIPlayback) {
              stopAIPlayback();
              console.log('🛑 AI interrupted via audio level detection');
            }

            // Voice state is managed by voice handler, but we can influence component states
            setIsAISpeaking(false); // Update component state
            setIsTalkingBack(false);
            setInputIsolated(false);
            setIsAudioIsolated(false);

            // Enable post-interruption mode for auto-send
            setIsPostInterruption(true);
            setInterruptionCooldown(true);
            setTimeout(() => setInterruptionCooldown(false), 1000);

            // Show user feedback
            toast({
              title: "🎤 Interrupted—Listening...",
              description: "Continue speaking - I'll automatically send when you finish",
              variant: "default",
              className: "border-gray-200 bg-gray-50 text-gray-800"
            });

            // Start listening for the new question after brief delay
            setTimeout(() => {
              if (!isListening) {
                console.log('🎤 AUDIO-LEVEL INTERRUPTION: Starting listening for new question');
                startListening().catch(error => {
                  console.error('🚨 Failed to start listening after audio interruption:', error);
                });
              }
            }, 300);
          }
        }

        requestAnimationFrame(monitorAudioLevel);
      };

      monitorAudioLevel();
    } catch (error) {
      console.error('🚨 Audio context initialization error:', error);
      // hasPermission is managed by voice handler
    }
  }, [voiceState, settings.interruptionSensitivity, isAISpeaking, stopAIPlayback]); // Added stopAIPlayback as dependency

  // Voice initialization is handled by VoiceModeHandler
  useEffect(() => {
    console.log('🎤 VoiceFirstChatInterface mounted with voice support:', { isSupported, hasPermission });
  }, [isSupported, hasPermission]);

  // ENHANCED AUDIO ISOLATION: Smart microphone control during AI speech
  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      const currentTime = audioContextRef.current.currentTime;

      // Smart microphone control: Allow low-level monitoring for interruption
      if (isAISpeaking || isAIPlaying || playingMessageId) {
        // Reduce gain significantly but don't completely mute for interruption detection
        gainNodeRef.current.gain.setValueAtTime(0.1, currentTime);
        console.log('🔇 MICROPHONE REDUCED: AI speaking, allowing interruption detection');
      } else {
        // Full gain for normal user input
        gainNodeRef.current.gain.setValueAtTime(1, currentTime);
        console.log('🎤 MICROPHONE FULL: Ready for user input');
      }
    }
  }, [isAISpeaking, isAIPlaying, playingMessageId]);


  // Handle interruption logic - simplified, relying more on the consolidated handler
  const handleInterruption = useCallback(() => {
    console.log('🚨 Handling user interruption via button/action');

    if (isAIPlaying) {
      stopAIPlayback();
    }

    // Also attempt to stop speech synthesis if it's active
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    // Notify user of interruption
    toast({
      title: "Response Interrupted",
      description: "You can ask a new question or continue the conversation",
      variant: "default"
    });

    // Potentially trigger the voice handler's interruption logic if needed
    // For now, relying on the handler's internal `onInterrupt` callback for button presses
    interruptAI(); // Call the handler's interrupt function

  }, [isAIPlaying, stopAIPlayback, toast, interruptAI]); // Added interruptAI dependency


  // Handle text input submission
  const handleTextSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (inputIsolated) return; // Prevent submission during AI speech

    track("ai_question_sent", { method: "text", religion: context.religion, book: context.book, chapter: context.chapter });
    setWasLastMessageVoice(false); // Mark this as a text-initiated message
    handleSendMessage(textInputValue);
  }, [textInputValue, inputIsolated, handleSendMessage, context]);

  // Voice input is now handled by the consolidated VoiceModeHandler toggleListening function

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update AI volume based on settings
  useEffect(() => {
    setAIVolume(settings.volume);
  }, [settings.volume, setAIVolume]);

  // Log persona voice changes for debugging
  useEffect(() => {
    if (selectedPersona) {
      const contextType = isInsideBook ? "Inside Book" : "Outside Books";
      console.log(`🎭 ${contextType} - Persona Voice: ${selectedPersona.name} (${selectedPersona.elevenLabsVoice})`);
      console.log(`🎤 Voice Tone: ${selectedPersona.voiceTone}`);
      console.log(`📖 Context: ${context.religion ? `${context.religion} - ${context.book}` : 'Universal Wisdom'}`);
    }
  }, [selectedPersona, isInsideBook, context]);

  // Check for new AI messages
  const hasNewAIMessage = useCallback(() => {
    if (messages.length === 0) return false;
    const lastMessage = messages[messages.length - 1];
    const isNewAIMessage = lastMessage?.type === 'ai' && lastMessage.content !== lastAIMessage;
    console.log('🔍 Checking for new AI message:', {
      hasMessages: messages.length > 0,
      lastMessageType: lastMessage?.type,
      isNewContent: lastMessage?.content !== lastAIMessage,
      result: isNewAIMessage
    });
    return isNewAIMessage;
  }, [messages, lastAIMessage]);

  // Enhanced auto-play logic for voice mode
  const shouldAutoPlay = useMemo(() => {
    const hasLatestAI = hasNewAIMessage();
    const isCurrentlyPlaying = !!playingMessageId;
    const voiceNotActivelyListening = voiceState !== 'listening';
    const notProcessing = voiceState !== 'processing' && !isProcessingVoice;
    const notCurrentlySpeaking = !isAISpeaking && !isAIPlaying;

    // GROK-STYLE: Always auto-play for voice input, respect setting for text input
    const shouldAutoPlayForVoice = wasLastMessageVoice; // Always play for voice
    const shouldAutoPlayForText = autoPlayEnabled && !wasLastMessageVoice; // Respect setting for text

    const result = hasLatestAI &&
                   (shouldAutoPlayForVoice || shouldAutoPlayForText) &&
                   !isCurrentlyPlaying &&
                   notCurrentlySpeaking;

    console.log('🔊 AUTO-PLAY CHECK DETAILED:', {
      hasLatestAI,
      autoPlayEnabled,
      wasLastMessageVoice,
      shouldAutoPlayDueToVoice: autoPlayEnabled || wasLastMessageVoice,
      isCurrentlyPlaying,
      playingMessageId,
      voiceState,
      isProcessingVoice,
      isAISpeaking,
      isAIPlaying,
      notCurrentlySpeaking,
      messagesLength: messages.length,
      result
    });

    return result;
  }, [hasNewAIMessage, autoPlayEnabled, wasLastMessageVoice, playingMessageId, voiceState, isProcessingVoice, isAISpeaking, isAIPlaying]);

  // Enhanced auto-play trigger for voice mode - FIXED ElevenLabs Integration
  useEffect(() => {
    if (shouldAutoPlay && messages.length > 0) {
      const latestAIMessage = messages[messages.length - 1];
      if (latestAIMessage?.type === 'ai' && latestAIMessage.content && latestAIMessage.content !== lastAIMessage) {
        console.log('🔊 AUTO-PLAY TRIGGERED: Starting TTS for AI response');
        console.log('🎤 Message content:', latestAIMessage.content.substring(0, 50) + '...');

        // Update last AI message to prevent re-playing
        setLastAIMessage(latestAIMessage.content);

        // Reset wasLastMessageVoice flag after triggering auto-play
        if (wasLastMessageVoice) {
          setWasLastMessageVoice(false);
          console.log('🔊 Reset wasLastMessageVoice flag after auto-play trigger');
        }

        // Set playing state immediately
        setPlayingMessageId(latestAIMessage.id);

        // Clean text for speech (remove perspective tags and HTML)
        const cleanText = latestAIMessage.content
          .replace(/<perspective>.*?<\/perspective>/g, '')
          .replace(/<[^>]*>/g, '') // Remove all HTML tags
          .replace(/\n+/g, ' ')
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim();

        console.log('🔊 Playing cleaned text:', cleanText.substring(0, 50) + '...');

        // Use the properly configured ElevenLabs hook for TTS
        const startElevenLabsTTS = async () => {
          try {
            console.log('🎙️ Starting ElevenLabs TTS using hook with voice:', selectedPersona?.elevenLabsVoice || 'ErXwobaYiN019PkySvjV');
            console.log('🔊 Playing AI response:', cleanText.substring(0, 50) + '...');

            // Use the existing ElevenLabs hook which handles all the complexity
            await playAIText(cleanText);
            console.log('✅ ElevenLabs TTS started successfully via hook');

          } catch (elevenLabsError) {
            console.warn('⚠️ ElevenLabs TTS failed:', elevenLabsError);

            // Reset playing state on error
            setPlayingMessageId(null);
            setIsAISpeaking(false);

            // Error handling is already done by the hook's fallback mechanism
            console.log('🔊 Hook will handle fallback to browser TTS if available');
          }
        };

        // Start TTS immediately
        startElevenLabsTTS();
      }
    }
  }, [shouldAutoPlay, messages, lastAIMessage, selectedPersona?.elevenLabsVoice, aiVolume, toast]);

  // Enhanced message parsing for multi-perspective responses with colors and clickable references
  const parseMessageContent = useCallback((content: string) => {
    console.log('🔍 Parsing message content:', content);
    const parts = [];

    // Dark-theme colors for each religious perspective
    const perspectiveColors: Record<string, any> = {
      'Christianity': {
        border: 'border-gray-300',
        bg: 'bg-gray-50',
        badge: 'bg-gray-100 text-gray-600 border-gray-300',
        accent: 'text-gray-600'
      },
      'Islam': {
        border: 'border-gray-300',
        bg: 'bg-gray-50',
        badge: 'bg-gray-100 text-gray-700 border-gray-200',
        accent: 'text-gray-600'
      },
      'Judaism': {
        border: 'border-gray-300',
        bg: 'bg-gray-50',
        badge: 'bg-gray-100 text-gray-600 border-gray-300',
        accent: 'text-gray-600'
      },
      'Hinduism': {
        border: 'border-gray-300',
        bg: 'bg-gray-50',
        badge: 'bg-gray-100 text-gray-600 border-gray-300',
        accent: 'text-gray-600'
      },
      'Buddhism': {
        border: 'border-gray-300',
        bg: 'bg-gray-50',
        badge: 'bg-gray-100 text-gray-600 border-gray-300',
        accent: 'text-gray-600'
      },
      'Sikhism': {
        border: 'border-gray-400',
        bg: 'bg-gray-50',
        badge: 'bg-gray-100 text-gray-700 border-gray-200',
        accent: 'text-gray-600'
      }
    };

    // Split content by perspective tags - simpler and more reliable approach
    const sections = content.split(/(<perspective>.*?<\/perspective>)/);
    console.log('📝 Split sections:', sections);

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      if (!section) continue;

      // Check if this section is a perspective tag
      const perspectiveMatch = section.match(/<perspective>(.*?)<\/perspective>/);
      if (perspectiveMatch) {
        // This is a perspective tag, the next section should be its content
        const religion = perspectiveMatch[1].trim();
        const nextSection = sections[i + 1];
        if (nextSection) {
          const perspectiveContent = nextSection.trim();
          if (perspectiveContent) {
            parts.push({
              type: 'perspective',
              religion,
              content: perspectiveContent,
              colors: perspectiveColors[religion] || perspectiveColors['Christianity'] // Default color if not found
            });
            console.log('✅ Added perspective:', religion, 'Content:', perspectiveContent.substring(0, 50) + '...');
          }
          i++; // Skip the next section since we just processed it
        }
      } else if (!perspectiveMatch && section && !section.includes('<perspective>')) {
        // This is regular text content
        parts.push({ type: 'text', content: section });
        console.log('📄 Added text content:', section.substring(0, 50) + '...');
      }
    }

    console.log('🎯 Final parsed parts:', parts.length, 'parts');
    // Return the parsed parts, or the original content if no parsing occurred
    return parts.length > 0 ? parts : [{ type: 'text', content }];
  }, []);

  // Parse scripture reference to extract religion, book, and chapter info
  const parseScriptureReference = useCallback((reference: string) => {
    // Remove extra whitespace and normalize
    const ref = reference.trim();

    // Quran/Islam patterns
    if (ref.includes('Surah') || ref.includes('Al-') || ref.includes('Quran')) {
      let book = 'Quran';
      let chapter = 1;
      let verse = null;

      // Extract chapter and verse numbers (e.g., 2:256, 112:1-4)
      const chapterVerseMatch = ref.match(/(\d+):(\d+(?:-\d+)?)/);
      if (chapterVerseMatch) {
        chapter = parseInt(chapterVerseMatch[1]);
        // Handle verse ranges by taking the first verse
        verse = parseInt(chapterVerseMatch[2].split('-')[0]);
      }

      return { religion: 'islam' as Religion, book, chapter, verse };
    }

    // Torah/Judaism patterns - simplified to include common books
    const torahBooks = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Bereshit', 'Shemot', 'Vayikra', 'Bamidbar', 'Devarim'];
    const bibleBooks = ['Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', 'Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', 'Thessalonians', 'Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', 'Peter', 'Jude', 'Revelation', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'];

    let potentialBook = '';
    let bookMatch = null;

    // Try to find the book name in the reference string
    for (const book of [...torahBooks, ...bibleBooks]) {
      const bookRegex = new RegExp(`\\b${book}\\b`, 'i'); // Use word boundary to match whole words
      const match = ref.match(bookRegex);
      if (match) {
        potentialBook = book;
        bookMatch = match;
        break; // Found a match, stop searching
      }
    }

    if (potentialBook) {
      let chapter = 1;
      let verse = null;
      const chapterVerseMatch = ref.match(/(\d+):(\d+(?:-\d+)?)/);
      if (chapterVerseMatch) {
        chapter = parseInt(chapterVerseMatch[1]);
        verse = parseInt(chapterVerseMatch[2].split('-')[0]);
      }

      // Determine religion based on book, defaulting to Christianity if unsure
      let religion: Religion = 'christianity';
      if (torahBooks.some(b => b.toLowerCase() === potentialBook.toLowerCase())) {
        religion = 'judaism';
      } else if (potentialBook.toLowerCase() === 'quran' || ref.toLowerCase().includes('quran')) {
        // This case is handled above, but as a fallback
        religion = 'islam';
      }

      return { religion, book: potentialBook, chapter, verse };
    }

    // Default fallback if no clear pattern is matched
    return { religion: 'christianity' as Religion, book: 'Bible', chapter: 1, verse: null };
  }, []);

  // Make scripture references clickable
  const renderTextWithClickableReferences = useCallback((text: string) => {
    // Enhanced scripture reference patterns
    const patterns = [
      // Quran: Surah Al-Baqarah 2:256, Quran 112:1-4
      /((?:Surah\s+)?(?:Al-)?[\w\s-]+\s+\d+:\d+(?:-\d+)?)/gi,
      // Bible/Torah: John 3:16, 1 John 4:8, Matthew 28:19, Deuteronomy 6:4, Exodus 34:6-7
      // Regex to capture book names and chapter:verse, allowing for optional initial number (e.g., 1 John)
      /((?:\d+\s+)?(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+\d+:\d+(?:-\d+)?)/g,
    ];

    let result = text;
    let parts = [];
    let currentIndex = 0;

    // Find all scripture references across all patterns
    const allMatches: Array<{ text: string, start: number, end: number }> = [];
    patterns.forEach(pattern => {
      let match;
      // Ensure the regex is global to find all occurrences
      const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
      while ((match = regex.exec(text)) !== null) {
        // Ensure we capture the actual reference text, usually match[1] if the pattern has a capturing group
        const referenceText = match[1] || match[0]; // Use match[1] if available, otherwise the whole match
        allMatches.push({
          text: referenceText,
          start: match.index,
          end: match.index + referenceText.length
        });
      }
    });

    // Sort matches by their starting position
    allMatches.sort((a, b) => a.start - b.start);

    // Filter out overlapping matches to avoid duplicate rendering or incorrect parsing
    const filteredMatches: Array<{ text: string, start: number, end: number }> = [];
    let lastEnd = -1;
    allMatches.forEach(match => {
      // Only add if the match does not overlap with the previous one
      if (match.start >= lastEnd) {
        filteredMatches.push(match);
        lastEnd = match.end;
      }
    });

    // Build the result array with text segments and clickable button components
    filteredMatches.forEach((match, index) => {
      // Add the text segment before the current match
      if (match.start > currentIndex) {
        parts.push(text.slice(currentIndex, match.start));
      }

      // Create a clickable button for the scripture reference
      parts.push(
        <button
          key={`ref-${index}`}
          onClick={() => {
            const parsed = parseScriptureReference(match.text);
            console.log('Scripture reference clicked:', match.text, 'Parsed:', parsed);

            if (onNavigateToVerse && parsed) {
              // Navigate to the scripture location using the provided callback
              onNavigateToVerse(parsed.religion, parsed.book, parsed.chapter, parsed.verse || undefined);
            }
          }}
          className="inline-flex items-center gap-1 px-1 py-0.5 rounded text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors duration-200 border border-gray-200 cursor-pointer"
          title={`Go to ${match.text}`}
        >
          {match.text}
          <ExternalLink className="w-2 h-2" />
        </button>
      );

      // Update the current index to the end of the processed match
      currentIndex = match.end;
    });

    // Add any remaining text after the last match
    if (currentIndex < text.length) {
      parts.push(text.slice(currentIndex));
    }

    // Return the array of text and button elements, or the original text if no references were found
    return parts.length > 0 ? parts : [text];
  }, [parseScriptureReference, onNavigateToVerse]);

  // Update last AI message when new messages arrive, used for auto-play logic
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.type === 'ai' && lastMessage.content !== lastAIMessage) {
        setLastAIMessage(lastMessage.content);
        if (lastMessage.content && sceneLastAIMessageRef.current !== lastMessage.content) {
          sceneLastAIMessageRef.current = lastMessage.content;
          pushChatEvent({
            type: 'ai',
            text: lastMessage.content,
            energy: wasLastMessageVoice ? 0.32 : 0.24,
          });
          syncSceneTranscript(lastMessage.content, { isInterim: false, speaker: 'ai' });
          triggerPose('speaking', { energy: 0.24, textSnippet: lastMessage.content.slice(0, 120), speaker: 'ai' });
        }
      }
    }
  }, [messages, lastAIMessage, pushChatEvent, syncSceneTranscript, triggerPose, wasLastMessageVoice]);

  // Enhanced cleanup function with background recognition
  const cleanup = useCallback(() => {
    console.log('🎤 Voice system cleanup');
    try {
      // Stop background recognition first
      if (backgroundRecognitionRef.current) {
        try {
          console.log('🎤 Stopping background recognition...');
          backgroundRecognitionRef.current.stop();
          backgroundRecognitionRef.current = null;
        } catch (error) {
          console.warn('🚨 Background recognition cleanup error:', error);
        }
      }

      // Stop main recognition
      if (recognitionRef.current) {
        try {
          console.log('🎤 Stopping main recognition...');
          recognitionRef.current.stop(); // Use stop() instead of abort() to avoid DOMException
          recognitionRef.current = null;
        } catch (error) {
          console.warn('🚨 Main recognition cleanup error:', error);
        }
      }

      // Stop any active audio playback
      if (isAIPlaying) {
        stopAIPlayback();
      }

      // Close audio context if it exists
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
          audioContextRef.current = null;
          console.log('🔇 Audio context closed');
        } catch (error) {
          console.warn('🚨 Error closing audio context:', error);
        }
      }

      // Release microphone stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        console.log('🎤 Microphone stream released');
      }
    } catch (error) {
      console.error('🚨 Critical error during voice system cleanup:', error);
    }
  }, [isAIPlaying, stopAIPlayback]);

  // Effect to perform cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);


  return (
    <Card className={cn("flex flex-col h-full border-0", className)} style={{ background: "#ffffff" }}>
      <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">{voiceStatus}</div>
      
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b flex-shrink-0" style={{ borderColor: "#e5e5e5" }}>
        <div className="flex items-center gap-3">
          <div className="relative">
            {selectedPersona && isInsideBook ? (
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", selectedPersona.bgColor)}>
                <selectedPersona.icon className={cn("w-5 h-5", selectedPersona.iconColor)} />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
                  <BookOpen className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
            ) : (
              <div className={cn(
                "w-10 h-10 rounded-full border-2 flex items-center justify-center",
                voiceState === 'listening' ? "border-gray-900 bg-gray-100" :
                voiceState === 'processing' ? "border-gray-400 bg-gray-50 animate-pulse" :
                voiceState === 'speaking' ? "border-gray-900 bg-gray-200" :
                "border-gray-300 bg-white"
              )}>
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  voiceState === 'listening' ? "bg-gray-900" :
                  voiceState === 'processing' ? "bg-gray-400" :
                  voiceState === 'speaking' ? "bg-gray-700" :
                  "bg-gray-300"
                )} />
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: selectedPersona && isInsideBook ? undefined : "var(--text-primary)", ...(selectedPersona && isInsideBook ? {} : {}) }}>
              {selectedPersona?.name || 'Universal Scholar'}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={handleCompareToggle}
            className="text-xs px-2 h-7 border border-gray-200 rounded-lg"
            style={{ background: isCompareMode ? "#0a0a0a" : "transparent", color: isCompareMode ? "#ffffff" : "#737373" }}>
            <Scale className="w-3 h-3 mr-1" />Compare
          </Button>
          <Button variant="ghost" size="sm"
            onClick={() => setShowHistoryPanel(!showHistoryPanel)}
            className="h-7 w-7 p-0 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100">
            <HistoryIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Active Verse Context */}
      {activeVerse && (
        <div className="border-b px-4 py-3 flex-shrink-0" style={{ borderColor: "#e5e5e5", background: "#fafafa" }}>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Active Verse</span>
              <button type="button" className="text-xs font-medium transition-colors" style={{ color: "#0a0a0a" }}
                disabled={!activeVerse.religion}
                onClick={() => { if (activeVerse.religion) onNavigateToVerse?.(activeVerse.religion, activeVerse.book, activeVerse.chapter, activeVerse.verse); }}>
                {activeVerse.book} {activeVerse.chapter}:{activeVerse.verse}
              </button>
            </div>
            <p className="text-sm line-clamp-2" style={{ color: "var(--text-secondary)" }}>{activeVerse.text}</p>
            {versePromptOptions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {versePromptOptions.map((option) => (
                  <Button key={option.id} size="sm" variant="secondary"
                    className="rounded-full text-xs h-6 px-3 border-0"
                    style={{ background: "#f5f5f5", color: "#0a0a0a" }}
                    disabled={sendMessageMutation.isPending || inputIsolated}
                    onClick={() => handleVersePrompt(option.prompt)}>
                    {option.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compare Mode Panel */}
      {isCompareMode && (
        <div className="border-b p-4 max-h-80 overflow-y-auto flex-shrink-0" style={{ borderColor: "#e5e5e5", background: "#fafafa" }}>
          {!comparisonResult ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Scale className="w-4 h-4" />
                Choose a spiritual theme to compare across traditions
              </h3>

              {/* Predefined Themes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {PREDEFINED_THEMES.map((theme) => {
                  const IconComponent = theme.icon;
                  return (
                    <Button
                      key={theme.id}
                      variant="outline"
                      onClick={() => handleThemeSelect(theme.label.toLowerCase())}
                      disabled={isLoadingComparison}
                      style={{ background: "#f5f5f5" }}
                      className={cn(
                        "h-auto py-3 px-2 flex flex-col items-center gap-2 border transition-all duration-300 ease-out",
                        "rounded-2xl min-h-[90px] max-w-full",
                        theme.color,
                        theme.hoverColor,
                        "hover:scale-105 hover:-translate-y-0.5",
                        "active:scale-95 active:translate-y-0",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
                        "group relative overflow-hidden"
                      )}
                    >
                      <div className="relative z-10 flex flex-col items-center gap-1.5 w-full">
                        <div className="p-1.5 rounded-xl transition-all duration-300" style={{ background: "#f5f5f5" }}>
                          <IconComponent className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <span className={cn(
                          "font-semibold text-center leading-tight group-hover:font-bold transition-all duration-300",
                          // Very aggressive font sizing to prevent text cutoff
                          theme.label.length > 12 ? "text-[9px]" :
                          theme.label.length > 10 ? "text-[10px]" :
                          theme.label.length > 8 ? "text-xs" : "text-sm",
                          // Better text fitting and wrapping
                          "break-words hyphens-auto w-full px-0.5 leading-[1.1]"
                        )}>
                          {theme.label}
                        </span>
                      </div>

                      {/* Subtle shine effect on hover */}
                      <div />
                    </Button>
                  );
                })}
              </div>

              {/* Custom Theme Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Or enter your own theme (e.g., forgiveness, death, marriage)"
                  value={customTheme}
                  onChange={(e) => setCustomTheme(e.target.value)}
                  disabled={isLoadingComparison}
                  className="flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && handleCustomThemeSubmit()}
                />
                <Button
                  onClick={handleCustomThemeSubmit}
                  disabled={!customTheme.trim() || isLoadingComparison}
                  className="bg-gray-900 hover:bg-gray-700 text-white"
                >
                  {isLoadingComparison ? "Loading..." : "Compare"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <Scale className="w-4 h-4" />
                  "{comparisonResult.theme}"
                </h3>
                <Button variant="outline" size="sm" onClick={() => setComparisonResult(null)}
                  className="text-xs h-6 border-0 rounded-lg" style={{ background: "#f5f5f5", color: "#737373" }}>
                  <X className="w-3 h-3 mr-1" />New Search
                </Button>
              </div>

              <div className="rounded-xl p-4 space-y-3" style={{ background: "#f5f5f5", border: "1px solid #e5e5e5" }}>
                <h4 className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2" style={{ color: "#0a0a0a" }}>
                  <Brain className="w-3 h-3" />Cross-Traditional Insights
                </h4>
                <div className="space-y-3">
                  {(() => {
                    const summary = comparisonResult.aiSummary;
                    const parts = summary.split(/(<perspective>([^<]+)<\/perspective>)/);
                    const perspectives: Array<{ type: string; content: string; religion?: string }> = [];
                    if (parts[0] && parts[0].trim()) perspectives.push({ type: 'intro', content: parts[0].trim() });
                    for (let i = 1; i < parts.length; i += 2) {
                      if (parts[i] && parts[i + 1]) {
                        const m = parts[i].match(/<perspective>([^<]+)<\/perspective>/);
                        if (m?.[1]) perspectives.push({ type: 'perspective', religion: m[1].trim(), content: parts[i + 1].trim() });
                      }
                    }
                    return perspectives.map((item, index) => (
                      <div key={index}>
                        {item.type === 'intro' ? (
                          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.content}</p>
                        ) : (
                          <div className="border-l-2 pl-3 py-1" style={{ borderColor: "#e5e5e5" }}>
                            <h5 className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: "#0a0a0a" }}>
                              <Sparkles className="w-2.5 h-2.5" />{item.religion}
                            </h5>
                            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.content}</p>
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {comparisonResult.coverage && (
                  <div className="lg:col-span-2 rounded-xl px-3 py-2 text-xs"
                    style={{ background: "#fff8e8", border: "1px solid #f1dca8", color: "#78520a" }}>
                    Evidence found for {comparisonResult.coverage.evidencedTraditions.length} of {comparisonResult.coverage.requestedTraditions.length} selected traditions.
                    {comparisonResult.coverage.missingTraditions.length > 0 &&
                      ` No indexed evidence: ${comparisonResult.coverage.missingTraditions.join(", ")}.`}
                    {comparisonResult.coverage.failedTraditions?.length
                      ? ` Retrieval failed: ${comparisonResult.coverage.failedTraditions.join(", ")}.`
                      : ""}
                  </div>
                )}
                {Object.entries(comparisonResult.verses).map(([religion, verses]) => (
                  <Card key={religion} className="border-0" style={{ background: "#fafafa", border: "1px solid #e5e5e5" }}>
                    <div className="p-3">
                      <h5 className="text-xs font-semibold mb-2 capitalize flex items-center gap-1" style={{ color: "var(--text-primary)" }}>
                        <BookOpen className="w-3 h-3" />{religion}
                      </h5>
                      <div className="space-y-2">
                        {(verses as any[]).map((verse, index) => (
                          <div key={index} className="border-l-2 pl-3" style={{ borderColor: "#e5e5e5" }}>
                            <p className="text-xs leading-relaxed mb-1" style={{ color: "var(--text-secondary)" }}>"{verse.text}"</p>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{verse.reference}</p>
                            {verse.translation && (
                              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                Edition: {verse.translation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4 min-h-0">
        <div className="space-y-5">
          {messagesLoading ? (
            <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>Loading…</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="w-10 h-10 mx-auto mb-4 opacity-25 text-gray-400" />
              <h4 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Ask Sage</h4>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Type or speak to explore spiritual wisdom</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn("group flex gap-3 transition-all duration-200 ease-in-out", message.type === 'user' ? "flex-row-reverse" : "flex-row")}
                style={{ animation: `fadeIn 200ms ease-in-out` }}
              >
                {/* Avatar */}
                <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white",
                  message.type === 'user' ? 'bg-gray-200' : 'bg-gray-100')}>
                  {message.type === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Message Bubble */}
                <div className={cn("flex-1 max-w-[85%]", message.type === 'user' ? "flex flex-col items-end" : "flex flex-col items-start")}>
                  <div className={cn("relative rounded-2xl transition-all duration-200 group")}
                    style={message.type === 'user'
                      ? { background: "#f5f5f5", border: "1px solid #e5e5e5", padding: "10px 14px" }
                      : { background: "#fafafa", border: "1px solid #e5e5e5", padding: "12px 14px 12px 14px" }
                    }>
                    {message.type === 'ai' ? (
                      <div className="pr-7 space-y-3">
                        {parseMessageContent(message.content).map((part, index) => (
                          <div key={index}>
                            {part.type === 'perspective' ? (
                              <div className={cn("border-l-4 pl-4 py-2 rounded-r-lg space-y-1.5", part.colors.border, part.colors.bg)}>
                                <Badge variant="outline" className={cn("text-xs font-medium", part.colors.badge)}>
                                  {part.religion}
                                </Badge>
                                <div className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                                  {renderTextWithClickableReferences(part.content)}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                                {renderTextWithClickableReferences(part.content)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
                        {message.content}
                      </p>
                    )}

                    {/* AI Message Audio Controls */}
                    {message.type === 'ai' && (
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        {playingMessageId === message.id && (
                          <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center mr-0.5">
                            <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" />
                          </div>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => playMessageAudio(message)}
                          className="w-6 h-6 p-0 opacity-50 hover:opacity-100 transition-opacity"
                          style={{ color: playingMessageId === message.id ? "#0a0a0a" : "#737373" }}>
                          {playingMessageId === message.id ? <Square className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Save Insight action row (AI messages only) */}
                  {message.type === 'ai' && (
                    <button
                      onClick={() => saveInsightMutation.mutate({ messageId: message.id, content: message.content })}
                      disabled={savedInsightIds.has(message.id) || saveInsightMutation.isPending}
                      className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      style={savedInsightIds.has(message.id)
                        ? { color: "#0a0a0a", background: "#f5f5f5", cursor: "default" }
                        : { color: "var(--text-muted)", background: "transparent" }
                      }
                    >
                      {savedInsightIds.has(message.id) ? (
                        <><Sparkles className="w-2.5 h-2.5" />Saved</>
                      ) : (
                        <><Bookmark className="w-2.5 h-2.5" />Save insight</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-3 flex-shrink-0" style={{ borderColor: "#e5e5e5" }}>
        {hasError && (
          <div className="mb-3 p-3 rounded-xl flex items-start gap-2" style={{ background: "#f5f5f5", border: "1px solid #d4d4d4" }}>
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#0a0a0a" }} />
            <div className="flex-1">
              <p className="text-xs font-medium mb-1" style={{ color: "#0a0a0a" }}>Voice System Issue</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Use text input or click Reset to try again.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setHasError(false); window.location.reload(); }}
              className="text-xs h-6 px-2 border-0 rounded-lg flex-shrink-0"
              style={{ background: "#e5e5e5", color: "#0a0a0a" }}>Reset</Button>
          </div>
        )}

        {/* Text Input */}
        <form onSubmit={handleTextSubmit} className="mb-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              disabled={sendMessageMutation.isPending}
              placeholder="Ask Sage about this scripture…"
              className="flex-1 px-4 py-2.5 text-sm rounded-xl outline-none transition-all"
              style={{
                background: "#f9f9f9",
                border: "1px solid #e5e5e5",
                color: "var(--text-primary)",
                caretColor: "#0a0a0a",
              }}
            />
            <Button type="submit" disabled={!textInputValue.trim() || sendMessageMutation.isPending}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{ background: "#0a0a0a", color: "#ffffff" }}>
              {sendMessageMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : "Send"}
            </Button>
          </div>
        </form>

        {/* Voice Controls - Only show if supported */}
        {isSupported ? (
          <VoiceErrorBoundary>
            <div className="flex items-center justify-center gap-4">
              {/* Main Voice Button */}
              <div className="flex flex-col items-center">
                <Button
                  onClick={async (e) => {
                    console.log('🎤 Voice button clicked');

                    e.preventDefault();
                    e.stopPropagation();

                    // Check browser support first
                    if (!isSupported) {
                      toast({
                        title: "Voice Unavailable",
                        description: "Voice input is not supported in this browser. Please use text input or switch to Chrome/Edge.",
                        variant: "default"
                      });
                      return;
                    }

                    try {
                      // If AI is speaking, interrupt it first
                      if (isAIPlaying || playingMessageId) {
                        console.log('🚨 Interrupting AI speech to start listening');
                        stopAIPlayback();
                        setPlayingMessageId(null);
                        setIsAISpeaking(false);

                        // Brief delay to ensure audio stops before starting listening
                        setTimeout(async () => {
                          const result = await toggleListening();
                          if (result) {
                            // Don't set wasLastMessageVoice here - it will be set when message is sent
                            // Ensure auto-play is enabled for voice responses
                            if (!autoPlayEnabled) {
                              setAutoPlayEnabled(true);
                              console.log('🔊 Auto-play enabled for voice conversation');
                            }
                            console.log('✅ Voice listening started after interruption');
                          }
                        }, 100);
                        return;
                      }

                      // Handle permission requests with better UX
                      if (!hasPermission) {
                        console.log('🎤 Requesting microphone permission...');
                        try {
                          // Proactively request microphone permission
                          await navigator.mediaDevices.getUserMedia({ audio: true });
                          console.log('✅ Microphone permission granted');
                          
                          // Small delay to allow permission state to update
                          await new Promise(resolve => setTimeout(resolve, 100));
                        } catch (permError) {
                          console.error('🚫 Microphone access error:', permError);
                          
                          let errorTitle = "🎤 Microphone Access Issue";
                          let errorDescription = "Unable to access microphone";
                          
                          if (permError instanceof DOMException) {
                            if (permError.name === 'NotFoundError') {
                              errorTitle = "🚫 No Microphone Found";
                              errorDescription = "No microphone device detected. Please connect a microphone or use text input.";
                            } else if (permError.name === 'NotAllowedError') {
                              errorTitle = "🎤 Permission Denied";
                              errorDescription = "Microphone access was denied. Please enable in browser settings.";
                            } else if (permError.name === 'NotSupportedError') {
                              errorTitle = "🚫 Not Supported";
                              errorDescription = "Voice input not supported in this browser. Please use text input.";
                            }
                          }
                          
                          toast({
                            title: errorTitle,
                            description: errorDescription,
                            variant: "destructive",
                            duration: 6000
                          });
                          return; // Exit early if microphone unavailable
                        }
                      }

                      try {
                        const result = await toggleListening();

                        if (result) {
                          // Don't set wasLastMessageVoice here - it will be set when message is sent
                          // Ensure auto-play is enabled for voice responses
                          if (!autoPlayEnabled) {
                            setAutoPlayEnabled(true);
                            console.log('🔊 Auto-play enabled for voice conversation');
                          }
                          console.log('✅ GROK MODE: Voice listening started - user controls sending');
                          // Show success feedback only if we had to request permission
                          if (!hasPermission) {
                            toast({
                              title: "🎤 Voice Activated!",
                              description: "Speak naturally - I'll auto-send after a 1.5s pause",
                              variant: "default",
                              duration: 3000,
                              className: "border-gray-200 bg-gray-50 text-gray-800"
                            });
                          }
                        } else {
                          console.warn('🚫 Failed to start voice listening');
                          
                          // More specific error handling
                          if (!isSupported) {
                            toast({
                              title: "🚫 Voice Not Supported",
                              description: "Voice features work best in Chrome, Edge, or Safari",
                              variant: "destructive",
                              duration: 5000
                            });
                          } else {
                            toast({
                              title: "🔧 Voice System Issue",
                              description: "Voice recognition unavailable. Please use text input instead.",
                              variant: "destructive",
                              duration: 4000
                            });
                          }
                        }
                      } catch (error) {
                        console.error('🚨 Voice toggle error:', error);
                        toast({
                          title: "Voice Error",
                          description: "Voice system encountered an error. Please refresh the page if this persists.",
                          variant: "destructive"
                        });
                      }
                    } catch (error) {
                      console.error('🚨 Critical voice button error:', error);
                      toast({
                        title: "Critical Voice Error",
                        description: "Voice system needs to be reset. Please refresh the page.",
                        variant: "destructive"
                      });
                    }
                  }}
                  disabled={!isSupported || hasError}
                  className={cn(
                    "w-16 h-16 rounded-full transition-all duration-300 transform shadow-md",
                    // Disabled state for unsupported browsers or errors
                    !isSupported || hasError
                      ? "cursor-not-allowed opacity-50 hover:scale-100"
                      : inputIsolated
                      ? "cursor-not-allowed opacity-40 hover:scale-100"
                      : !hasPermission
                      ? "bg-gray-900 hover:bg-gray-700 active:scale-95"
                      : "hover:scale-105 focus:scale-105 active:scale-95",
                    // B&W button states
                    isSupported && voiceState === 'listening'
                      ? "bg-gray-900 animate-pulse ring-2 ring-gray-400"
                      : isSupported && voiceState === 'processing'
                      ? "bg-gray-700"
                      : isSupported && (voiceState === 'speaking' || isAISpeaking)
                      ? "bg-gray-600 animate-pulse"
                      : isSupported && voiceState === 'interrupted'
                      ? "bg-gray-500"
                      : isSupported && !inputIsolated
                      ? "bg-gray-900 hover:bg-gray-700 text-white"
                      : ""
                  )}
                  title={
                    !isSupported ? "Voice not supported - use text input or switch to Chrome/Edge" :
                    hasError ? "Voice system error - please refresh the page" :
                    !hasPermission ? "Click to grant microphone permission - required for voice features" :
                    voiceState === 'listening' ? "Listening... Click to stop" :
                    voiceState === 'speaking' ? "AI is speaking... Just speak to interrupt" :
                    inputIsolated ? "Input locked during AI speech" :
                    "Click to speak - Grok-style voice input"
                  }
                >
                  {!isSupported ? (
                    <MicOff className="w-6 h-6 opacity-40" style={{ color: "var(--text-muted)" }} />
                  ) : voiceState === 'processing' ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : voiceState === 'listening' ? (
                    <Square className="w-6 h-6 text-white" />
                  ) : voiceState === 'speaking' || isAISpeaking ? (
                    <Volume2 className="w-6 h-6 text-white" />
                  ) : voiceState === 'interrupted' ? (
                    <div className="w-6 h-6 text-white animate-pulse">⚡</div>
                  ) : inputIsolated ? (
                    <MicOff className="w-6 h-6 opacity-40" style={{ color: "var(--text-muted)" }} />
                  ) : (
                    <Mic className="w-6 h-6 text-white" />
                  )}
                </Button>

                {/* Status Text */}
                <div className="mt-2 text-center">
                  {!isSupported ? (
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Voice Not Supported
                    </div>
                  ) : voiceState === 'listening' ? (
                    <div className="text-xs text-gray-700 font-medium">
                      Listening...
                    </div>
                  ) : voiceState === 'processing' ? (
                    <div className="text-xs text-gray-600 font-medium">
                      Processing...
                    </div>
                  ) : (voiceState === 'speaking' || isAISpeaking) ? (
                    <div className="text-xs text-gray-700 font-medium">
                      AI Speaking...
                    </div>
                  ) : voiceState === 'interrupted' ? (
                    <div className="text-xs text-gray-700 font-medium">
                      🚨 Interrupted
                    </div>
                  ) : voiceState === 'idle' ? (
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {!hasPermission ? "Need Permission" : inputIsolated ? "Inputs Locked" : "Voice Input"}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Audio Waveform */}
              {voiceState === 'listening' && (
                <AudioWaveform
                  isActive={true}
                  audioLevel={audioLevel}
                  size="md"
                  color="gray"
                />
              )}

              {/* Voice Interruption Status - No manual button needed */}
              {(isAISpeaking || isAIPlaying || playingMessageId) && (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-gray-900 text-white shadow-lg flex items-center justify-center">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div className="text-xs text-gray-600 font-medium mt-1">
                    Just speak to interrupt
                  </div>
                </div>
              )}
            </div>
          </VoiceErrorBoundary>
        ) : (
          /* Text-only mode message for unsupported browsers */
          <div className="flex flex-col items-center justify-center py-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
              style={{ background: "#fafafa", border: "1px solid #e5e5e5" }}>
              <MessageCircle className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Text Chat Mode</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Use the text input above to chat</p>
            </div>
          </div>
        )}

        {/* Current Transcript Display */}
        {currentTranscript && (
          <div className="mt-3 p-3 rounded-xl" style={{ background: "#f9f9f9", border: "1px solid #e5e5e5" }}>
            <div className="text-xs mb-1 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Transcript:</div>
            <p className="text-sm leading-relaxed italic" style={{ color: "var(--text-secondary)" }}>"{currentTranscript}"</p>
            {confidence > 0 && (
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Confidence: {Math.round(confidence * 100)}%</div>
            )}
          </div>
        )}
      </div>

      {/* Enhanced History Panel with Chat History and Progress Dashboard */}
      {showHistoryPanel && (
        <div className="fixed inset-y-0 right-0 w-96 z-50 animate-in slide-in-from-right duration-300 flex flex-col"
          style={{ background: "#f9f9f9", borderLeft: "1px solid #e5e5e5" }}>
          <Tabs value={historyView} onValueChange={(value) => setHistoryView(value as 'chat' | 'progress')} className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid #e5e5e5" }}>
              <div className="flex items-center gap-2">
                <HistoryIcon className="h-4 w-4" style={{ color: "#0a0a0a" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>History & Progress</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowHistoryPanel(false)}
                className="h-7 w-7 p-0 rounded-lg" style={{ color: "var(--text-muted)" }}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Tab Navigation */}
            <TabsList className="grid w-full grid-cols-2 m-4 mb-0">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Chat History
              </TabsTrigger>
              <TabsTrigger value="progress" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Progress
              </TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              <TabsContent value="chat" className="h-full m-0 p-0">
                <ChatHistoryManager
                  isOpen={true}
                  onClose={() => setShowHistoryPanel(false)}
                  currentSessionId={sessionId}
                  currentMessages={messages}
                  currentPersona={selectedPersona}
                  currentContext={context}
                  onLoadSession={(entry) => {
                    // Handle loading a previous chat session
                    console.log('Loading chat session:', entry.sessionId);
                    // You might want to emit an event or call a prop function here
                    // to switch to the selected conversation
                  }}
                  onHighlightVerse={(religion, book, chapter) => {
                    if (onNavigateToVerse) {
                      onNavigateToVerse(religion as Religion, book, chapter);
                    }
                    setShowHistoryPanel(false);
                  }}
                />
              </TabsContent>

              <TabsContent value="progress" className="h-full m-0 p-0 overflow-auto">
                <div className="p-4">
                  <ProgressDashboard onClose={() => setShowHistoryPanel(false)} />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}
    </Card>
  );
}

export function VoiceFirstChatInterface(props: VoiceFirstChatInterfaceProps) {
  return (
    <VoiceErrorBoundary>
      <VoiceFirstChatInterfaceInner {...props} />
    </VoiceErrorBoundary>
  );
}