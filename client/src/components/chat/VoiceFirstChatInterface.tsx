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
import { useElevenLabsStreaming } from '@/hooks/useElevenLabsStreaming';
import { GrokStyleOrb } from './GrokStyleOrb';
import { AudioWaveform } from './AudioWaveform';
import { VoiceTalkBackHandler } from './VoiceTalkBackHandler';
import { ChatHistoryManager } from './ChatHistoryManager';
import { ProgressDashboard } from '@/components/progress/ProgressDashboard';
import { AudioPlaybackButton } from './AudioPlaybackButton';
import { Input } from '@/components/ui/input';
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
  
  // Voice State Management
  const [voiceState, setVoiceState] = useState<VoiceFirstState>('idle');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [isSupported, setIsSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [wasLastMessageVoice, setWasLastMessageVoice] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [historyView, setHistoryView] = useState<'chat' | 'progress'>('chat');
  
  // Input Isolation State
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [inputIsolated, setInputIsolated] = useState(false);
  const [isTalkingBack, setIsTalkingBack] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [interruptedQuery, setInterruptedQuery] = useState<string>('');
  const [lastAIMessage, setLastAIMessage] = useState<string>('');
  const [lastVoiceActivity, setLastVoiceActivity] = useState<number>(0);
  
  // Compare Mode state
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("");
  const [customTheme, setCustomTheme] = useState("");
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);

  // Predefined themes for Compare Mode
  const PREDEFINED_THEMES = [
    { id: 'love', label: 'Love', icon: Heart, color: 'bg-red-100 text-red-700 border-red-200' },
    { id: 'compassion', label: 'Compassion', icon: Heart, color: 'bg-pink-100 text-pink-700 border-pink-200' },
    { id: 'wisdom', label: 'Wisdom', icon: Brain, color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { id: 'faith', label: 'Faith', icon: Star, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { id: 'hope', label: 'Hope', icon: Sparkles, color: 'bg-green-100 text-green-700 border-green-200' },
    { id: 'justice', label: 'Justice', icon: Scale, color: 'bg-gray-100 text-gray-700 border-gray-200' },
    { id: 'redemption', label: 'Redemption', icon: Flame, color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { id: 'soul', label: 'Soul', icon: Eye, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    { id: 'afterlife', label: 'Afterlife', icon: Crown, color: 'bg-violet-100 text-violet-700 border-violet-200' },
    { id: 'meaning of life', label: 'Meaning of Life', icon: Compass, color: 'bg-cyan-100 text-cyan-700 border-cyan-200' }
  ];
  
  // Speech Recognition Setup
  const recognitionRef = useRef<any>(null);
  const autoSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const elevenLabsStreamRef = useRef<any>(null);
  
  // Settings and persona change tracking
  const [settings, setSettings] = useState({
    autoSendDelay: 1500,
    confidenceThreshold: 0.8,
    voiceEnabled: true,
    autoPlayAI: true, // Re-enabled with server-side deduplication protection
    interruptionSensitivity: 0.25, // Grok-style: Sensitive like real conversation
    volume: 0.8
  });

  // Track previous persona to detect changes
  const [previousPersona, setPreviousPersona] = useState<string | null>(null);
  const [previousContext, setPreviousContext] = useState<{religion: Religion | null, book: string} | null>(null);

  // Enhanced ElevenLabs Integration with Interruption Support
  const {
    isPlaying: isAIPlaying,
    isLoading: isAILoading,
    playText: playAIText,
    stopPlayback: stopAIPlayback,
    volume: aiVolume,
    setVolume: setAIVolume
  } = useElevenLabsStreaming({
    voiceId: selectedPersona?.elevenLabsVoice || 'ErXwobaYiN019PkySvjV', // Dynamic voice based on persona
    autoPlay: true,
    onStart: () => {
      console.log('🔊 ElevenLabs started - STOPPING voice recognition to prevent feedback');
      setVoiceState('responding');
      setInputIsolated(true); // BLOCK voice recognition during AI speech
      setIsAISpeaking(true);
      setIsTalkingBack(true);
      
      // STOP voice recognition to prevent AI voice feedback (like Grok)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
          console.log('🎤 Voice recognition STOPPED - preventing AI voice feedback');
        } catch (error) {
          console.warn('🎤 Recognition stop warning:', error);
        }
      }
    },
    onEnd: () => {
      console.log('🔊 ElevenLabs finished - Re-enabling voice recognition');
      setVoiceState('idle');
      setPlayingMessageId(null);
      setInputIsolated(false);
      setIsAISpeaking(false);
      setIsTalkingBack(false);
      
      // IMMEDIATELY re-enable voice recognition after AI finishes (like Grok)
      setTimeout(() => {
        if (hasPermission && isSupported && !inputIsolated) {
          console.log('🎤 Voice recognition RE-ENABLED - ready for next question');
          // Don't auto-start listening, just make it available
        }
      }, 300);
    },
    onInterrupted: () => {
      console.log('🚨 ElevenLabs interrupted by user');
      setVoiceState('interrupted');
      setPlayingMessageId(null);
      setInputIsolated(false);
      setIsAISpeaking(false);
      setIsTalkingBack(false);
      
      // ElevenLabs ONLY - no other voice systems to stop
    },
    onError: (error) => {
      console.log('🔊 ElevenLabs error - continuing silently:', error);
      setVoiceState('idle');
      setPlayingMessageId(null);
      setInputIsolated(false); // Release isolation on error
      setIsAISpeaking(false);
      setIsTalkingBack(false);
      // Don't show error toasts - just continue silently
    }
  });

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
        setCurrentTranscript('');
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
      setVoiceState('processing');
      
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
      // Track message sent for progress tracking
      onMessageSent?.();
      
      // Invalidate query to refresh messages
      await queryClient.invalidateQueries({ queryKey: ['/api/chat', sessionId] });
      
      // Auto-play the AI response with ElevenLabs ONLY if the user used voice input
      if (data.content && autoPlayEnabled && settings.voiceEnabled && wasLastMessageVoice) {
        console.log('🎙️ Auto-playing AI response (voice mode):', data.content.substring(0, 50) + '...');
        setPlayingMessageId(data.id);
        setVoiceState('responding');
        try {
          await playAIText(data.content);
          setPlayingMessageId(null);
          setVoiceState('idle');
        } catch (error) {
          console.error('🚨 Failed to play AI response:', error);
          setPlayingMessageId(null);
          setVoiceState('idle');
        }
      } else {
        console.log('🔇 Skipping AI voice response (text mode or voice disabled)');
        setVoiceState('idle');
      }
      
      // Reset voice message flag
      setWasLastMessageVoice(false);
      
      // Clear transcript after successful send
      setCurrentTranscript('');
    },
    onError: async (error: any) => {
      console.error('🚨 Send message error:', error);
      setVoiceState('idle');
      
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

  // Initialize Speech Recognition with Enhanced Features
  const initializeRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      return null;
    }

    setIsSupported(true);
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      setVoiceState('listening');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      let maxConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const currentConfidence = event.results[i][0].confidence || 0;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          maxConfidence = Math.max(maxConfidence, currentConfidence);
        } else {
          interimTranscript += transcript;
        }
      }

      const fullTranscript = finalTranscript || interimTranscript;
      setCurrentTranscript(fullTranscript);
      setConfidence(maxConfidence);

      // Track voice activity for cooldown system
      setLastVoiceActivity(Date.now());

      // Auto-send logic with confidence threshold
      if (finalTranscript && maxConfidence > settings.confidenceThreshold) {
        // Clear existing timeout
        if (autoSendTimeoutRef.current) {
          clearTimeout(autoSendTimeoutRef.current);
        }

        // Set new timeout for auto-send
        autoSendTimeoutRef.current = setTimeout(() => {
          console.log('🚀 Auto-sending message:', finalTranscript);
          setWasLastMessageVoice(true); // Mark this as a voice-initiated message
          handleSendMessage(finalTranscript.trim());
          stopListening();
        }, settings.autoSendDelay);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('🚨 Speech recognition error:', event.error);
      setVoiceState('idle');
      
      if (event.error === 'not-allowed') {
        setHasPermission(false);
        toast({
          title: "Microphone Access Denied",
          description: "Please allow microphone access for voice input",
          variant: "destructive"
        });
      }
    };

    recognition.onend = () => {
      console.log('🎤 Speech recognition ended');
      if (voiceState === 'listening') {
        setVoiceState('idle');
      }
    };

    return recognition;
  }, [voiceState, settings.confidenceThreshold, settings.autoSendDelay]);

  // Initialize Audio Context with Echo Cancellation for Level Detection
  const initializeAudioContext = useCallback(async () => {
    try {
      // Enhanced getUserMedia with echo cancellation to prevent self-feedback
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 44100,
          sampleSize: 16
        } 
      });
      streamRef.current = stream;
      setHasPermission(true);

      console.log('🎤 Audio stream initialized with echo cancellation');

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start audio level monitoring
      const monitorAudioLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
          
          // GROK-STYLE interruption - audio monitoring works even when speech recognition is blocked
          if ((voiceState === 'responding' || isAISpeaking) && average > 120) {
            console.log('🚨 GROK-STYLE INTERRUPTION! User detected, stopping AI instantly');
            console.log(`🔊 Audio level: ${average}, Threshold: 120 (interruption detection)`);
            
            // INSTANT AI stoppage like Grok
            if (stopAIPlayback) {
              stopAIPlayback();
              console.log('🛑 AI stopped instantly (Grok-style)');
            }
            
            // Immediate state reset 
            setVoiceState('idle');
            setIsAISpeaking(false);
            setIsTalkingBack(false);
            setInputIsolated(false);
            
            // IMMEDIATE speech recognition restart for new question
            setTimeout(() => {
              console.log('🎤 GROK-STYLE: Speech recognition restarted for interruption');
              if (recognitionRef.current && hasPermission && isSupported) {
                try {
                  recognitionRef.current.start();
                  setVoiceState('listening');
                  console.log('🎤 Listening for interrupted question...');
                } catch (error) {
                  console.warn('🎤 Failed to restart recognition after interruption:', error);
                }
              }
            }, 200);
          }
        }
        
        requestAnimationFrame(monitorAudioLevel);
      };
      
      monitorAudioLevel();
    } catch (error) {
      console.error('🚨 Audio context initialization error:', error);
      setHasPermission(false);
    }
  }, [voiceState, settings.interruptionSensitivity, isAISpeaking]);

  // Check Support and Initialize
  useEffect(() => {
    const recognition = initializeRecognition();
    recognitionRef.current = recognition;
    
    // Initialize audio context
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      initializeAudioContext();
    }
    
    return () => {
      // Cleanup
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (autoSendTimeoutRef.current) {
        clearTimeout(autoSendTimeoutRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [initializeRecognition, initializeAudioContext]);

  // Voice Control Functions
  const startListening = useCallback(async () => {
    if (!recognitionRef.current || !isSupported || !hasPermission) {
      return;
    }
    
    // Allow starting while AI is speaking (for interruption)
    if (isAISpeaking) {
      console.log('🎤 Starting voice input to interrupt AI speech');
    }
    
    try {
      // Stop any ongoing AI speech before listening
      if (isAIPlaying) {
        stopAIPlayback();
      }
      
      setCurrentTranscript('');
      setVoiceState('listening');
      recognitionRef.current.start();
      
      console.log('🎤 Started listening...');
    } catch (error) {
      console.error('🚨 Failed to start listening:', error);
      setVoiceState('idle');
    }
  }, [isSupported, hasPermission, isAIPlaying, stopAIPlayback, inputIsolated]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setVoiceState('idle');
    console.log('🛑 Stopped listening');
  }, []);

  const handleInterruption = useCallback(() => {
    console.log('🚨 Handling user interruption - stopping all AI speech');
    
    // Stop AI playback immediately
    if (isAIPlaying) {
      stopAIPlayback();
    }
    
    // Stop browser speech synthesis immediately if it's running
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      console.log('🚨 Browser speech synthesis interrupted and stopped');
    }
    
    // Clear AI speaking states
    setIsAISpeaking(false);
    setVoiceState('interrupted');
    setInputIsolated(false);
    
    // Show feedback
    toast({
      title: "Response Interrupted",
      description: "You can ask a new question or continue the conversation",
      variant: "default"
    });
    
    // Auto-start listening for new input
    setTimeout(() => {
      if (hasPermission && isSupported) {
        startListening();
      } else {
        setVoiceState('idle');
      }
    }, 500);
  }, [isAIPlaying, stopAIPlayback, hasPermission, isSupported, startListening]);

  const handleSendMessage = useCallback((message: string) => {
    if (!message.trim()) return;
    
    console.log('📤 Sending message:', message);
    sendMessageMutation.mutate(message);
    
    // Clear text input if using text mode
    if (showTextInput) {
      setTextInputValue('');
    }
  }, [sendMessageMutation, showTextInput]);
  
  // Handle text input submission
  const handleTextSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (inputIsolated) return; // Prevent submission during AI speech
    
    setWasLastMessageVoice(false); // Mark this as a text-initiated message
    handleSendMessage(textInputValue);
  }, [textInputValue, inputIsolated, handleSendMessage]);

  const toggleVoiceInput = useCallback(() => {
    if (voiceState === 'listening') {
      stopListening();
    } else if (voiceState === 'responding' && isAIPlaying) {
      handleInterruption();
    } else {
      setWasLastMessageVoice(true); // Pre-mark as voice mode when starting to listen
      startListening();
    }
  }, [voiceState, isAIPlaying, stopListening, startListening, handleInterruption]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update AI volume
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

  // REMOVED: Duplicate voice synthesis system - using only useElevenLabsStreaming hook

  // SIMPLIFIED: Direct ElevenLabs auto-play - trigger on NEW AI messages  
  useEffect(() => {
    // Get the latest AI message from messages array
    const latestAIMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const isLatestMessageAI = latestAIMessage?.type === 'ai';
    const latestAIText = isLatestMessageAI ? latestAIMessage.content : '';
    
    console.log('🔊 DIRECT Auto-play check:', { 
      hasLatestAI: isLatestMessageAI,
      messageLength: latestAIText.length,
      autoPlayEnabled: settings.autoPlayAI,
      isCurrentlyPlaying: isAIPlaying,
      voiceState,
      messagesCount: messages.length
    });
    
    // Direct auto-play: if latest message is AI and we're not playing
    if (isLatestMessageAI && latestAIText && settings.autoPlayAI && !isAIPlaying) {
      console.log('🔊 CALLING ElevenLabs NOW:', latestAIText.substring(0, 50) + '...');
      
      // Immediate call to ElevenLabs with latest AI message
      playAIText(latestAIText).catch(error => {
        console.error('🚨 ElevenLabs failed:', error);
      });
    }
  }, [messages, settings.autoPlayAI, isAIPlaying, voiceState, playAIText]);

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
              colors: perspectiveColors[religion] || perspectiveColors['Christianity']
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
      
      // Extract chapter number
      const chapterMatch = ref.match(/(\d+):(\d+)/);
      if (chapterMatch) {
        chapter = parseInt(chapterMatch[1]);
        verse = parseInt(chapterMatch[2]);
      }
      
      return { religion: 'islam' as Religion, book, chapter, verse };
    }

    // Torah/Judaism patterns
    const torahBooks = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Bereshit', 'Shemot', 'Vayikra', 'Bamidbar', 'Devarim'];
    for (const torahBook of torahBooks) {
      if (ref.includes(torahBook)) {
        const chapterMatch = ref.match(/(\d+):(\d+)/);
        let chapter = 1;
        let verse = null;
        if (chapterMatch) {
          chapter = parseInt(chapterMatch[1]);
          verse = parseInt(chapterMatch[2]);
        }
        return { religion: 'judaism' as Religion, book: 'Torah', chapter, verse };
      }
    }

    // Bible/Christianity patterns (default for most book references)
    const bibleBooks = ['Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', 'Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', 'Thessalonians', 'Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', 'Peter', 'Jude', 'Revelation'];
    const chapterMatch = ref.match(/(\d+):(\d+)/);
    let chapter = 1;
    let verse = null;
    if (chapterMatch) {
      chapter = parseInt(chapterMatch[1]);
      verse = parseInt(chapterMatch[2]);
    }
    
    return { religion: 'christianity' as Religion, book: 'Bible', chapter, verse };
  }, []);

  // Make scripture references clickable
  const renderTextWithClickableReferences = useCallback((text: string) => {
    // Enhanced scripture reference patterns
    const patterns = [
      // Quran: Surah Al-Baqarah 2:256, Quran 112:1-4
      /((?:Surah\s+)?(?:Al-)?[\w\s-]+\s+\d+:\d+(?:-\d+)?)/g,
      // Bible: John 3:16, 1 John 4:8, Matthew 28:19
      /(\d?\s?\w+\s+\d+:\d+(?:-\d+)?)/g,
      // Torah: Deuteronomy 6:4, Exodus 34:6-7
      /(\w+\s+\d+:\d+(?:-\d+)?)/g
    ];

    let result = text;
    let parts = [];
    let currentIndex = 0;

    // Find all scripture references
    const allMatches: Array<{text: string, start: number, end: number}> = [];
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        allMatches.push({
          text: match[1],
          start: match.index,
          end: match.index + match[1].length
        });
      }
    });

    // Sort matches by position
    allMatches.sort((a, b) => a.start - b.start);

    // Remove overlapping matches (keep the first one)
    const filteredMatches: Array<{text: string, start: number, end: number}> = [];
    let lastEnd = -1;
    allMatches.forEach(match => {
      if (match.start >= lastEnd) {
        filteredMatches.push(match);
        lastEnd = match.end;
      }
    });

    // Build parts with clickable references
    filteredMatches.forEach((match, index) => {
      // Add text before this match
      if (match.start > currentIndex) {
        parts.push(text.slice(currentIndex, match.start));
      }

      // Add clickable reference
      parts.push(
        <button
          key={`ref-${index}`}
          onClick={() => {
            const parsed = parseScriptureReference(match.text);
            console.log('Scripture reference clicked:', match.text, 'Parsed:', parsed);
            
            if (onNavigateToVerse && parsed) {
              // Navigate to the scripture location
              onNavigateToVerse(parsed.religion, parsed.book, parsed.chapter, parsed.verse);
            }
          }}
          className="inline-flex items-center gap-1 px-1 py-0.5 rounded text-xs bg-teal-100 text-teal-700 hover:bg-teal-200 transition-colors duration-200 border border-teal-200 hover:border-teal-300 cursor-pointer"
          title={`Go to ${match.text}`}
        >
          {match.text}
          <ExternalLink className="w-2 h-2" />
        </button>
      );

      currentIndex = match.end;
    });

    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(text.slice(currentIndex));
    }

    return parts.length > 0 ? parts : [text];
  }, [parseScriptureReference, onNavigateToVerse]);

  // Update last AI message when new messages arrive
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
                state={voiceState === 'responding' ? 'responding' : 
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
                await clearChat();
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {PREDEFINED_THEMES.map((theme) => {
                  const IconComponent = theme.icon;
                  return (
                    <Button
                      key={theme.id}
                      variant="outline"
                      onClick={() => handleThemeSelect(theme.label.toLowerCase())}
                      disabled={isLoadingComparison}
                      className={cn(
                        "h-auto py-3 px-3 flex flex-col items-center gap-2 border-2 transition-all duration-200",
                        theme.color,
                        "hover:scale-105 hover:shadow-md"
                      )}
                    >
                      <IconComponent className="w-5 h-5" />
                      <span className="text-xs font-medium text-center leading-tight">
                        {theme.label}
                      </span>
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
                    const parts = summary.split(/<perspective>([^<]+)<\/perspective>/);
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
                      if (parts[i] && parts[i + 1]) {
                        perspectives.push({
                          type: 'perspective',
                          religion: parts[i].trim(),
                          content: parts[i + 1].trim()
                        });
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
        {/* Browser Support Warning */}
        {!isSupported && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <p className="text-sm text-yellow-800">
              Voice input not supported in this browser. Please use Chrome or Edge.
            </p>
          </div>
        )}

        {/* Permission Warning */}
        {isSupported && !hasPermission && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <Headphones className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-800">
              Microphone access required for voice input. Please allow access and refresh.
            </p>
          </div>
        )}

        {/* Text Input with Isolation (Optional Alternative to Voice) */}
        {showTextInput && (
          <form onSubmit={handleTextSubmit} className="mb-4">
            <div className={cn(
              "flex gap-2 transition-all duration-300",
              inputIsolated && "opacity-50 pointer-events-none"
            )}>
              <input
                type="text"
                value={textInputValue}
                onChange={(e) => setTextInputValue(e.target.value)}
                disabled={inputIsolated || sendMessageMutation.isPending}
                placeholder={inputIsolated ? "Input locked - AI is speaking..." : "Type your spiritual question..."}
                className={cn(
                  "flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm transition-all duration-300",
                  "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent",
                  inputIsolated ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-800"
                )}
              />
              <Button
                type="submit"
                disabled={!textInputValue.trim() || inputIsolated || sendMessageMutation.isPending}
                className={cn(
                  "px-4 py-2 transition-all duration-300",
                  inputIsolated 
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                    : "bg-teal-600 text-white hover:bg-teal-700"
                )}
              >
                Send
              </Button>
            </div>
            {inputIsolated && (
              <p className="text-xs text-red-600 mt-1 animate-pulse">
                🔒 Input isolated - AI is speaking. Wait for completion or interrupt to continue.
              </p>
            )}
          </form>
        )}

        {/* Voice Controls */}
        <div className="flex items-center justify-center gap-4">
          {/* Main Voice Button */}
          <div className="flex flex-col items-center">
            <Button
              onClick={toggleVoiceInput}
              disabled={!isSupported || !hasPermission || sendMessageMutation.isPending || inputIsolated}
              className={cn(
                "w-16 h-16 rounded-full transition-all duration-300",
                inputIsolated ? "bg-gray-300 cursor-not-allowed" :
                voiceState === 'listening' 
                  ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 animate-pulse"
                  : voiceState === 'processing'
                  ? "bg-gradient-to-br from-purple-500 to-purple-600 animate-spin"
                  : voiceState === 'responding'
                  ? "bg-gradient-to-br from-yellow-500 to-orange-600 animate-pulse"
                  : voiceState === 'interrupted'
                  ? "bg-gradient-to-br from-red-400 to-rose-500 animate-bounce"
                  : "bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
              )}
            >
              {voiceState === 'processing' ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : voiceState === 'listening' ? (
                <Square className="w-6 h-6 text-white" />
              ) : voiceState === 'responding' ? (
                <Volume2 className="w-6 h-6 text-white" />
              ) : inputIsolated ? (
                <MicOff className="w-6 h-6 text-gray-500" />
              ) : (
                <Mic className="w-6 h-6 text-white" />
              )}
            </Button>
            
            {/* Status Text */}
            <div className="mt-2 text-center">
              {voiceState === 'listening' && (
                <div className="text-xs text-red-600 font-medium animate-pulse">
                  Listening...
                </div>
              )}
              {voiceState === 'processing' && (
                <div className="text-xs text-purple-600 font-medium">
                  Processing...
                </div>
              )}
              {voiceState === 'responding' && (
                <div className="text-xs text-yellow-600 font-medium animate-pulse">
                  AI Speaking...
                </div>
              )}
              {voiceState === 'interrupted' && (
                <div className="text-xs text-red-600 font-medium">
                  Interrupted
                </div>
              )}
              {voiceState === 'idle' && isSupported && hasPermission && !inputIsolated && (
                <div className="text-xs text-gray-500">
                  Click to speak
                </div>
              )}
              {inputIsolated && (
                <div className="text-xs text-red-600 font-medium animate-pulse">
                  🔒 Inputs Locked
                </div>
              )}
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
                <User className="h-4 w-4" />
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
                      onNavigateToVerse(religion, book, chapter);
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