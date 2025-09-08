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
import { useElevenLabsStreaming } from '@/hooks/useElevenLabsStreaming';
import { GrokStyleOrb } from './GrokStyleOrb';
import { AudioWaveform } from './AudioWaveform';
import { VoiceTalkBackHandler } from './VoiceTalkBackHandler';
import { ChatHistoryManager } from './ChatHistoryManager';
import { ProgressDashboard } from '@/components/progress/ProgressDashboard';
import { AudioPlaybackButton } from './AudioPlaybackButton';
import { Input } from '@/components/ui/input';
import { useVoiceModeHandler } from './VoiceModeHandler';
import { apiRequest } from '@/lib/queryClient';
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

  // Voice recognition support states
  const [lastVoiceActivity, setLastVoiceActivity] = useState(0);
  const [isAISpeaking, setIsAISpeaking] = useState(false); // Tracks if AI is currently speaking
  const [isTalkingBack, setIsTalkingBack] = useState(false); // Tracks if AI is in a talk-back state
  const [inputIsolated, setInputIsolated] = useState(false); // Locks input during AI speech
  const [isAudioIsolated, setIsAudioIsolated] = useState(false); // Mutes mic during AI speech
  const [isProcessingVoice, setIsProcessingVoice] = useState<boolean>(false); // Tracks if voice processing is active
  const [hasError, setHasError] = useState(false); // Tracks if voice system has encountered an error

  // Simplified ElevenLabs Integration (moved up to be available for handlers)
  const {
    isPlaying: isAIPlaying,
    isLoading: isAILoading,
    playText: playAIText,
    stopPlayback: stopAIPlayback,
    volume: aiVolume,
    setVolume: setAIVolume
  } = useElevenLabsStreaming({
    voiceId: selectedPersona?.elevenLabsVoice || 'ErXwobaYiN019PkySvjV',
    autoPlay: false, // Disable auto-play to prevent conflicts
    onStart: () => {
      console.log('🔊 AI started speaking');
      setIsAISpeaking(true); // Use setIsAISpeaking for internal state
      setPlayingMessageId(playingMessageId);
    },
    onEnd: () => {
      console.log('🔊 AI finished speaking');
      setIsAISpeaking(false); // Use setIsAISpeaking for internal state
      setPlayingMessageId(null);
    },
    onInterrupted: () => {
      console.log('🚨 AI speech interrupted');
      setIsAISpeaking(false); // Use setIsAISpeaking for internal state
      setPlayingMessageId(null);
    },
    onError: (error) => {
      console.log('🔊 AI speech error:', error);
      setIsAISpeaking(false); // Use setIsAISpeaking for internal state
      setPlayingMessageId(null);
    }
  });

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
    },
    onAutoSend: (text) => {
      // DISABLED: No auto-send in Grok mode - user controls when to send
      console.log('🚫 GROK MODE: Auto-send disabled, user controls sending');
      // Just update the input, don't actually send
      setTextInputValue(text);
      setWasLastMessageVoice(true);
      setIsProcessingVoice(false);
    },
    onStateChange: (state) => {
      console.log('🎤 Voice state changed:', state);
      if (state === 'speaking') {
        setIsAISpeaking(true);
      } else if (state === 'idle' || state === 'interrupted') {
        setIsAISpeaking(false);
        setIsProcessingVoice(false);
      }
    },
    onInterrupt: () => {
      console.log('🚨 Voice interrupted AI');
      if (isAIPlaying) {
        stopAIPlayback();
      }
      setIsAISpeaking(false);
      setPlayingMessageId(null);
    },
    disabled: false,
    isAIResponding: isAIPlaying,
    autoSendDelay: 0, // Disable auto-send
    confidenceThreshold: 1.0, // Prevent auto-send
    voiceId: selectedPersona?.elevenLabsVoice || 'ErXwobaYiN019PkySvjV',
    preventAutoSend: true // Explicitly prevent auto-send
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

  // Compare Mode state
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("");
  const [customTheme, setCustomTheme] = useState("");
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);

  // Predefined themes for Compare Mode with modern styling
  const PREDEFINED_THEMES = [
    {
      id: 'love', label: 'Love', icon: Heart,
      color: 'bg-gradient-to-br from-rose-50 to-pink-100 text-rose-700 border-rose-200 shadow-rose-100',
      hoverColor: 'hover:from-rose-100 hover:to-pink-200 hover:shadow-rose-200'
    },
    {
      id: 'compassion', label: 'Compassion', icon: Heart,
      color: 'bg-gradient-to-br from-pink-50 to-rose-100 text-pink-700 border-pink-200 shadow-pink-100',
      hoverColor: 'hover:from-pink-100 hover:to-rose-200 hover:shadow-pink-200'
    },
    {
      id: 'wisdom', label: 'Wisdom', icon: Brain,
      color: 'bg-gradient-to-br from-purple-50 to-violet-100 text-purple-700 border-purple-200 shadow-purple-100',
      hoverColor: 'hover:from-purple-100 hover:to-violet-200 hover:shadow-purple-200'
    },
    {
      id: 'faith', label: 'Faith', icon: Star,
      color: 'bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 border-blue-200 shadow-blue-100',
      hoverColor: 'hover:from-blue-100 hover:to-indigo-200 hover:shadow-blue-200'
    },
    {
      id: 'hope', label: 'Hope', icon: Sparkles,
      color: 'bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-700 border-emerald-200 shadow-emerald-100',
      hoverColor: 'hover:from-emerald-100 hover:to-teal-200 hover:shadow-emerald-200'
    },
    {
      id: 'justice', label: 'Justice', icon: Scale,
      color: 'bg-gradient-to-br from-slate-50 to-gray-100 text-slate-700 border-slate-200 shadow-slate-100',
      hoverColor: 'hover:from-slate-100 hover:to-gray-200 hover:shadow-slate-200'
    },
    {
      id: 'redemption', label: 'Redemption', icon: Flame,
      color: 'bg-gradient-to-br from-orange-50 to-amber-100 text-orange-700 border-orange-200 shadow-orange-100',
      hoverColor: 'hover:from-orange-100 hover:to-amber-200 hover:shadow-orange-200'
    },
    {
      id: 'soul', label: 'Soul', icon: Eye,
      color: 'bg-gradient-to-br from-indigo-50 to-blue-100 text-indigo-700 border-indigo-200 shadow-indigo-100',
      hoverColor: 'hover:from-indigo-100 hover:to-blue-200 hover:shadow-indigo-200'
    },
    {
      id: 'afterlife', label: 'Afterlife', icon: Crown,
      color: 'bg-gradient-to-br from-violet-50 to-purple-100 text-violet-700 border-violet-200 shadow-violet-100',
      hoverColor: 'hover:from-violet-100 hover:to-purple-200 hover:shadow-violet-200'
    },
    {
      id: 'meaning of life', label: 'Meaning of Life', icon: Compass,
      color: 'bg-gradient-to-br from-cyan-50 to-sky-100 text-cyan-700 border-cyan-200 shadow-cyan-100',
      hoverColor: 'hover:from-cyan-100 hover:to-sky-200 hover:shadow-cyan-200'
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
        // Track message sent for progress tracking
        onMessageSent?.();

        // Invalidate query to refresh messages
        await queryClient.invalidateQueries({ queryKey: ['/api/chat', sessionId] });

        console.log('✅ Message sent successfully, voice flag:', wasLastMessageVoice);

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

  // Consolidated send message function (moved up to fix hoisting issue)
  const handleSendMessage = useCallback((message: string) => {
    if (!message.trim()) return;

    console.log('📤 Sending message:', message);
    sendMessageMutation.mutate(message);

    // Clear text input if using text mode
    if (showTextInput) {
      setTextInputValue('');
    }
  }, [sendMessageMutation, showTextInput]);

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

      // Start audio level monitoring
      const monitorAudioLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);

          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

          // DEBUG: Log audio levels when AI is speaking
          if (isAISpeaking) {
            console.log(`🔊 DEBUG: Audio level: ${average}, AI speaking: ${isAISpeaking}, Voice state: ${voiceState}`);
          }

          // Enhanced interruption detection (backup to onspeechstart)
          if ((voiceState === 'speaking' || isAISpeaking) && average > 50) { // Threshold based on settings.interruptionSensitivity?
            console.log('🚨 AUDIO-LEVEL INTERRUPTION! High audio detected during AI speech');
            console.log(`🔊 Audio level: ${average}, Threshold: 50`);

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

  // HARDWARE AUDIO ISOLATION: Mute microphone during AI speech
  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      const currentTime = audioContextRef.current.currentTime;

      // Mute microphone during AI speech to prevent feedback loops
      if (isAISpeaking || isAIPlaying || playingMessageId) {
        gainNodeRef.current.gain.setValueAtTime(0, currentTime);
        console.log('🔇 MICROPHONE MUTED: AI speaking, preventing feedback');
      } else {
        gainNodeRef.current.gain.setValueAtTime(1, currentTime);
        console.log('🎤 MICROPHONE UNMUTED: Ready for user input');
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

    setWasLastMessageVoice(false); // Mark this as a text-initiated message
    handleSendMessage(textInputValue);
  }, [textInputValue, inputIsolated, handleSendMessage]);

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
    const notProcessing = voiceState !== 'processing';
    const notCurrentlySpeaking = !isAISpeaking && !isAIPlaying;

    // Auto-play when we have a new AI message, auto-play is enabled, and we're not busy
    const result = hasLatestAI &&
                   autoPlayEnabled &&
                   !isCurrentlyPlaying &&
                   voiceNotActivelyListening &&
                   notProcessing &&
                   notCurrentlySpeaking;

    console.log('🔊 Auto-play check:', {
      hasLatestAI,
      autoPlayEnabled,
      isCurrentlyPlaying,
      voiceState,
      notCurrentlySpeaking,
      result
    });

    return result;
  }, [hasNewAIMessage, autoPlayEnabled, playingMessageId, voiceState, isAISpeaking, isAIPlaying]);

  // Enhanced auto-play trigger for voice mode - FIXED ElevenLabs Integration
  useEffect(() => {
    if (shouldAutoPlay && messages.length > 0) {
      const latestAIMessage = messages[messages.length - 1];
      if (latestAIMessage?.type === 'ai' && latestAIMessage.content && latestAIMessage.content !== lastAIMessage) {
        console.log('🔊 AUTO-PLAY TRIGGERED: Starting TTS for AI response');
        console.log('🎤 Message content:', latestAIMessage.content.substring(0, 50) + '...');

        // Update last AI message to prevent re-playing
        setLastAIMessage(latestAIMessage.content);

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

        // Direct ElevenLabs API call with proper error handling
        const startElevenLabsTTS = async () => {
          try {
            console.log('🎙️ Starting ElevenLabs TTS with voice:', selectedPersona?.elevenLabsVoice || 'ErXwobaYiN019PkySvjV');
            
            setIsAISpeaking(true);
            
            // Direct API call to ElevenLabs endpoint
            const response = await fetch('/api/elevenlabs/speak', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: cleanText,
                voiceId: selectedPersona?.elevenLabsVoice || 'ErXwobaYiN019PkySvjV',
                settings: {
                  stability: 0.5,
                  similarityBoost: 0.8,
                  style: 0.0,
                  useSpeakerBoost: true
                }
              })
            });

            if (!response.ok) {
              throw new Error(`ElevenLabs API error: ${response.status}`);
            }

            console.log('✅ ElevenLabs API response received');
            
            // Create audio blob and play
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
            const audio = new Audio(audioUrl);
            audio.volume = Math.min(aiVolume || 0.8, 1.0);
            
            audio.onplay = () => {
              console.log('🔊 ElevenLabs audio started playing');
              setIsAISpeaking(true);
            };
            
            audio.onended = () => {
              console.log('✅ ElevenLabs audio completed');
              URL.revokeObjectURL(audioUrl);
              setPlayingMessageId(null);
              setIsAISpeaking(false);
            };
            
            audio.onerror = (error) => {
              console.error('🚨 ElevenLabs audio playback error:', error);
              URL.revokeObjectURL(audioUrl);
              setPlayingMessageId(null);
              setIsAISpeaking(false);
              // Don't show error to user, just fail silently and continue
            };
            
            await audio.play();
            console.log('✅ ElevenLabs TTS started successfully');
            
          } catch (elevenLabsError) {
            console.warn('⚠️ ElevenLabs failed, using browser TTS fallback:', elevenLabsError);
            
            // Robust browser TTS fallback
            try {
              if ('speechSynthesis' in window) {
                // Clear any existing speech
                speechSynthesis.cancel();
                
                // Short delay to ensure cancellation takes effect
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const utterance = new SpeechSynthesisUtterance(cleanText);
                utterance.rate = 0.85;
                utterance.pitch = 1.0;
                utterance.volume = 0.8;
                utterance.lang = 'en-US';
                
                // Try to use a better voice if available
                const voices = speechSynthesis.getVoices();
                const preferredVoice = voices.find(v => 
                  v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Alex'))
                );
                if (preferredVoice) {
                  utterance.voice = preferredVoice;
                  console.log('🔊 Using browser voice:', preferredVoice.name);
                }
                
                utterance.onstart = () => {
                  console.log('🔊 Browser TTS started');
                  setIsAISpeaking(true);
                };
                
                utterance.onend = () => {
                  console.log('✅ Browser TTS completed');
                  setPlayingMessageId(null);
                  setIsAISpeaking(false);
                };
                
                utterance.onerror = (error) => {
                  console.error('🚨 Browser TTS error:', error);
                  setPlayingMessageId(null);
                  setIsAISpeaking(false);
                };
                
                speechSynthesis.speak(utterance);
                
              } else {
                throw new Error('Speech synthesis not available');
              }
            } catch (browserError) {
              console.error('🚨 All TTS methods failed:', browserError);
              setPlayingMessageId(null);
              setIsAISpeaking(false);
              
              // Only show error for critical failures
              toast({
                title: "Voice Unavailable",
                description: "Voice playback is temporarily unavailable.",
                variant: "default"
              });
            }
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

    // Define unique colors for each religious perspective
    const perspectiveColors: Record<string, any> = {
      'Christianity': {
        border: 'border-blue-200',
        bg: 'bg-blue-50',
        badge: 'bg-blue-100 text-blue-800 border-blue-200',
        accent: 'text-blue-600'
      },
      'Islam': {
        border: 'border-green-200',
        bg: 'bg-green-50',
        badge: 'bg-green-100 text-green-800 border-green-200',
        accent: 'text-green-600'
      },
      'Judaism': {
        border: 'border-purple-200',
        bg: 'bg-purple-50',
        badge: 'bg-purple-100 text-purple-800 border-purple-200',
        accent: 'text-purple-600'
      },
      'Hinduism': {
        border: 'border-orange-200',
        bg: 'bg-orange-50',
        badge: 'bg-orange-100 text-orange-800 border-orange-200',
        accent: 'text-orange-600'
      },
      'Buddhism': {
        border: 'border-yellow-200',
        bg: 'bg-yellow-50',
        badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        accent: 'text-yellow-600'
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
          className="inline-flex items-center gap-1 px-1 py-0.5 rounded text-xs bg-teal-100 text-teal-700 hover:bg-teal-200 transition-colors duration-200 border border-teal-200 hover:border-teal-300 cursor-pointer"
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
      }
    }
  }, [messages, lastAIMessage]);

  return (
    <Card className={cn("flex flex-col h-full bg-white shadow-lg", className)}>
      {/* Enhanced Header with Dynamic Persona Display */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {/* Dynamic Persona Avatar with Glowing Book Icon */}
          <div className="relative">
            {selectedPersona && isInsideBook ? (
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                selectedPersona.bgColor,
                "animate-pulse shadow-lg"
              )}>
                <selectedPersona.icon className={cn("w-6 h-6", selectedPersona.iconColor)} />
                {/* Glowing book icon overlay */}
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-bounce shadow-md">
                  <BookOpen className="w-3 h-3 text-white" />
                </div>
              </div>
            ) : (
              <GrokStyleOrb
                state={voiceState === 'speaking' ? 'responding' :
                       voiceState === 'processing' ? 'processing' :
                       voiceState === 'listening' ? 'listening' :
                       voiceState === 'interrupted' ? 'interrupted' : 'idle'}
                size="md"
              />
            )}
          </div>

          {/* Simplified Persona Name */}
          <div>
            <h3 className={cn(
              "text-lg font-semibold transition-colors duration-300",
              selectedPersona && isInsideBook ? selectedPersona.textColor : "text-gray-900"
            )}>
              {selectedPersona?.name || 'Universal Scholar'}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {/* Compare Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCompareToggle}
            className={cn(
              "text-xs px-2 h-7 relative",
              isCompareMode ? "text-teal-600 border-teal-300 bg-teal-100" : "text-gray-600 border-gray-300"
            )}
            title="Compare verses across religions"
          >
            <Scale className="w-3 h-3 mr-1" />
            Compare
          </Button>

          {/* Auto-play Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAutoPlay}
            className={cn(
              "text-xs px-2 h-7 relative",
              autoPlayEnabled ? "text-teal-600 border-teal-300 bg-teal-100" : "text-gray-600 border-gray-300"
            )}
            title={autoPlayEnabled ? "Auto-Play ON" : "Auto-Play OFF"}
          >
            {autoPlayEnabled && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full animate-pulse" />
            )}
            Auto-play
          </Button>

          {/* Text Input Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTextInput(!showTextInput)}
            className={cn(
              "text-xs px-2 h-7",
              showTextInput ? "text-blue-600 border-blue-300 bg-blue-50" : "text-gray-600 border-gray-300"
            )}
            title={showTextInput ? "Text ON" : "Text OFF"}
          >
            Text
          </Button>

          {/* History Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistoryPanel(!showHistoryPanel)}
            className={cn(
              "text-xs px-2 h-7",
              showHistoryPanel ? "text-teal-600 border-teal-300 bg-teal-50" : "text-gray-600 border-gray-300"
            )}
            title="View history & progress"
          >
            <HistoryIcon className="w-3 h-3 mr-1" />
            History
          </Button>

          {/* Clear Chat Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (window.confirm('Clear all chat messages? This will start a fresh conversation.')) {
                try {
                  await clearChat();
                } catch (error) {
                  console.error('❌ Failed to clear chat from button:', error);
                }
              }
            }}
            className="text-xs px-2 h-7 text-red-600 border-red-300 hover:bg-red-50"
            title="Clear all messages"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Compare Mode Panel */}
      {isCompareMode && (
        <div className="border-b border-gray-200 bg-white p-4 max-h-80 overflow-y-auto">
          {!comparisonResult ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Scale className="w-5 h-5 text-teal-600" />
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
                      className={cn(
                        "h-auto py-3 px-2 flex flex-col items-center gap-2 border-2 transition-all duration-300 ease-out",
                        "rounded-2xl backdrop-blur-sm min-h-[95px] max-w-full",
                        theme.color,
                        theme.hoverColor,
                        "hover:scale-105 hover:shadow-lg hover:-translate-y-1",
                        "active:scale-95 active:translate-y-0",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
                        "group relative overflow-hidden"
                      )}
                    >
                      <div className="relative z-10 flex flex-col items-center gap-1.5 w-full">
                        <div className="p-1.5 rounded-xl bg-white/50 backdrop-blur-sm group-hover:bg-white/70 transition-all duration-300">
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
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
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
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {isLoadingComparison ? "Loading..." : "Compare"}
                </Button>
              </div>
            </div>
          ) : (
            // Comparison Results Display
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-teal-600" />
                  Verses about "{comparisonResult.theme}"
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setComparisonResult(null)}
                  className="text-gray-600"
                >
                  <X className="w-4 h-4 mr-1" />
                  New Search
                </Button>
              </div>

              {/* AI Summary */}
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-lg p-4">
                <h4 className="font-semibold text-teal-800 mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Cross-Traditional Insights
                </h4>
                <div className="space-y-3">
                  {(() => {
                    // Parse the AI summary to extract perspectives
                    const summary = comparisonResult.aiSummary;
                    const parts = summary.split(/(<perspective>([^<]+)<\/perspective>)/);
                    const perspectives = [];

                    // Extract intro text (before first perspective)
                    if (parts[0] && parts[0].trim()) {
                      perspectives.push({
                        type: 'intro',
                        content: parts[0].trim()
                      });
                    }

                    // Extract perspective sections
                    for (let i = 1; i < parts.length; i += 2) {
                      // parts[i] will be the tag, parts[i+1] will be the content
                      if (parts[i] && parts[i + 1]) {
                        const perspectiveTagMatch = parts[i].match(/<perspective>([^<]+)<\/perspective>/);
                        if (perspectiveTagMatch && perspectiveTagMatch[1]) {
                          perspectives.push({
                            type: 'perspective',
                            religion: perspectiveTagMatch[1].trim(),
                            content: parts[i + 1].trim()
                          });
                        }
                      }
                    }

                    return perspectives.map((item, index) => (
                      <div key={index}>
                        {item.type === 'intro' ? (
                          <p className="text-teal-700 text-sm leading-relaxed font-medium">
                            {item.content}
                          </p>
                        ) : (
                          <div className="border-l-4 border-teal-300 pl-3 py-1">
                            <h5 className="font-semibold text-teal-800 text-sm mb-1 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              {item.religion}
                            </h5>
                            <p className="text-teal-700 text-sm leading-relaxed">
                              {item.content}
                            </p>
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Verses by Religion */}
              <div className="grid gap-4 lg:grid-cols-2">
                {Object.entries(comparisonResult.verses).map(([religion, verses]) => (
                  <Card key={religion} className="border border-gray-200 shadow-sm">
                    <div className="p-4">
                      <h5 className="font-semibold text-gray-900 mb-3 capitalize flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        {religion}
                      </h5>
                      <div className="space-y-3">
                        {verses.map((verse, index) => (
                          <div key={index} className="border-l-4 border-teal-200 pl-3">
                            <p className="text-sm text-gray-700 mb-1 leading-relaxed">
                              "{verse.text}"
                            </p>
                            <p className="text-xs text-gray-500">
                              {verse.reference}
                            </p>
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
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messagesLoading ? (
            <div className="text-center text-gray-500">Loading conversation...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Bot className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h4 className="text-lg font-medium mb-2">Start a Voice Conversation</h4>
              <p className="text-sm">Click the microphone to ask about spiritual wisdom</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 mb-4 transition-all duration-200 ease-in-out",
                  message.type === 'user' ? "flex-row-reverse" : "flex-row"
                )}
                style={{ animation: `fadeIn 200ms ease-in-out` }}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  message.type === 'user'
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                    : "bg-gradient-to-br from-teal-500 to-teal-600 text-white"
                )}>
                  {message.type === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>

                {/* Enhanced Message Bubble */}
                <div className={cn(
                  "flex-1 max-w-[80%]",
                  message.type === 'user'
                    ? "flex flex-col items-end"
                    : "flex flex-col items-end" // AI messages right-aligned per requirements
                )}>
                  <div className={cn(
                    "relative px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 group",
                    message.type === 'user'
                      ? "bg-gray-100 text-gray-800 rounded-br-md border border-gray-200"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-md hover:border-teal-200" // White with 1px gray border
                  )}>
                    {message.type === 'ai' ? (
                      <div className="pr-8 space-y-3">
                        {parseMessageContent(message.content).map((part, index) => (
                          <div key={index}>
                            {part.type === 'perspective' ? (
                              <div className={cn(
                                "border-l-4 pl-4 py-3 rounded-r-lg space-y-2 transition-all duration-200 hover:shadow-sm",
                                part.colors.border,
                                part.colors.bg
                              )}>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={cn("text-xs font-medium", part.colors.badge)}
                                  >
                                    {part.religion}
                                  </Badge>
                                </div>
                                <div className="text-sm leading-relaxed">
                                  {renderTextWithClickableReferences(part.content)}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm leading-relaxed">
                                {renderTextWithClickableReferences(part.content)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}

                    {/* AI Message Audio Controls */}
                    {message.type === 'ai' && (
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        {/* Pulsing Teal Orb During Playback (24px) */}
                        {playingMessageId === message.id && (
                          <div className="w-6 h-6 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full animate-pulse flex items-center justify-center mr-1">
                            <div className="w-3 h-3 bg-white rounded-full animate-bounce" />
                          </div>
                        )}

                        {/* Speaker Toggle Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => playMessageAudio(message)}
                          className={cn(
                            "w-6 h-6 p-0 opacity-70 hover:opacity-100 transition-opacity duration-200",
                            playingMessageId === message.id ? "text-teal-600" : "text-gray-500 hover:text-teal-600"
                          )}
                          title={playingMessageId === message.id ? "Stop audio" : "Play audio"}
                        >
                          {playingMessageId === message.id ? (
                            <Square className="w-3 h-3" />
                          ) : (
                            <Volume2 className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Voice Input Area */}
      <div className="border-t border-gray-200 p-4">
        {/* Simplified Error Display - Only show on actual errors */}
        {hasError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-800 font-medium">
                Voice System Error
              </p>
            </div>
            <p className="text-xs text-red-700">
              Voice input encountered an error. Try refreshing the page or use text input below.
            </p>
          </div>
        )}

        {/* Permission Warning for Supported Browsers */}
        {isSupported && !hasPermission && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Headphones className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-blue-800 font-medium">
                Microphone Access Required
              </p>
            </div>
            <p className="text-xs text-blue-700 mb-3">
              Voice input needs microphone permission. Click the microphone button below to request access.
            </p>
          </div>
        )}

        {/* Text Input - ALWAYS VISIBLE like Grok */}
        <form onSubmit={handleTextSubmit} className="mb-4">
          <div className="flex gap-3 transition-all duration-300">
            <input
              type="text"
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              disabled={sendMessageMutation.isPending}
              placeholder="Ask about spiritual wisdom or use voice input (Grok-style)..."
              className={cn(
                "flex-1 px-4 py-3 text-sm transition-all duration-300",
                "bg-white border-2 border-gray-200 rounded-xl shadow-md",
                "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-300",
                "placeholder:text-gray-500 text-gray-800 hover:border-gray-300"
              )}
            />
            <Button
              type="submit"
              disabled={!textInputValue.trim() || sendMessageMutation.isPending}
              className="px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-md bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 hover:shadow-lg transform hover:scale-105 active:scale-95"
            >
              {sendMessageMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Send"
              )}
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
                            setWasLastMessageVoice(true);
                            console.log('✅ Voice listening started after interruption');
                          }
                        }, 100);
                        return;
                      }

                      // Handle permission requests
                      if (!hasPermission) {
                        console.log('🎤 Requesting microphone permission...');
                        toast({
                          title: "Requesting Permission",
                          description: "Please allow microphone access when prompted.",
                          variant: "default"
                        });
                      }

                      try {
                        const result = await toggleListening();

                        if (result) {
                          setWasLastMessageVoice(true);
                          console.log('✅ GROK MODE: Voice listening started - user controls sending');
                          toast({
                            title: "🎤 Listening Started",
                            description: "Speak your message. You control when to send it.",
                            variant: "default"
                          });
                        } else {
                          console.warn('🚫 Failed to start voice listening');
                          if (!hasPermission) {
                            toast({
                              title: "Permission Required",
                              description: "Microphone access is needed for voice input. Please allow access in your browser.",
                              variant: "destructive"
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
                  disabled={!isSupported}
                  className={cn(
                    "w-16 h-16 rounded-full transition-all duration-300 transform shadow-md",
                    // Disabled state for unsupported browsers
                    !isSupported
                      ? "bg-gray-300 cursor-not-allowed opacity-60 hover:scale-100"
                      : inputIsolated
                      ? "bg-gray-400 cursor-not-allowed opacity-50 hover:scale-100"
                      : "hover:scale-105 focus:scale-105 active:scale-95",
                    // Grok-like button states with enhanced visual feedback (only when supported)
                    isSupported && voiceState === 'listening'
                      ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 animate-pulse shadow-lg shadow-red-500/50 ring-2 ring-red-400 ring-opacity-75"
                      : isSupported && voiceState === 'processing'
                      ? "bg-gradient-to-br from-purple-500 to-purple-600 animate-spin shadow-lg shadow-purple-500/50"
                      : isSupported && (voiceState === 'speaking' || isAISpeaking)
                      ? "bg-gradient-to-br from-yellow-500 to-orange-600 animate-pulse shadow-lg shadow-yellow-500/50"
                      : isSupported && voiceState === 'interrupted'
                      ? "bg-gradient-to-br from-red-500 to-red-600 animate-ping shadow-lg shadow-red-500/50 ring-4 ring-red-400 ring-opacity-75"
                      : isSupported && !inputIsolated
                      ? "bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 hover:shadow-lg hover:shadow-teal-500/30 focus:ring-2 focus:ring-teal-400 focus:ring-opacity-75"
                      : ""
                  )}
                  title={
                    !isSupported ? "Voice not supported - use text input or switch to Chrome/Edge" :
                    !hasPermission ? "Click to request microphone permission" :
                    voiceState === 'listening' ? "Listening... Click to stop" :
                    voiceState === 'speaking' ? "AI is speaking... Click to interrupt" :
                    inputIsolated ? "Input locked during AI speech" :
                    "Click to speak - Grok-style voice input"
                  }
                >
                  {!isSupported ? (
                    <MicOff className="w-6 h-6 text-gray-500" />
                  ) : voiceState === 'processing' ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : voiceState === 'listening' ? (
                    <Square className="w-6 h-6 text-white" />
                  ) : voiceState === 'speaking' || isAISpeaking ? (
                    <Volume2 className="w-6 h-6 text-white" />
                  ) : voiceState === 'interrupted' ? (
                    <div className="w-6 h-6 text-white animate-pulse">⚡</div>
                  ) : inputIsolated ? (
                    <MicOff className="w-6 h-6 text-gray-500" />
                  ) : (
                    <Mic className="w-6 h-6 text-white" />
                  )}
                </Button>

                {/* Status Text */}
                <div className="mt-2 text-center">
                  {!isSupported ? (
                    <div className="text-xs text-gray-500">
                      Voice Not Supported
                    </div>
                  ) : voiceState === 'listening' ? (
                    <div className="text-xs text-red-600 font-medium animate-pulse">
                      Listening...
                    </div>
                  ) : voiceState === 'processing' ? (
                    <div className="text-xs text-purple-600 font-medium">
                      Processing...
                    </div>
                  ) : (voiceState === 'speaking' || isAISpeaking) ? (
                    <div className="text-xs text-yellow-600 font-medium animate-pulse">
                      AI Speaking...
                    </div>
                  ) : voiceState === 'interrupted' ? (
                    <div className="text-xs text-red-600 font-medium animate-pulse">
                      🚨 Interrupted
                    </div>
                  ) : voiceState === 'idle' ? (
                    <div className="text-xs text-gray-500">
                      {!hasPermission ? "Need Permission" : 
                       inputIsolated ? "Inputs Locked" :
                       "Grok-style Voice"}
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
                  color="teal"
                />
              )}
            </div>
          </VoiceErrorBoundary>
        ) : (
          /* Text-only mode message for unsupported browsers */
          <div className="flex flex-col items-center justify-center py-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center shadow-md mb-3">
              <MessageCircle className="w-6 h-6 text-gray-600" />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-700 font-medium mb-1">
                Text Chat Mode
              </p>
              <p className="text-xs text-gray-500">
                Use the text input above to chat
              </p>
            </div>
          </div>
        )}

        {/* Current Transcript Display */}
        {currentTranscript && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Current transcript:</div>
            <p className="text-sm text-gray-800">"{currentTranscript}"</p>
            {confidence > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Confidence: {Math.round(confidence * 100)}%
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enhanced History Panel with Chat History and Progress Dashboard */}
      {showHistoryPanel && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-xl z-50 animate-in slide-in-from-right duration-300">
          <Tabs value={historyView} onValueChange={(value) => setHistoryView(value as 'chat' | 'progress')} className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
              <div className="flex items-center gap-2">
                <HistoryIcon className="h-5 w-5 text-teal-600" />
                <h2 className="font-semibold text-gray-900">History & Progress</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowHistoryPanel(false)}>
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