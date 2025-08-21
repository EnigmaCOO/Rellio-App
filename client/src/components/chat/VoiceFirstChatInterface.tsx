import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useElevenLabsStreaming } from '@/hooks/useElevenLabsStreaming';
import { GrokStyleOrb } from './GrokStyleOrb';
import { AudioWaveform } from './AudioWaveform';
import { VoiceTalkBackHandler } from './VoiceTalkBackHandler';
import type { Religion, ChatMessage } from '@shared/schema';
import type { ScholarPersona } from './ScholarPersonas';

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
  className = ""
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
  
  // Input Isolation State
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [inputIsolated, setInputIsolated] = useState(false);
  const [isTalkingBack, setIsTalkingBack] = useState(false);
  const [interruptedQuery, setInterruptedQuery] = useState<string>('');
  const [lastAIMessage, setLastAIMessage] = useState<string>('');
  
  // Speech Recognition Setup
  const recognitionRef = useRef<any>(null);
  const autoSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const elevenLabsStreamRef = useRef<any>(null);
  
  // Settings
  const [settings, setSettings] = useState({
    autoSendDelay: 1500,
    confidenceThreshold: 0.8,
    voiceEnabled: true,
    autoPlayAI: true, // Enable auto-play by default
    interruptionSensitivity: 0.3,
    volume: 0.8
  });

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
      console.log('🔊 AI started speaking - Activating input isolation');
      setVoiceState('responding');
      setInputIsolated(true); // Enable input isolation during AI speech
    },
    onEnd: () => {
      console.log('🔊 AI finished speaking - Releasing input isolation');
      if (voiceState === 'responding') {
        setVoiceState('idle');
      }
      setPlayingMessageId(null);
      setInputIsolated(false); // Disable input isolation when AI stops
    },
    onInterrupted: () => {
      console.log('🚨 AI speech interrupted by user - Releasing input isolation');
      setVoiceState('interrupted');
      setPlayingMessageId(null);
      setInputIsolated(false); // Release isolation on interruption
      toast({
        title: "Response Interrupted",
        description: "You can continue the conversation",
        variant: "default"
      });
    },
    onError: (error) => {
      console.error('🚨 ElevenLabs error:', error);
      setVoiceState('idle');
      setPlayingMessageId(null);
      setInputIsolated(false); // Release isolation on error
      toast({
        title: "Audio Error",
        description: "Voice playback encountered an issue",
        variant: "destructive"
      });
    }
  });

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
      // Invalidate query to refresh messages
      await queryClient.invalidateQueries({ queryKey: ['/api/chat', sessionId] });
      
      // Auto-play the AI response with ElevenLabs if enabled
      if (data.content && autoPlayEnabled && settings.voiceEnabled) {
        console.log('🎙️ Auto-playing AI response with <500ms latency:', data.content.substring(0, 50) + '...');
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
        setVoiceState('idle');
      }
      
      // Clear transcript after successful send
      setCurrentTranscript('');
    },
    onError: (error: any) => {
      console.error('🚨 Send message error:', error);
      setVoiceState('idle');
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

      // Auto-send logic with confidence threshold
      if (finalTranscript && maxConfidence > settings.confidenceThreshold) {
        // Clear existing timeout
        if (autoSendTimeoutRef.current) {
          clearTimeout(autoSendTimeoutRef.current);
        }

        // Set new timeout for auto-send
        autoSendTimeoutRef.current = setTimeout(() => {
          console.log('🚀 Auto-sending message:', finalTranscript);
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
          
          // Check for interruption during AI response
          if (voiceState === 'responding' && average > (settings.interruptionSensitivity * 255)) {
            console.log('🚨 User interruption detected during AI response');
            handleInterruption();
          }
        }
        
        requestAnimationFrame(monitorAudioLevel);
      };
      
      monitorAudioLevel();
    } catch (error) {
      console.error('🚨 Audio context initialization error:', error);
      setHasPermission(false);
    }
  }, [voiceState, settings.interruptionSensitivity]);

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
    if (!recognitionRef.current || !isSupported || !hasPermission || inputIsolated) {
      if (inputIsolated) {
        console.log('🔒 Voice input blocked due to input isolation (AI speaking)');
        return;
      }
      return;
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
    console.log('🚨 Handling user interruption');
    
    // Stop AI playback immediately
    if (isAIPlaying) {
      stopAIPlayback();
    }
    
    // Set interrupted state
    setVoiceState('interrupted');
    
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
    
    handleSendMessage(textInputValue);
  }, [textInputValue, inputIsolated, handleSendMessage]);

  const toggleVoiceInput = useCallback(() => {
    if (voiceState === 'listening') {
      stopListening();
    } else if (voiceState === 'responding' && isAIPlaying) {
      handleInterruption();
    } else {
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

  // Voice synthesis function
  const speakMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTalkingBack) {
      console.log('⚠️ Skipping voice synthesis - empty text or already speaking');
      return;
    }

    // Clean the text - remove HTML tags and perspective markers
    const cleanText = text
      .replace(/<perspective>.*?<\/perspective>/g, '')
      .replace(/<\/?[^>]+(>|$)/g, "")
      .trim();

    if (!cleanText) {
      console.log('⚠️ No clean text to speak');
      return;
    }

    setIsTalkingBack(true);
    setIsAISpeaking(true);
    console.log('🔊 Starting voice synthesis:', cleanText.substring(0, 50) + '...');

    try {
      // Try ElevenLabs streaming first
      console.log('🎤 Attempting ElevenLabs TTS with voice:', selectedPersona?.elevenLabsVoice);
      
      const response = await fetch('/api/elevenlabs/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          voice_id: selectedPersona?.elevenLabsVoice || 'pNInz6obpgDQGcFmaJgB',
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true
          }
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.volume = settings.volume;
        console.log('🔊 Playing ElevenLabs audio with volume:', settings.volume);
        
        audio.onplay = () => {
          console.log('✅ ElevenLabs audio playback started');
        };
        
        audio.onended = () => {
          console.log('✅ ElevenLabs audio playback finished');
          setIsTalkingBack(false);
          setIsAISpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.onerror = (error) => {
          console.error('❌ ElevenLabs audio error, falling back to browser speech:', error);
          URL.revokeObjectURL(audioUrl);
          fallbackToBrowserSpeech(cleanText);
        };
        
        await audio.play();
        return;
      } else {
        console.log('⚠️ ElevenLabs API failed, status:', response.status);
        throw new Error(`ElevenLabs API failed: ${response.status}`);
      }
    } catch (error) {
      console.log('⚠️ ElevenLabs failed, using browser speech synthesis:', error);
      fallbackToBrowserSpeech(cleanText);
    }
  }, [selectedPersona, settings.volume, isTalkingBack]);

  // Browser speech synthesis fallback
  const fallbackToBrowserSpeech = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      console.log('🗣️ Using browser speech synthesis');
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = settings.volume;
      utterance.rate = 0.9;
      utterance.pitch = selectedPersona?.voiceTone?.includes('warm') ? 1.1 : 1.0;
      
      utterance.onstart = () => {
        console.log('✅ Browser speech synthesis started');
      };
      
      utterance.onend = () => {
        console.log('✅ Browser speech synthesis ended');
        setIsTalkingBack(false);
        setIsAISpeaking(false);
      };
      
      utterance.onerror = (error) => {
        console.error('❌ Speech synthesis error:', error);
        setIsTalkingBack(false);
        setIsAISpeaking(false);
      };
      
      speechSynthesis.speak(utterance);
    } else {
      console.error('❌ No speech synthesis available');
      setIsTalkingBack(false);
      setIsAISpeaking(false);
    }
  }, [settings.volume, selectedPersona]);

  // Auto-play new AI messages
  useEffect(() => {
    console.log('🔊 Auto-play check:', { 
      lastAIMessage: lastAIMessage?.substring(0, 50), 
      autoPlayAI: settings.autoPlayAI, 
      messagesCount: messages.length,
      isTalkingBack 
    });
    
    if (lastAIMessage && settings.autoPlayAI && messages.length > 0 && !isTalkingBack) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.type === 'ai' && lastMessage.content === lastAIMessage) {
        console.log('🔊 Auto-playing AI response...');
        // Small delay to ensure message is rendered
        setTimeout(async () => {
          console.log('🔊 Calling playAIText with:', lastAIMessage.substring(0, 50) + '...');
          setIsTalkingBack(true);
          try {
            await playAIText(lastAIMessage);
          } catch (error) {
            console.error('🚨 Auto-play failed:', error);
          } finally {
            setIsTalkingBack(false);
          }
        }, 1000);
      }
    }
  }, [lastAIMessage, settings.autoPlayAI, messages, speakMessage, isTalkingBack]);

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
          
          {/* Dynamic Persona Information */}
          <div>
            <h3 className={cn(
              "text-lg font-semibold transition-colors duration-300",
              selectedPersona && isInsideBook ? selectedPersona.textColor : "text-gray-900"
            )}>
              {selectedPersona?.name || 'Voice-First Spiritual Guide'}
            </h3>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              {isInsideBook && context.religion && context.book ? (
                <>
                  <span className="text-teal-600 font-medium">📖 Inside {context.book}</span>
                  <span>•</span>
                  <span>{selectedPersona?.title || 'Spiritual Guide'}</span>
                </>
              ) : (
                <>
                  <span className="text-gray-600">🌍 Universal Wisdom</span>
                  <span>•</span>
                  <span>{selectedPersona?.title || 'Interfaith Guide'}</span>
                </>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Auto-play Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAutoPlay}
            className={cn(
              "text-xs px-2 h-7",
              autoPlayEnabled ? "text-teal-600 border-teal-300 bg-teal-50" : "text-gray-600 border-gray-300"
            )}
            title={autoPlayEnabled ? "Disable auto-play" : "Enable auto-play"}
          >
            {autoPlayEnabled ? "Auto-play ON" : "Auto-play OFF"}
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
            title={showTextInput ? "Hide text input" : "Show text input"}
          >
            {showTextInput ? "Text Input ON" : "Text Input OFF"}
          </Button>
          
          {isAIPlaying && (
            <Button
              variant="outline"
              size="sm"
              onClick={stopAIPlayback}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <Square className="w-4 h-4 mr-1" />
              Stop
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettings(prev => ({ ...prev, voiceEnabled: !prev.voiceEnabled }))}
            className={settings.voiceEnabled ? "text-teal-600" : "text-gray-600"}
          >
            {settings.voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        </div>
      </div>

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
                    <p className={cn(
                      "text-sm leading-relaxed whitespace-pre-wrap",
                      message.type === 'ai' ? "pr-8" : "" // Space for controls
                    )}>
                      {message.content}
                    </p>
                    
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
    </Card>
  );
}